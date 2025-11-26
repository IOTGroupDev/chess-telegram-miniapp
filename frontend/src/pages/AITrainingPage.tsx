import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Square } from 'chess.js';
import { ChessBoard } from '../components/ChessBoardModern';
import { useChess } from '../hooks/useChess';
import { useStockfish } from '../hooks/useStockfish';
import { useTelegramBackButton } from '../hooks/useTelegramBackButton';
import { telegramService } from '../services/telegramService';
import { moveAnalysisService } from '../services/moveAnalysisService';
import type { GameState } from '../types';

export const AITrainingPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [bestMove, setBestMove] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<number>(0);
  const [moveQuality, setMoveQuality] = useState<'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder' | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [, forceUpdate] = useState({});
  const [moveExplanation, setMoveExplanation] = useState<string | null>(null);
  const [moveSuggestion, setMoveSuggestion] = useState<string | null>(null);
  const [aiAnalysisText, setAiAnalysisText] = useState<string | null>(null);
  const [isLoadingAiAnalysis, setIsLoadingAiAnalysis] = useState(false);
  const [showAiAnalysisModal, setShowAiAnalysisModal] = useState(false);
  const [lastAnalyzedMove, setLastAnalyzedMove] = useState<{
    playerMove: string;
    fenBefore: string;
    fenAfter: string;
    evalBefore: number;
    evalAfter: number;
  } | null>(null);

  // Click-to-move state
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<Square[]>([]);

  const chess = useChess();
  const stockfish = useStockfish();

  // Create gameState for ChessBoard
  const gameStateForBoard = useMemo((): GameState => ({
    game: null,
    isPlayerTurn: chess.gameState.isPlayerTurn,
    selectedSquare: selectedSquare,
    possibleMoves: possibleMoves,
    isGameOver: chess.gameState.isGameOver,
    winner: chess.gameState.winner,
    fen: chess.getFen(),
    moves: [],
    status: chess.gameState.isGameOver ? 'finished' : 'active',
  }), [chess.gameState, selectedSquare, possibleMoves, chess]);

  // Use Telegram native BackButton
  useTelegramBackButton(() => navigate('/main'));

  const initializeGame = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      chess.resetGame();
      setShowHint(false);
      setBestMove(null);
      setHintsUsed(0);
      setMoveQuality(null);

      // Get initial evaluation
      const eval_score = await stockfish.quickEval(chess.getFen());
      if (eval_score !== null) {
        setEvaluation(eval_score);
      }

      telegramService.notificationOccurred('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize training');
      telegramService.showAlert('Ошибка инициализации тренировки');
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const analyzeMove = useCallback(async (playerMove: string, fenBeforeMove: string, fenAfterMove: string) => {
    try {
      // Get evaluation before the move
      const evalBefore = await stockfish.quickEval(fenBeforeMove);
      if (evalBefore === null) return;

      // Get best move for position BEFORE player's move
      const bestMoveForPosition = await stockfish.getBestMove(fenBeforeMove, 18);
      if (!bestMoveForPosition) return;

      setBestMove(bestMoveForPosition);

      // Get evaluation after the move
      const evalAfter = await stockfish.quickEval(fenAfterMove);
      if (evalAfter === null) return;

      setEvaluation(evalAfter);

      // Use heuristic analysis service to get explanation
      const analysis = moveAnalysisService.analyzeMoveHeuristic(
        playerMove,
        bestMoveForPosition,
        fenBeforeMove,
        fenAfterMove,
        evalBefore,
        evalAfter
      );

      console.log(`Move analysis: ${playerMove} vs ${bestMoveForPosition}, evalBefore: ${evalBefore.toFixed(2)}, evalAfter: ${evalAfter.toFixed(2)}, loss: ${analysis.evalLoss.toFixed(2)}`);

      // Set quality, explanation and suggestion
      setMoveQuality(analysis.quality);
      setMoveExplanation(analysis.explanation);
      setMoveSuggestion(analysis.suggestion);

      // Save move data for detailed AI analysis
      setLastAnalyzedMove({
        playerMove,
        fenBefore: fenBeforeMove,
        fenAfter: fenAfterMove,
        evalBefore,
        evalAfter,
      });

      // Trigger haptic feedback
      if (analysis.quality === 'best' || analysis.quality === 'good') {
        telegramService.notificationOccurred('success');
      } else if (analysis.quality === 'inaccuracy') {
        telegramService.notificationOccurred('warning');
      } else {
        telegramService.notificationOccurred('error');
      }
    } catch (err) {
      console.error('Move analysis failed:', err);
    }
  }, [stockfish]);

  /**
   * Get detailed AI analysis for the last move
   */
  const handleDetailedAnalysis = useCallback(async () => {
    if (!lastAnalyzedMove || !moveQuality || !bestMove) {
      telegramService.showAlert('Нет данных для анализа');
      return;
    }

    setIsLoadingAiAnalysis(true);
    setShowAiAnalysisModal(true);
    telegramService.impactOccurred('medium');

    try {
      // Get API URL from environment or use relative path
      const apiUrl = import.meta.env.VITE_ENGINE_API_URL || '';
      const endpoint = `${apiUrl}/api/analysis/move`;

      console.log('[AI Analysis] Calling endpoint:', endpoint);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerMove: lastAnalyzedMove.playerMove,
          bestMove: bestMove,
          fenBefore: lastAnalyzedMove.fenBefore,
          fenAfter: lastAnalyzedMove.fenAfter,
          evalBefore: lastAnalyzedMove.evalBefore,
          evalAfter: lastAnalyzedMove.evalAfter,
          moveQuality: moveQuality,
        }),
      });

      console.log('[AI Analysis] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AI Analysis] Error response:', errorText);
        throw new Error(`Server returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('[AI Analysis] Success:', data);
      setAiAnalysisText(data.data.explanation);
      telegramService.notificationOccurred('success');
    } catch (err) {
      console.error('[AI Analysis] Failed:', err);
      telegramService.notificationOccurred('error');

      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setAiAnalysisText(`❌ Не удалось получить детальный анализ.\n\nОшибка: ${errorMessage}\n\nПроверьте:\n1. Backend запущен?\n2. AI_PROVIDER и AI_API_KEY настроены в backend/.env?\n3. Доступ к API (CORS)?`);
    } finally {
      setIsLoadingAiAnalysis(false);
    }
  }, [lastAnalyzedMove, moveQuality, bestMove]);

  /**
   * Handle square click (click-to-move)
   */
  const handleSquareClick = useCallback((square: Square) => {
    if (chess.gameState.isGameOver || !chess.gameState.isPlayerTurn || stockfish.isThinking) {
      return;
    }

    const piece = chess.game.get(square);

    // If no piece selected yet
    if (!selectedSquare) {
      // Select piece if it's player's piece (white)
      if (piece && piece.color === 'w') {
        setSelectedSquare(square);
        const moves = chess.getPossibleMoves(square);
        setPossibleMoves(moves as Square[]);
        telegramService.impactOccurred('light');
      }
      return;
    }

    // If clicking on the same square, deselect
    if (square === selectedSquare) {
      setSelectedSquare(null);
      setPossibleMoves([]);
      return;
    }

    // If clicking on another player's piece, switch selection
    if (piece && piece.color === 'w') {
      setSelectedSquare(square);
      const moves = chess.getPossibleMoves(square);
      setPossibleMoves(moves as Square[]);
      telegramService.impactOccurred('light');
      return;
    }
  }, [chess, stockfish, selectedSquare]);

  const handlePieceDrop = useCallback((sourceSquare: Square, targetSquare: Square) => {
    if (chess.gameState.isGameOver || !chess.gameState.isPlayerTurn || stockfish.isThinking) {
      return false;
    }

    const playerMove = sourceSquare + targetSquare;
    const fenBeforeMove = chess.getFen(); // Save FEN BEFORE the move
    const success = chess.makeMove(sourceSquare, targetSquare);

    if (success) {
      const fenAfterMove = chess.getFen(); // Get FEN AFTER the move

      // Clear selection after successful move
      setSelectedSquare(null);
      setPossibleMoves([]);

      // Analyze the move asynchronously (fire and forget)
      analyzeMove(playerMove, fenBeforeMove, fenAfterMove);

      // Get AI move after player move
      if (!chess.gameState.isGameOver) {
        setTimeout(async () => {
          try {
            const aiMove = await stockfish.getBestMove(chess.getFen(), 15);
            if (aiMove && aiMove.length >= 4) {
              const from = aiMove.slice(0, 2) as Square;
              const to = aiMove.slice(2, 4) as Square;
              const aiMoveSuccess = chess.makeMove(from, to);

              if (aiMoveSuccess) {
                // Update evaluation after AI move
                const newEval = await stockfish.quickEval(chess.getFen());
                if (newEval !== null) {
                  setEvaluation(newEval);
                }

                forceUpdate({}); // Force re-render after AI move
                telegramService.notificationOccurred('success');
              }
            }
          } catch (err) {
            console.error('AI move failed:', err);
            telegramService.notificationOccurred('error');
          }
        }, 500);
      }
    } else {
      telegramService.notificationOccurred('error');
    }

    return success;
  }, [chess, stockfish, analyzeMove]);

  const handleShowHint = useCallback(async () => {
    if (showHint || stockfish.isThinking) return;

    try {
      const hint = await stockfish.getBestMove(chess.getFen(), 18);
      if (hint) {
        setBestMove(hint);
        setShowHint(true);
        setHintsUsed(prev => prev + 1);
        telegramService.impactOccurred('light');
      }
    } catch (err) {
      console.error('Failed to get hint:', err);
      telegramService.notificationOccurred('error');
    }
  }, [chess, stockfish, showHint]);

  const handleNewGame = useCallback(() => {
    initializeGame();
  }, [initializeGame]);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  // Note: Removed auto-clear - user dismisses manually with button

  // Auto-clear hint after 5 seconds
  useEffect(() => {
    if (showHint) {
      const timer = setTimeout(() => {
        setShowHint(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showHint]);

  // Get Telegram theme colors
  const bgColor = window.Telegram?.WebApp?.themeParams?.bg_color || '#ffffff';
  const textColor = window.Telegram?.WebApp?.themeParams?.text_color || '#000000';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: bgColor }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p style={{ color: textColor }}>Загрузка тренировки...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: bgColor }}>
        <div className="text-center p-6">
          <h1 className="text-2xl font-bold mb-4" style={{ color: textColor }}>Ошибка</h1>
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={initializeGame}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all active:scale-95"
          >
            Повторить
          </button>
        </div>
      </div>
    );
  }

  const getMoveQualityText = () => {
    switch (moveQuality) {
      case 'best': return '🎯 Лучший ход!';
      case 'good': return '✅ Хороший ход';
      case 'inaccuracy': return '⚠️ Неточность';
      case 'mistake': return '❌ Ошибка';
      case 'blunder': return '💥 Грубая ошибка';
      default: return null;
    }
  };

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: bgColor,
        color: textColor,
        paddingTop: 'max(env(safe-area-inset-top), 16px)',
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
    >
      <div className="max-w-2xl mx-auto p-3 sm:p-4">
        {/* Move Quality Floating Notification with Explanation */}
        {moveQuality && (
          <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 max-w-sm w-full px-4 animate-slide-down`}>
            <div className={`rounded-2xl shadow-2xl p-4 relative ${
              moveQuality === 'best' ? 'bg-gradient-to-br from-green-500 to-emerald-600' :
              moveQuality === 'good' ? 'bg-gradient-to-br from-blue-500 to-cyan-600' :
              moveQuality === 'inaccuracy' ? 'bg-gradient-to-br from-yellow-500 to-orange-500' :
              moveQuality === 'mistake' ? 'bg-gradient-to-br from-orange-500 to-red-500' :
              'bg-gradient-to-br from-red-600 to-pink-700'
            }`}>
              {/* Close Button */}
              <button
                onClick={() => {
                  setMoveQuality(null);
                  setMoveExplanation(null);
                  setMoveSuggestion(null);
                }}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-sm transition-all active:scale-95"
              >
                ✕
              </button>

              {/* Title */}
              <div className="flex items-center gap-2 mb-2 pr-6">
                <span className="text-3xl">
                  {moveQuality === 'best' ? '🎯' :
                   moveQuality === 'good' ? '✅' :
                   moveQuality === 'inaccuracy' ? '⚠️' :
                   moveQuality === 'mistake' ? '❌' : '💥'}
                </span>
                <span className="font-bold text-white text-lg">{getMoveQualityText()?.replace(/^[^\s]+\s/, '')}</span>
              </div>

              {/* Explanation */}
              {moveExplanation && (
                <p className="text-white text-sm mb-2 leading-relaxed">
                  {moveExplanation}
                </p>
              )}

              {/* Suggestion */}
              {moveSuggestion && (
                <p className="text-white/90 text-sm font-medium mb-3">
                  {moveSuggestion}
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                {/* Detailed Analysis Button */}
                {moveQuality !== 'best' && (
                  <button
                    className="flex-1 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-all active:scale-95 backdrop-blur-sm border border-white/30"
                    onClick={handleDetailedAnalysis}
                    disabled={isLoadingAiAnalysis}
                  >
                    🤖 {isLoadingAiAnalysis ? 'Анализирую...' : 'AI-анализ'}
                  </button>
                )}
                {/* Dismiss Button */}
                <button
                  className={`bg-white/30 hover:bg-white/40 text-white text-xs font-semibold py-2 px-4 rounded-lg transition-all active:scale-95 backdrop-blur-sm border border-white/40 ${moveQuality === 'best' ? 'flex-1' : ''}`}
                  onClick={() => {
                    setMoveQuality(null);
                    setMoveExplanation(null);
                    setMoveSuggestion(null);
                  }}
                >
                  Понял ✓
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hint Floating Notification */}
        {showHint && bestMove && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-slide-down">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z"/>
            </svg>
            <span className="font-bold">Лучший ход: {bestMove.substring(0, 2).toUpperCase()} → {bestMove.substring(2, 4).toUpperCase()}</span>
          </div>
        )}

        {/* AI Analysis Modal */}
        {showAiAnalysisModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-white/10 animate-slide-in-up">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🤖</span>
                  <h3 className="text-xl font-bold text-white">AI-Анализ</h3>
                </div>
                <button
                  onClick={() => {
                    setShowAiAnalysisModal(false);
                    setAiAnalysisText(null);
                  }}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all active:scale-95"
                >
                  ✕
                </button>
              </div>

              {/* Content */}
              <div className="bg-black/30 rounded-xl p-4 mb-4 min-h-[150px]">
                {isLoadingAiAnalysis ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-3"></div>
                    <p className="text-slate-300 text-sm">Получаю анализ от AI тренера...</p>
                  </div>
                ) : aiAnalysisText ? (
                  <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{aiAnalysisText}</p>
                ) : (
                  <p className="text-slate-400 text-sm">Нет данных для анализа</p>
                )}
              </div>

              {/* Footer */}
              <button
                onClick={() => {
                  setShowAiAnalysisModal(false);
                  setAiAnalysisText(null);
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all active:scale-95"
              >
                Понятно
              </button>
            </div>
          </div>
        )}

        {/* Header with Training Stats */}
        <div className="mb-4">
          {/* AI Trainer */}
          <div className="flex items-center justify-between mb-3 bg-slate-800/50 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold shadow-lg">
                🎓
              </div>
              <div>
                <h3 className="text-base font-bold text-white leading-tight">AI Trainer</h3>
                <p className="text-xs text-slate-400">Depth: 18</p>
              </div>
            </div>
            {stockfish.isThinking && (
              <div className="flex items-center gap-2 px-3 py-1 bg-purple-500/20 rounded-full border border-purple-500/30">
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></div>
                <span className="text-xs text-purple-300 font-medium">Analyzing...</span>
              </div>
            )}
          </div>

          {/* Human Player */}
          <div className="flex items-center justify-between bg-slate-800/50 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center font-bold shadow-lg">
                👤
              </div>
              <div>
                <h3 className="text-base font-bold text-white leading-tight">You</h3>
                <p className="text-xs text-slate-400">Training Mode</p>
              </div>
            </div>
            {chess.gameState.isPlayerTurn && !chess.gameState.isGameOver && !stockfish.isThinking && (
              <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 rounded-full border border-green-500/30">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                <span className="text-xs text-green-300 font-medium">Your turn</span>
              </div>
            )}
          </div>
        </div>

        {/* Evaluation Bar */}
        <div className="mb-4 bg-slate-800/50 backdrop-blur-sm rounded-xl p-3 border border-white/10">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-slate-300">Position Eval:</span>
            <span className={`font-bold text-lg ${evaluation > 0 ? 'text-green-400' : evaluation < 0 ? 'text-red-400' : 'text-slate-400'}`}>
              {evaluation > 0 ? '+' : ''}{evaluation.toFixed(2)}
            </span>
          </div>
          <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${evaluation >= 0 ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-gradient-to-r from-red-500 to-pink-400'}`}
              style={{ width: `${Math.min(Math.abs(evaluation) * 10 + 50, 100)}%`, marginLeft: evaluation < 0 ? '0' : 'auto' }}
            ></div>
          </div>
          <div className="flex justify-between items-center mt-2 text-xs">
            <span className="text-slate-400">💡 Hints: {hintsUsed}</span>
            <span className="text-slate-400">Moves: {Math.floor(chess.history().length / 2)}</span>
          </div>
        </div>

        {/* Chess Board Container */}
        <div className="relative mb-4">
          <div className="relative rounded-2xl overflow-hidden shadow-xl">
            <ChessBoard
              position={chess.getFen()}
              onSquareClick={handleSquareClick}
              onPieceDrop={(sourceSquare, targetSquare) =>
                handlePieceDrop(sourceSquare as Square, targetSquare as Square)
              }
              gameState={gameStateForBoard}
              boardWidth={Math.min(window.innerWidth - 32, 500)}
            />
          </div>

          {/* Game Over Overlay */}
          {chess.gameState.isGameOver && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
              <div className="text-center px-6">
                <div className="text-6xl mb-3">
                  {chess.gameState.winner === 'draw'
                    ? '🤝'
                    : chess.gameState.winner === 'white'
                    ? '🎉'
                    : '😔'}
                </div>
                <h3 className="text-3xl font-black mb-4 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                  {chess.gameState.winner === 'draw'
                    ? 'Draw!'
                    : chess.gameState.winner === 'white'
                    ? 'You Won!'
                    : 'AI Won!'}
                </h3>
                <p className="text-slate-300 mb-2">
                  {chess.gameState.winner === 'draw'
                    ? 'Good defensive play!'
                    : chess.gameState.winner === 'white'
                    ? 'Excellent training session!'
                    : 'Keep practicing and learning!'}
                </p>
                <p className="text-sm text-slate-400 mb-6">
                  💡 Hints used: {hintsUsed}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Game Controls */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={handleShowHint}
            disabled={showHint || stockfish.isThinking || chess.gameState.isGameOver}
            className="bg-purple-600/50 hover:bg-purple-600 disabled:bg-slate-700/50 disabled:text-slate-500 text-white font-bold py-4 rounded-xl backdrop-blur-sm border border-purple-500/20 hover:border-purple-500/40 disabled:border-slate-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z"/>
            </svg>
            <span>Hint</span>
          </button>
          <button
            onClick={handleNewGame}
            className="bg-slate-700/50 hover:bg-slate-700 text-white font-bold py-4 rounded-xl backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>New Game</span>
          </button>
        </div>

        {/* Training Tips */}
        <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <span className="text-xl">📚</span>
            <span>Training Tips</span>
          </h3>
          <ul className="text-slate-300 text-sm space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-0.5">•</span>
              <span>Think before each move - analyze the position carefully</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">•</span>
              <span>Positive eval = White advantage, Negative = Black advantage</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 mt-0.5">•</span>
              <span>Use hints to learn optimal moves in complex positions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-400 mt-0.5">•</span>
              <span>Review your mistakes and understand why they happened</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
