import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { useAppStore } from '../store/useAppStore';
import { AuthService } from '../services/authService';

export const StartPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    user,
    isAuthorized,
    isLoading,
    error,
    setUser,
    setAuthorized,
    setAccessToken,
    setSupabaseUserId,
    setLoading,
    setError,
    clearError,
  } = useAppStore();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        setLoading(true);
        clearError();

        // Check if user is already authorized with stored token
        if (isAuthorized && user) {
          navigate('/main');
          return;
        }

        // Try Telegram authentication
        const tg = window.Telegram?.WebApp;

        if (tg?.initData && tg.initDataUnsafe?.user) {
          console.log('[Auth] Telegram initData found, authenticating...');

          try {
            const result = await AuthService.authenticateWithTelegram(tg.initData);

            // Map backend user to Telegram user format
            const telegramUser = {
              id: result.user.telegram_id,
              first_name: result.user.first_name || 'User',
              last_name: result.user.last_name || undefined,
              username: result.user.username || undefined,
              photo_url: result.user.avatar_url || undefined,
            };

            setUser(telegramUser);
            setAuthorized(true);
            setAccessToken(result.accessToken);
            setSupabaseUserId(result.user.id);

            console.log('[Auth] Authentication successful', result.user.id);

            // Navigate to main menu
            navigate('/main');
          } catch (authError) {
            console.error('[Auth] Telegram authentication failed:', authError);
            setError('Ошибка авторизации через Telegram');
          }
        } else {
          console.log('[Auth] No Telegram initData, guest mode available');
        }
      } catch (err) {
        console.error('[Auth] Failed to initialize app:', err);
        setError('Не удалось инициализировать приложение');
      } finally {
        setLoading(false);
        setIsInitializing(false);
      }
    };

    initializeApp();
  }, []); // Empty deps to run only once on mount

  const handlePlayAsGuest = () => {
    // Create a guest user
    const guestUser = {
      id: Math.floor(Math.random() * 1000000),
      first_name: 'Guest',
      username: 'guest',
      language_code: 'en',
    };

    setUser(guestUser);
    setAuthorized(true);
    navigate('/main');
  };

  const handleRetry = () => {
    window.location.reload();
  };

  if (isInitializing || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1e293b' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Инициализация...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#1e293b' }}>
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-white mb-4">
            Ошибка инициализации
          </h1>
          <p className="text-slate-400 mb-6">
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1e293b' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Переход в главное меню...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#1e293b' }}>
      <div className="text-center max-w-md">
        <div className="text-8xl mb-6">♔</div>
        <h1 className="text-4xl font-bold text-white mb-4">
          Шахматы
        </h1>
        <p className="text-slate-400 text-lg mb-8">
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
