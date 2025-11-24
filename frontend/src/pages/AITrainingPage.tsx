import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Square } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { useChess } from '../hooks/useChess';
import { useStockfish } from '../hooks/useStockfish';
import { useTelegramBackButton } from '../hooks/useTelegramBackButton';
import { telegramService } from '../services/telegramService';

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

  const chess = useChess();
  const stockfish = useStockfish();

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

  const analyzeMove = useCallback(async (playerMove: string, fen: string) => {
    try {
      // Get best move from engine
      const aiMove = await stockfish.getBestMove(fen, 18);
      if (aiMove) {
        setBestMove(aiMove);

        // Compare player move with best move
        if (playerMove === aiMove) {
          setMoveQuality('best');
          telegramService.notificationOccurred('success');
        } else {
          // Get evaluation to determine move quality
          const beforeEval = evaluation;
          const afterEval = stockfish.evaluation || 0;
          const evalDiff = Math.abs(afterEval - beforeEval);

          if (evalDiff < 0.3) {
            setMoveQuality('good');
            telegramService.notificationOccurred('success');
          } else if (evalDiff < 1.0) {
            setMoveQuality('inaccuracy');
            telegramService.notificationOccurred('warning');
          } else if (evalDiff < 3.0) {
            setMoveQuality('mistake');
            telegramService.notificationOccurred('error');
          } else {
            setMoveQuality('blunder');
            telegramService.notificationOccurred('error');
          }

          setEvaluation(afterEval);
        }
      }
    } catch (err) {
      console.error('Move analysis failed:', err);
    }
  }, [evaluation, stockfish]);

  const handlePieceDrop = useCallback((sourceSquare: Square, targetSquare: Square) => {
    if (chess.gameState.isGameOver || !chess.gameState.isPlayerTurn || stockfish.isThinking) {
      return false;
    }

    const playerMove = sourceSquare + targetSquare;
    const success = chess.makeMove(sourceSquare, targetSquare);

    if (success) {
      // Analyze the move asynchronously (fire and forget)
      analyzeMove(playerMove, chess.getFen());

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white">Загрузка тренировки...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center p-6">
          <h1 className="text-2xl font-bold text-white mb-4">Ошибка</h1>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white" style={{ paddingTop: 'max(env(safe-area-inset-top), 60px)' }}>
      <div className="max-w-2xl mx-auto p-3 sm:p-4">
        {/* Move Quality Floating Notification */}
        {moveQuality && (
          <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-slide-down ${
            moveQuality === 'best' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
            moveQuality === 'good' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
            moveQuality === 'inaccuracy' ? 'bg-gradient-to-r from-yellow-500 to-orange-400' :
            moveQuality === 'mistake' ? 'bg-gradient-to-r from-orange-500 to-red-500' :
            'bg-gradient-to-r from-red-600 to-pink-600'
          }`}>
            <span className="text-2xl">
              {moveQuality === 'best' ? '🎯' :
               moveQuality === 'good' ? '✅' :
               moveQuality === 'inaccuracy' ? '⚠️' :
               moveQuality === 'mistake' ? '❌' : '💥'}
            </span>
            <span className="font-bold text-white">{getMoveQualityText()?.replace(/^[^\s]+\s/, '')}</span>
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
          <div className="relative rounded-2xl overflow-hidden shadow-2xl ring-4 ring-white/10">
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-2xl blur opacity-20"></div>

            {/* Actual board */}
            <div className="relative">
              <Chessboard
                {...{
                  position: chess.getFen(),
                  onPieceDrop: (sourceSquare: string, targetSquare: string) =>
                    handlePieceDrop(sourceSquare as Square, targetSquare as Square),
                  boardOrientation: 'white',
                  customBoardStyle: {
                    borderRadius: '0',
                  },
                  customDarkSquareStyle: {
                    backgroundColor: '#779952',
                  },
                  customLightSquareStyle: {
                    backgroundColor: '#edeed1',
                  },
                  customDropSquareStyle: {
                    boxShadow: 'inset 0 0 1px 6px rgba(255,255,0,0.6)',
                  },
                  arePiecesDraggable: chess.gameState.isPlayerTurn && !chess.gameState.isGameOver && !stockfish.isThinking,
                  animationDuration: 200,
                } as any}
              />
            </div>
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
