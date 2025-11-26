import React from 'react';
import { BetType } from '../types/supabase';
import { Button } from './Button';
import { useTranslation } from 'react-i18next';

interface GameModePopupProps {
  onSelect: (betType: BetType) => void;
  onClose: () => void;
  show: boolean;
}

/**
 * Popup for selecting game mode (free, coins, or stars)
 * Shown to the white player when creating a game
 */
export const GameModePopup: React.FC<GameModePopupProps> = ({ onSelect, onClose, show }) => {
  const { t } = useTranslation();

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl border border-white/10">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-white mb-2">
            {t('betting.selectGameMode', '🎮 Выберите режим игры')}
          </h2>
          <p className="text-slate-400 text-sm">
            {t('betting.selectGameModeDesc', 'Выберите тип игры для вашего матча')}
          </p>
        </div>

        {/* Options */}
        <div className="space-y-4">
          {/* Free Game */}
          <div
            onClick={() => onSelect('free')}
            className="cursor-pointer group bg-gradient-to-r from-emerald-500/20 to-green-500/20 hover:from-emerald-500/30 hover:to-green-500/30 border border-emerald-400/30 rounded-2xl p-5 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/20"
          >
            <div className="flex items-center space-x-4">
              <div className="text-4xl">🎮</div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-1">
                  {t('betting.freeBattle', 'Бесплатный батл')}
                </h3>
                <p className="text-sm text-slate-300">
                  {t('betting.freeBattleDesc', 'Игра без ставок, просто для удовольствия')}
                </p>
              </div>
              <div className="text-emerald-400 group-hover:translate-x-1 transition-transform">
                ▶
              </div>
            </div>
          </div>

          {/* Stars Game */}
          <div
            onClick={() => onSelect('stars')}
            className="cursor-pointer group bg-gradient-to-r from-yellow-500/20 to-amber-500/20 hover:from-yellow-500/30 hover:to-amber-500/30 border border-yellow-400/30 rounded-2xl p-5 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-yellow-500/20"
          >
            <div className="flex items-center space-x-4">
              <div className="text-4xl">⭐</div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-1">
                  {t('betting.starsGame', 'Игра на Telegram Stars')}
                </h3>
                <p className="text-sm text-slate-300">
                  {t('betting.starsGameDesc', 'Ставка в звездах Telegram')}
                </p>
              </div>
              <div className="text-yellow-400 group-hover:translate-x-1 transition-transform">
                ▶
              </div>
            </div>
          </div>

          {/* Coins Game */}
          <div
            onClick={() => onSelect('coins')}
            className="cursor-pointer group bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 border border-blue-400/30 rounded-2xl p-5 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20"
          >
            <div className="flex items-center space-x-4">
              <div className="text-4xl">💰</div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-1">
                  {t('betting.coinsGame', 'Игра на монеты')}
                </h3>
                <p className="text-sm text-slate-300">
                  {t('betting.coinsGameDesc', 'Ставка во внутренней валюте')}
                </p>
              </div>
              <div className="text-blue-400 group-hover:translate-x-1 transition-transform">
                ▶
              </div>
            </div>
          </div>
        </div>

        {/* Cancel Button */}
        <div className="mt-6">
          <Button variant="secondary" onClick={onClose} className="w-full">
            {t('common.cancel', 'Отмена')}
          </Button>
        </div>
      </div>
    </div>
  );
};
