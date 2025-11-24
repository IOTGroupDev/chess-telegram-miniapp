import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Square } from 'chess.js';
import { ChessBoard } from '../components/ChessBoard';
import { GameInfo } from '../components/GameInfo';
import { Button } from '../components/Button';
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

  const handleSquareClick = useCallback((square: Square) => {
    if (chess.gameState.isGameOver || !chess.gameState.isPlayerTurn || stockfish.isThinking) {
      return;
    }

    chess.selectSquare(square);
    telegramService.hapticFeedback('selection');
  }, [chess, stockfish.isThinking]);

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
              chess.makeMove(from, to);

              // Update evaluation after AI move
              const newEval = await stockfish.quickEval(chess.getFen());
              if (newEval !== null) {
                setEvaluation(newEval);
              }

              telegramService.notificationOccurred('success');
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
      <div className="min-h-screen bg-telegram-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-telegram-button mx-auto mb-4"></div>
          <p className="text-telegram-text">Загрузка тренировки...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-telegram-bg">
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <h1 className="text-2xl font-bold text-telegram-text mb-4">Ошибка</h1>
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={initializeGame}>Повторить</Button>
        </div>
      </div>
    );
  }

  const getMoveQualityColor = () => {
    switch (moveQuality) {
      case 'best': return 'text-green-500';
      case 'good': return 'text-blue-500';
      case 'inaccuracy': return 'text-yellow-500';
      case 'mistake': return 'text-orange-500';
      case 'blunder': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

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
    <div className="min-h-screen bg-telegram-bg">
      {/* Title */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-2xl font-bold text-telegram-text text-center">🎓 Обучение с ИИ</h1>
      </div>

      {/* Training Info */}
      <div className="px-4 py-2">
        <div className="glass rounded-xl p-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-telegram-text font-semibold">Оценка позиции:</span>
            <span className={`font-bold ${evaluation > 0 ? 'text-green-500' : evaluation < 0 ? 'text-red-500' : 'text-gray-400'}`}>
              {evaluation > 0 ? '+' : ''}{evaluation.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-telegram-text font-semibold">Подсказок использовано:</span>
            <span className="text-telegram-hint">{hintsUsed}</span>
          </div>
          {moveQuality && (
            <div className="mt-2 p-2 rounded-lg bg-telegram-secondary-bg">
              <p className={`text-center font-semibold ${getMoveQualityColor()}`}>
                {getMoveQualityText()}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Game Info */}
      <div className="px-4 py-2">
        <GameInfo
          gameState={chess.gameState}
          isPlayerTurn={chess.gameState.isPlayerTurn}
          isThinking={stockfish.isThinking}
        />
      </div>

      {/* Chess Board */}
      <div className="px-4 py-4">
        <ChessBoard
          position={chess.getFen()}
          onSquareClick={handleSquareClick}
          onPieceDrop={handlePieceDrop}
          gameState={chess.gameState}
          boardWidth={Math.min(window.innerWidth - 32, 400)}
        />
      </div>

      {/* Hint Display */}
      {showHint && bestMove && (
        <div className="px-4 py-2">
          <div className="bg-blue-600 rounded-lg p-4">
            <p className="text-white font-semibold mb-2">💡 Подсказка:</p>
            <p className="text-white">
              Лучший ход: {bestMove.substring(0, 2)} → {bestMove.substring(2, 4)}
            </p>
          </div>
        </div>
      )}

      {/* Game Controls */}
      <div className="px-4 py-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={handleShowHint}
            variant="secondary"
            className="w-full"
            disabled={showHint || stockfish.isThinking || chess.gameState.isGameOver}
          >
            💡 Подсказка
          </Button>

          <Button
            onClick={handleNewGame}
            variant="primary"
            className="w-full"
          >
            🔄 Новая игра
          </Button>
        </div>
      </div>

      {/* Game Status */}
      {chess.gameState.isGameOver && (
        <div className="px-4 py-4">
          <div className="bg-telegram-secondary-bg rounded-lg p-4 text-center">
            <p className="text-lg font-semibold text-telegram-text mb-2">
              {chess.gameState.winner === 'draw'
                ? '🤝 Ничья!'
                : chess.gameState.winner === 'white'
                ? '🎉 Вы победили!'
                : '😔 ИИ победил!'
              }
            </p>
            <p className="text-telegram-hint mb-4">
              Подсказок использовано: {hintsUsed}
            </p>
            <Button
              onClick={handleNewGame}
              size="lg"
              className="w-full"
            >
              Играть снова
            </Button>
          </div>
        </div>
      )}

      {/* AI Status */}
      {stockfish.isThinking && (
        <div className="px-4 py-2">
          <div className="bg-telegram-secondary-bg rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-telegram-button"></div>
              <p className="text-sm text-telegram-text">ИИ анализирует...</p>
            </div>
          </div>
        </div>
      )}

      {/* Training Tips */}
      <div className="px-4 py-4">
        <div className="glass rounded-xl p-4">
          <h3 className="text-telegram-text font-semibold mb-2">📚 Советы:</h3>
          <ul className="text-telegram-hint text-sm space-y-1">
            <li>• Думайте перед каждым ходом</li>
            <li>• Оценка показывает преимущество (+ белые, - черные)</li>
            <li>• Используйте подсказки для обучения</li>
            <li>• Анализируйте свои ошибки</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
