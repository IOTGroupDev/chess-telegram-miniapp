import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Square } from 'chess.js';
import { ChessBoard } from '../components/ChessBoard';
import { GameInfo } from '../components/GameInfo';
import { Button } from '../components/Button';
import { Navigation } from '../components/Navigation';
import { useChess } from '../hooks/useChess';
import { useStockfish } from '../hooks/useStockfish';
import { telegramService } from '../services/telegramService';

export const AIGamePage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const chess = useChess();
  const stockfish = useStockfish();

  const initializeGame = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Initialize AI game
      chess.resetGame();
      telegramService.notificationOccurred('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize game');
      telegramService.showAlert('Ошибка инициализации игры');
    } finally {
      setIsLoading(false);
    }
  }, [chess]);

  const handleSquareClick = useCallback((square: Square) => {
    if (chess.gameState.isGameOver || !chess.gameState.isPlayerTurn || stockfish.isThinking) {
      return;
    }

    chess.selectSquare(square);
    telegramService.hapticFeedback('selection');
  }, [chess, stockfish.isThinking]);

  const handlePieceDrop = useCallback((sourceSquare: Square, targetSquare: Square) => {
    if (chess.gameState.isGameOver || !chess.gameState.isPlayerTurn || stockfish.isThinking) {
      return false;
    }

    const success = chess.makeMove(sourceSquare, targetSquare);

    if (success) {
      telegramService.notificationOccurred('success');

      // Get AI move after player move
      if (!chess.gameState.isGameOver) {
        setTimeout(async () => {
          try {
            const aiMove = await stockfish.getBestMove(chess.getFen());
            if (aiMove && aiMove.length >= 4) {
              const from = aiMove.slice(0, 2) as Square;
              const to = aiMove.slice(2, 4) as Square;
              chess.makeMove(from, to);
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
  }, [chess, stockfish]);

  const handleNewGame = useCallback(() => {
    chess.resetGame();
    telegramService.notificationOccurred('success');
  }, [chess]);

  const handleSurrender = useCallback(async () => {
    const confirmed = await telegramService.showConfirm('Вы уверены, что хотите сдаться?');
    if (confirmed) {
      chess.resetGame();
      navigate('/');
    }
  }, [chess, navigate]);

  const handleBack = useCallback(async () => {
    if (chess.gameState.selectedSquare || chess.history().length > 0) {
      const confirmed = await telegramService.showConfirm('Вы уверены, что хотите покинуть игру?');
      if (confirmed) {
        navigate('/');
      }
    } else {
      navigate('/');
    }
  }, [chess, navigate]);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-telegram-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-telegram-button mx-auto mb-4"></div>
          <p className="text-telegram-text">Загрузка игры...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-telegram-bg">
        <Navigation showBackButton title="Ошибка" />
        <div className="flex items-center justify-center min-h-[60vh] p-4">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={initializeGame}>Повторить</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-telegram-bg">
      <Navigation 
        showBackButton 
        title="Игра против ИИ" 
        onBack={handleBack}
      />

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

      {/* Game Controls */}
      <div className="px-4 py-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={handleNewGame}
            variant="secondary"
            className="w-full"
          >
            🔄 Новая игра
          </Button>

          <Button
            onClick={handleSurrender}
            variant="danger"
            className="w-full"
          >
            🏳️ Сдаться
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
              <p className="text-sm text-telegram-text">ИИ думает...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
