import React from 'react';
import type { GameState } from '../types';

interface GameInfoProps {
  gameState: GameState;
  isPlayerTurn: boolean;
  isThinking?: boolean;
}

export const GameInfo: React.FC<GameInfoProps> = ({
  gameState,
  isPlayerTurn,
  isThinking = false,
}) => {
  const getStatusMessage = () => {
    if (gameState.isGameOver) {
      if (gameState.winner === 'draw') {
        return '🤝 Ничья!';
      }
      return `🎉 Игра окончена! Победитель: ${gameState.winner === 'white' ? 'Вы' : 'ИИ'}`;
    }

    if (isThinking) {
      return '🤔 ИИ думает...';
    }

    if (isPlayerTurn) {
      return '👤 Ваш ход';
    }

    return '🤖 Ход ИИ';
  };

  const getStatusColor = () => {
    if (gameState.isGameOver) {
      return 'text-green-600';
    }
    if (isThinking) {
      return 'text-yellow-600';
    }
    if (isPlayerTurn) {
      return 'text-blue-600';
    }
    return 'text-gray-600';
  };

  return (
    <div className="bg-telegram-secondary-bg rounded-lg p-3">
      <div className="text-center">
        <h3 className={`text-base font-semibold ${getStatusColor()}`}>
          {getStatusMessage()}
        </h3>
        
        {gameState.selectedSquare && (
          <p className="text-xs text-telegram-hint mt-1">
            Выбрана клетка: {gameState.selectedSquare}
          </p>
        )}
        
        {gameState.possibleMoves.length > 0 && (
          <p className="text-xs text-telegram-hint mt-1">
            Возможные ходы: {gameState.possibleMoves.slice(0, 3).join(', ')}
            {gameState.possibleMoves.length > 3 && '...'}
          </p>
        )}
      </div>
    </div>
  );
};