import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { useAppStore } from '../store/useAppStore';
import { telegramService } from '../services/telegramService';
import ApiService from '../services/api';

export const MainMenu: React.FC = () => {
  const navigate = useNavigate();
  const { user, setCurrentGame } = useAppStore();
  const apiService = ApiService.getInstance();
  const [isCreatingGame, setIsCreatingGame] = useState(false);

  const handlePlayAI = () => {
    setCurrentGame(null, 'ai');
    navigate('/ai-game');
  };

  const handlePlayOnline = async () => {
    try {
      setIsCreatingGame(true);
      
      // Get user ID from Telegram or generate mock
      const userId = user?.id || Math.floor(Math.random() * 1000000);
      
      // Try to join existing game first
      try {
        const game = await apiService.createOnlineGame({
          telegramId: userId,
          mode: 'join'
        });
        
        if (game.status === 'active') {
          setCurrentGame(game.id, 'online');
          navigate(`/online-game/${game.id}`);
        } else {
          // No waiting games, create new one
          const newGame = await apiService.createOnlineGame({
            telegramId: userId,
            mode: 'waiting'
          });
          setCurrentGame(newGame.id, 'online');
          navigate(`/online-game/${newGame.id}`);
        }
      } catch (error) {
        // If join fails, create new game
        const newGame = await apiService.createOnlineGame({
          telegramId: userId,
          mode: 'waiting'
        });
        setCurrentGame(newGame.id, 'online');
        navigate(`/online-game/${newGame.id}`);
      }
    } catch (error) {
      console.error('Failed to create online game:', error);
      telegramService.showAlert('Не удалось создать онлайн-игру. Попробуйте позже.');
    } finally {
      setIsCreatingGame(false);
    }
  };

  const handleCreateInviteLink = () => {
    // Generate invite link for sharing
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const inviteLink = `https://t.me/share/url?url=${encodeURIComponent(`https://yourapp.com/join/${inviteCode}`)}`;
    
    telegramService.openLink(inviteLink);
  };

  const handleViewHistory = () => {
    navigate('/history');
  };

  const handleViewProfile = () => {
    navigate('/profile');
  };

  return (
    <div className="min-h-screen bg-telegram-bg">
      {/* Header */}
      <div className="text-center py-8 px-4">
        <h1 className="text-4xl font-bold text-telegram-text mb-2">
          ♔ Шахматы
        </h1>
        <p className="text-telegram-hint text-lg">
          Добро пожаловать{user ? `, ${user.first_name}` : ''}!
        </p>
      </div>

      {/* Menu Buttons */}
      <div className="px-4 space-y-4 max-w-md mx-auto">
        <Button
          onClick={handlePlayOnline}
          size="lg"
          className="w-full py-4 text-lg"
          disabled={isCreatingGame}
        >
          {isCreatingGame ? '⏳ Поиск игры...' : '👥 Играть с человеком'}
        </Button>

        <Button
          onClick={handleCreateInviteLink}
          size="lg"
          variant="secondary"
          className="w-full py-4 text-lg"
        >
          🔗 Создать приглашение
        </Button>

        <Button
          onClick={handlePlayAI}
          size="lg"
          variant="secondary"
          className="w-full py-4 text-lg"
        >
          🤖 Играть с ИИ
        </Button>

        <Button
          onClick={handleViewHistory}
          size="lg"
          variant="secondary"
          className="w-full py-4 text-lg"
        >
          📚 История игр
        </Button>
      </div>

      {/* User Info */}
      {user && (
        <div className="mt-8 px-4">
          <div className="bg-telegram-secondary-bg rounded-lg p-4 text-center">
            <p className="text-sm text-telegram-hint">
              Игрок: {user.first_name} {user.last_name || ''}
              {user.username && ` (@${user.username})`}
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 text-center px-4">
        <p className="text-sm text-telegram-hint">
          Выберите режим игры
        </p>
      </div>
    </div>
  );
};