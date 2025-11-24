import React from 'react';
import { Navigation } from '../components/Navigation';
import { Button } from '../components/Button';
import { TelegramService } from '../services/telegram';

export const ProfilePage: React.FC = () => {
  const telegram = TelegramService.getInstance();
  const user = telegram.getUser();

  return (
    <div className="min-h-screen bg-telegram-bg" style={{ paddingTop: 'max(env(safe-area-inset-top), 60px)' }}>
      <Navigation
        showBackButton
        title="Профиль"
      />

      <div className="px-4 py-6 pt-8">
        {/* User Info */}
        <div className="bg-telegram-secondary-bg rounded-lg p-6 text-center mb-6">
          <div className="w-20 h-20 bg-telegram-button rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-telegram-button-text">
              {user?.firstName?.charAt(0).toUpperCase() || '👤'}
            </span>
          </div>
          
          <h2 className="text-xl font-bold text-telegram-text mb-1">
            {user?.firstName || 'Игрок'} {user?.lastName || ''}
          </h2>
          
          {user?.username && (
            <p className="text-telegram-hint mb-4">
              @{user.username}
            </p>
          )}
          
          <div className="text-3xl font-bold text-telegram-button">
            1200
          </div>
          <p className="text-sm text-telegram-hint">
            Рейтинг
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-telegram-secondary-bg rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-telegram-text">
              0
            </div>
            <p className="text-sm text-telegram-hint">
              Побед
            </p>
          </div>
          
          <div className="bg-telegram-secondary-bg rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-telegram-text">
              0
            </div>
            <p className="text-sm text-telegram-hint">
              Поражений
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={() => window.history.back()}
            size="lg"
            className="w-full"
          >
            Начать игру
          </Button>
        </div>

        <div className="mt-8 p-4 bg-telegram-secondary-bg rounded-lg text-center">
          <p className="text-sm text-telegram-hint">
            ⚠️ Функция в разработке
          </p>
        </div>
      </div>
    </div>
  );
};