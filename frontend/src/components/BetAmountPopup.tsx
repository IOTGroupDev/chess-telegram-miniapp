import React, { useState } from 'react';
import { CurrencyType } from '../types/supabase';
import { Button } from './Button';
import { useTranslation } from 'react-i18next';

interface BetAmountPopupProps {
  currency: CurrencyType;
  userBalance: number;
  onConfirm: (amount: number) => void;
  onCancel: () => void;
  show: boolean;
}

/**
 * Popup for entering bet amount
 * Shows balance, calculates payout with 10% fee
 */
export const BetAmountPopup: React.FC<BetAmountPopupProps> = ({
  currency,
  userBalance,
  onConfirm,
  onCancel,
  show,
}) => {
  const { t } = useTranslation();
  const [amount, setAmount] = useState<string>('');
  const [error, setError] = useState<string>('');

  const currencySymbol = currency === 'stars' ? '⭐' : '💰';
  const currencyName = currency === 'stars' ? 'Stars' : t('betting.coins', 'монет');

  // Calculate winnings (2x bet - 10% platform fee)
  const betAmount = parseFloat(amount) || 0;
  const totalPot = betAmount * 2;
  const platformFee = totalPot * 0.1;
  const winnerPayout = totalPot - platformFee;

  // Preset amounts
  const presets =
    currency === 'stars' ? [10, 50, 100, 500] : [100, 500, 1000, 5000];

  const handleConfirm = () => {
    const numAmount = parseFloat(amount);

    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError(t('betting.enterValidAmount', 'Введите корректную сумму'));
      return;
    }

    if (numAmount > userBalance) {
      setError(t('betting.insufficientBalance', 'Недостаточно средств'));
      return;
    }

    if (currency === 'stars' && numAmount < 1) {
      setError(t('betting.minStarsAmount', 'Минимальная ставка: 1 Star'));
      return;
    }

    if (currency === 'coins' && numAmount < 10) {
      setError(t('betting.minCoinsAmount', 'Минимальная ставка: 10 монет'));
      return;
    }

    onConfirm(numAmount);
  };

  const handlePresetClick = (preset: number) => {
    if (preset <= userBalance) {
      setAmount(preset.toString());
      setError('');
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl border border-white/10">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">{currencySymbol}</div>
          <h2 className="text-3xl font-bold text-white mb-2">
            {t('betting.setBetAmount', 'Установите ставку')}
          </h2>
          <p className="text-slate-400 text-sm">
            {t('betting.yourBalance', 'Ваш баланс')}: {userBalance} {currencyName}
          </p>
        </div>

        {/* Amount Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            {t('betting.betAmount', 'Сумма ставки')}
          </label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError('');
              }}
              placeholder="0"
              className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
              {currencyName}
            </div>
          </div>
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        </div>

        {/* Preset Amounts */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            {t('betting.quickSelect', 'Быстрый выбор')}
          </label>
          <div className="grid grid-cols-4 gap-2">
            {presets.map((preset) => (
              <button
                key={preset}
                onClick={() => handlePresetClick(preset)}
                disabled={preset > userBalance}
                className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all ${
                  preset <= userBalance
                    ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-400/30'
                    : 'bg-slate-700/30 text-slate-500 cursor-not-allowed border border-slate-600/30'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Calculation */}
        {betAmount > 0 && (
          <div className="mb-6 bg-slate-700/30 rounded-xl p-4 border border-slate-600/30">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-300">
                <span>{t('betting.yourBet', 'Ваша ставка')}:</span>
                <span className="font-bold">
                  {betAmount} {currencyName}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>{t('betting.opponentBet', 'Ставка оппонента')}:</span>
                <span className="font-bold">
                  {betAmount} {currencyName}
                </span>
              </div>
              <div className="h-px bg-slate-600 my-2"></div>
              <div className="flex justify-between text-slate-300">
                <span>{t('betting.totalPot', 'Общий банк')}:</span>
                <span className="font-bold">
                  {totalPot.toFixed(currency === 'stars' ? 0 : 2)} {currencyName}
                </span>
              </div>
              <div className="flex justify-between text-red-400">
                <span>{t('betting.platformFee', 'Комиссия платформы')} (10%):</span>
                <span className="font-bold">
                  -{platformFee.toFixed(currency === 'stars' ? 0 : 2)} {currencyName}
                </span>
              </div>
              <div className="h-px bg-slate-600 my-2"></div>
              <div className="flex justify-between text-green-400 text-base">
                <span className="font-bold">{t('betting.winnerGets', '🏆 Победитель получит')}:</span>
                <span className="font-bold text-xl">
                  {winnerPayout.toFixed(currency === 'stars' ? 0 : 2)} {currencyName}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button variant="primary" onClick={handleConfirm} className="w-full" size="lg">
            {t('betting.proposeBet', 'Предложить ставку')}
          </Button>
          <Button variant="secondary" onClick={onCancel} className="w-full">
            {t('common.cancel', 'Отмена')}
          </Button>
        </div>
      </div>
    </div>
  );
};
