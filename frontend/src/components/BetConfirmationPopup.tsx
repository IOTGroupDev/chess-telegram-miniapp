import React, { useState } from 'react';
import { GameBet, CurrencyType } from '../types/supabase';
import { Button } from './Button';
import { useTranslation } from 'react-i18next';

interface BetConfirmationPopupProps {
  bet: GameBet;
  onAccept: () => Promise<void>;
  onDecline: () => void;
  show: boolean;
  isProposer?: boolean; // Is this the player who proposed the bet?
}

/**
 * Popup for confirming bet terms
 * Shows terms, conditions, and calculates payout
 */
export const BetConfirmationPopup: React.FC<BetConfirmationPopupProps> = ({
  bet,
  onAccept,
  onDecline,
  show,
  isProposer = false,
}) => {
  const { t } = useTranslation();
  const [accepting, setAccepting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleAccept = async () => {
    if (!termsAccepted) {
      alert(t('betting.mustAcceptTerms', 'Вы должны принять условия'));
      return;
    }

    setAccepting(true);
    try {
      await onAccept();
    } catch (error) {
      console.error('Error accepting bet:', error);
    } finally {
      setAccepting(false);
    }
  };

  if (!show || !bet || !bet.bet_amount || !bet.currency) return null;

  const currencySymbol = bet.currency === 'stars' ? '⭐' : '💰';
  const currencyName =
    bet.currency === 'stars' ? 'Stars' : t('betting.coins', 'монет');

  const totalPot = bet.bet_amount * 2;
  const platformFee = totalPot * (bet.platform_fee_percentage / 100);
  const winnerPayout = totalPot - platformFee;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">{currencySymbol}</div>
          <h2 className="text-3xl font-bold text-white mb-2">
            {isProposer
              ? t('betting.waitingForOpponent', 'Ожидание оппонента')
              : t('betting.betProposal', 'Предложение ставки')}
          </h2>
          <p className="text-slate-400 text-sm">
            {isProposer
              ? t('betting.proposalSent', 'Ваше предложение отправлено')
              : t('betting.opponentProposedBet', 'Оппонент предложил ставку')}
          </p>
        </div>

        {/* Bet Details */}
        <div className="mb-6 bg-slate-700/30 rounded-xl p-5 border border-slate-600/30">
          <h3 className="text-lg font-bold text-white mb-4">
            {t('betting.betDetails', '💰 Детали ставки')}
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-slate-300">
              <span>{t('betting.betAmount', 'Ставка')}:</span>
              <span className="font-bold text-white text-base">
                {bet.bet_amount} {currencyName}
              </span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>{t('betting.totalPot', 'Общий банк')}:</span>
              <span className="font-bold text-white">
                {totalPot.toFixed(bet.currency === 'stars' ? 0 : 2)} {currencyName}
              </span>
            </div>
            <div className="flex justify-between text-red-400">
              <span>
                {t('betting.platformFee', 'Комиссия')} ({bet.platform_fee_percentage}%):
              </span>
              <span className="font-bold">
                -{platformFee.toFixed(bet.currency === 'stars' ? 0 : 2)} {currencyName}
              </span>
            </div>
            <div className="h-px bg-slate-600 my-2"></div>
            <div className="flex justify-between text-green-400">
              <span className="font-bold">
                {t('betting.winnerPayout', '🏆 Выигрыш победителя')}:
              </span>
              <span className="font-bold text-xl">
                {winnerPayout.toFixed(bet.currency === 'stars' ? 0 : 2)} {currencyName}
              </span>
            </div>
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="mb-6 bg-amber-500/10 rounded-xl p-5 border border-amber-400/30">
          <h3 className="text-lg font-bold text-amber-400 mb-3 flex items-center">
            <span className="mr-2">⚠️</span>
            {t('betting.terms', 'Условия')}
          </h3>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-start">
              <span className="mr-2 mt-0.5">•</span>
              <span>
                {t(
                  'betting.term1',
                  'Средства будут заблокированы до конца игры'
                )}
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 mt-0.5">•</span>
              <span>
                {t(
                  'betting.term2',
                  'При выходе из игры или проигрыше ставка не возвращается'
                )}
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 mt-0.5">•</span>
              <span>
                {t(
                  'betting.term3',
                  `Комиссия платформы: ${bet.platform_fee_percentage}% от общего банка`
                )}
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 mt-0.5">•</span>
              <span>
                {t(
                  'betting.term4',
                  'При ничьей каждый игрок получает обратно свою ставку минус 5% комиссии'
                )}
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 mt-0.5">•</span>
              <span>
                {t(
                  'betting.term5',
                  'Победитель получает весь банк за вычетом комиссии платформы'
                )}
              </span>
            </li>
          </ul>
        </div>

        {/* Terms Checkbox (only for non-proposer) */}
        {!isProposer && (
          <div className="mb-6">
            <label className="flex items-start cursor-pointer group">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1 mr-3 w-5 h-5 rounded border-2 border-slate-600 bg-slate-700 checked:bg-blue-500 checked:border-blue-500 focus:ring-2 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                {t(
                  'betting.acceptTerms',
                  'Я принимаю условия игры и готов внести депозит'
                )}
              </span>
            </label>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {!isProposer ? (
            <>
              <Button
                variant="success"
                onClick={handleAccept}
                className="w-full"
                size="lg"
                disabled={!termsAccepted}
                loading={accepting}
              >
                {t('betting.acceptAndDeposit', '✅ Принять условия и внести депозит')}
              </Button>
              <Button variant="danger" onClick={onDecline} className="w-full">
                {t('betting.decline', 'Отклонить')}
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={onDecline} className="w-full">
              {t('betting.cancel', 'Отменить предложение')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
