import React, { useState, useEffect } from 'react';
import { Navigation } from '../components/Navigation';
import { Button } from '../components/Button';
import { TelegramService } from '../services/telegram';
import ApiService from '../services/api';
import type { Game } from '../types';

export const HistoryPage: React.FC = () => {
  const telegram = TelegramService.getInstance();
  const apiService = ApiService.getInstance();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGameHistory();
  }, []);

  const loadGameHistory = async () => {
    try {
      setLoading(true);
      const userId = telegram.getUserId()?.toString() || 'mock-user';
      const gameHistory = await apiService.getUserHistory(userId);
      setGames(gameHistory);
    } catch (err) {
      console.error('Failed to load game history:', err);
      setError('Не удалось загрузить историю игр');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getGameResult = (game: Game) => {
    if (game.status === 'finished') {
      if (game.winner === 'draw') return 'Ничья';
      return `Победитель: ${game.winner === 'white' ? 'Белые' : 'Черные'}`;
    }
    return 'В процессе';
  };

  const getGameResultColor = (game: Game) => {
    if (game.status === 'finished') {
      if (game.winner === 'draw') return 'text-yellow-600';
      return 'text-green-600';
    }
    return 'text-blue-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-telegram-bg">
        <Navigation 
          showBackButton 
          title="История партий" 
        />
        
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-telegram-hint">Загрузка истории...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-telegram-bg">
      <Navigation 
        showBackButton 
        title="История партий" 
      />
      
      <div className="p-4">
        {error ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">❌</div>
            <p className="text-telegram-hint mb-4">{error}</p>
            <Button onClick={loadGameHistory} variant="primary">
              Попробовать снова
            </Button>
          </div>
        ) : games.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📚</div>
            <p className="text-telegram-hint mb-4">История игр пуста</p>
            <p className="text-sm text-telegram-hint">
              Сыграйте несколько партий, чтобы увидеть их здесь
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-telegram-text">
                Ваши игры ({games.length})
              </h2>
              <Button onClick={loadGameHistory} variant="secondary" size="sm">
                Обновить
              </Button>
            </div>
            
            {games.map((game) => (
              <div
                key={game.id}
                className="bg-telegram-secondary-bg rounded-lg p-4 border border-telegram-hint/20"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-sm text-telegram-hint">
                      {formatDate(game.createdAt.toString())}
                    </p>
                    <p className="text-telegram-text font-medium">
                      Игра #{game.id.slice(-6)}
                    </p>
                  </div>
                  <span className={`text-sm font-medium ${getGameResultColor(game)}`}>
                    {getGameResult(game)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center text-sm text-telegram-hint">
                  <span>Ходов: {game.moves?.length || 0}</span>
                  <span>Статус: {game.status}</span>
                </div>
                
                {game.whitePlayer && game.blackPlayer && (
                  <div className="mt-2 text-sm text-telegram-hint">
                    <span className="text-telegram-text">Игроки: </span>
                    <span>{game.whitePlayer.username || 'Белые'} vs {game.blackPlayer.username || 'Черные'}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};