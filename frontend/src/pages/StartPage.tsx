import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { useAppStore } from '../store/useAppStore';

export const StartPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthorized, isLoading, error, setLoading, setError, clearError } = useAppStore();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        setLoading(true);
        clearError();
        
        // Wait a bit for Telegram WebApp to initialize
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (isAuthorized && user) {
          // User is already authorized, go to main menu
          navigate('/main');
        }
      } catch (err) {
        console.error('Failed to initialize app:', err);
        setError('Failed to initialize app');
      } finally {
        setLoading(false);
        setIsInitializing(false);
      }
    };

    initializeApp();
  }, [isAuthorized, user, navigate, setLoading, setError, clearError]);

  const handlePlayAsGuest = () => {
    // Create a guest user
    const guestUser = {
      id: Math.floor(Math.random() * 1000000),
      first_name: 'Guest',
      username: 'guest',
      language_code: 'en',
    };
    
    useAppStore.getState().setUser(guestUser);
    useAppStore.getState().setAuthorized(true);
    navigate('/main');
  };

  const handleRetry = () => {
    window.location.reload();
  };

  if (isInitializing || isLoading) {
    return (
      <div className="min-h-screen bg-telegram-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-telegram-button mx-auto mb-4"></div>
          <p className="text-telegram-text text-lg">Инициализация...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-telegram-bg flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-telegram-text mb-4">
            Ошибка инициализации
          </h1>
          <p className="text-telegram-hint mb-6">
            {error}
          </p>
          <div className="space-y-3">
            <Button
              onClick={handleRetry}
              size="lg"
              className="w-full"
            >
              🔄 Попробовать снова
            </Button>
            <Button
              onClick={handlePlayAsGuest}
              size="lg"
              variant="secondary"
              className="w-full"
            >
              👤 Играть как гость
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isAuthorized && user) {
    // User is authorized, redirect to main menu
    return (
      <div className="min-h-screen bg-telegram-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-telegram-button mx-auto mb-4"></div>
          <p className="text-telegram-text text-lg">Переход в главное меню...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-telegram-bg flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="text-8xl mb-6">♔</div>
        <h1 className="text-4xl font-bold text-telegram-text mb-4">
          Шахматы
        </h1>
        <p className="text-telegram-hint text-lg mb-8">
          Играйте в шахматы с друзьями или против ИИ
        </p>
        
        <div className="space-y-4">
          <Button
            onClick={handlePlayAsGuest}
            size="lg"
            className="w-full py-4 text-lg"
          >
            🎮 Начать игру
          </Button>
          
          <div className="text-sm text-telegram-hint">
            Для полного функционала откройте приложение через Telegram
          </div>
        </div>
      </div>
    </div>
  );
};
