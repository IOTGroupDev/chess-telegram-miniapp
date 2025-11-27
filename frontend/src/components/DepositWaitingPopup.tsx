import React from 'react';
import type { GameBet } from '../types/supabase';
import { Button } from './Button';
import { useTranslation } from 'react-i18next';

interface DepositWaitingPopupProps {
  bet: GameBet;
  isWhitePlayer: boolean;
  onDeposit?: () => Promise<void>;
  onCancel?: () => void;
  show: boolean;
}

/**
 * Popup showing deposit status for both players
 * Allows players to deposit their bet amount
 */
export const DepositWaitingPopup: React.FC<DepositWaitingPopupProps> = ({
  bet,
  isWhitePlayer,
  onDeposit,
  onCancel,
  show,
}) => {
  const { t } = useTranslation();
  const [depositing, setDepositing] = React.useState(false);

  const currencySymbol = bet.currency === 'stars' ? '⭐' : '💰';
  const currencyName =
    bet.currency === 'stars' ? 'Stars' : t('betting.coins', 'монет');

  const currentPlayerDeposited = isWhitePlayer
    ? bet.white_deposit_status === 'locked'
    : bet.black_deposit_status === 'locked';

  const opponentDeposited = isWhitePlayer
    ? bet.black_deposit_status === 'locked'
    : bet.white_deposit_status === 'locked';

  const bothDeposited =
    bet.white_deposit_status === 'locked' && bet.black_deposit_status === 'locked';

  const handleDeposit = async () => {
    if (!onDeposit) return;

    setDepositing(true);
    try {
      await onDeposit();
    } catch (error) {
      console.error('Error depositing:', error);
    } finally {
      setDepositing(false);
    }
  };

  if (!show || !bet || !bet.bet_amount) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl border border-white/10">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">{bothDeposited ? '✅' : '⏳'}</div>
          <h2 className="text-3xl font-bold text-white mb-2">
            {bothDeposited
              ? t('betting.depositsCompleted', 'Депозиты внесены!')
              : t('betting.waitingForDeposits', 'Ожидание депозитов')}
          </h2>
          <p className="text-slate-400 text-sm">
            {bothDeposited
              ? t('betting.gameWillStart', 'Игра начнется через секунду...')
              : t('betting.bothPlayersMustDeposit', 'Оба игрока должны внести депозит')}
          </p>
        </div>

        {/* Bet Amount */}
        <div className="mb-6 bg-slate-700/30 rounded-xl p-5 border border-slate-600/30 text-center">
          <div className="text-sm text-slate-400 mb-2">
            {t('betting.betAmount', 'Сумма ставки')}
          </div>
          <div className="text-4xl font-bold text-white">
            {bet.bet_amount} {currencySymbol}
          </div>
          <div className="text-sm text-slate-400 mt-1">{currencyName}</div>
        </div>

        {/* Deposit Status */}
        <div className="mb-6 space-y-3">
          {/* White Player Status */}
          <div
            className={`flex items-center justify-between p-4 rounded-xl border ${
              bet.white_deposit_status === 'locked'
                ? 'bg-green-500/20 border-green-400/30'
                : 'bg-slate-700/30 border-slate-600/30'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="text-2xl">⚪</div>
              <div>
                <div className="font-semibold text-white">
                  {t('betting.whitePlayer', 'Белые')}
                  {isWhitePlayer && (
                    <span className="text-sm text-blue-400 ml-2">
                      ({t('betting.you', 'Вы')})
                    </span>
                  )}
                </div>
                <div className="text-sm text-slate-400">
                  {bet.white_deposit_status === 'locked'
                    ? t('betting.deposited', 'Депозит внесен')
                    : t('betting.waitingDeposit', 'Ожидание депозита...')}
                </div>
              </div>
            </div>
            <div className="text-2xl">
              {bet.white_deposit_status === 'locked' ? '✅' : '⏳'}
            </div>
          </div>

          {/* Black Player Status */}
          <div
            className={`flex items-center justify-between p-4 rounded-xl border ${
              bet.black_deposit_status === 'locked'
                ? 'bg-green-500/20 border-green-400/30'
                : 'bg-slate-700/30 border-slate-600/30'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="text-2xl">⚫</div>
              <div>
                <div className="font-semibold text-white">
                  {t('betting.blackPlayer', 'Черные')}
                  {!isWhitePlayer && (
                    <span className="text-sm text-blue-400 ml-2">
                      ({t('betting.you', 'Вы')})
                    </span>
                  )}
                </div>
                <div className="text-sm text-slate-400">
                  {bet.black_deposit_status === 'locked'
                    ? t('betting.deposited', 'Депозит внесен')
                    : t('betting.waitingDeposit', 'Ожидание депозита...')}
                </div>
              </div>
            </div>
            <div className="text-2xl">
              {bet.black_deposit_status === 'locked' ? '✅' : '⏳'}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {!bothDeposited && !currentPlayerDeposited && onDeposit && (
            <Button
              variant="success"
              onClick={handleDeposit}
              className="w-full"
              size="lg"
              loading={depositing}
            >
              {t('betting.depositNow', `💳 Внести ${bet.bet_amount} ${currencyName}`)}
            </Button>
          )}

          {currentPlayerDeposited && !opponentDeposited && (
            <div className="bg-blue-500/20 border border-blue-400/30 rounded-xl p-4 text-center">
              <div className="text-blue-300 text-sm">
                {t('betting.yourDepositReceived', '✅ Ваш депозит получен')}
              </div>
              <div className="text-slate-400 text-xs mt-1">
                {t('betting.waitingForOpponentDeposit', 'Ожидание депозита от оппонента...')}
              </div>
            </div>
          )}

          {bothDeposited && (
            <div className="bg-green-500/20 border border-green-400/30 rounded-xl p-4 text-center">
              <div className="text-green-300 font-semibold">
                {t('betting.allDepositsReceived', '✅ Все депозиты получены!')}
              </div>
              <div className="text-slate-400 text-sm mt-1">
                {t('betting.startingGame', 'Начинаем игру...')}
              </div>
            </div>
          )}

          {!currentPlayerDeposited && onCancel && (
            <Button variant="danger" onClick={onCancel} className="w-full">
              {t('betting.cancelBet', 'Отменить ставку')}
            </Button>
          )}
        </div>

        {/* Info */}
        {!bothDeposited && (
          <div className="mt-4 text-center text-xs text-slate-500">
            {t(
              'betting.depositTimeout',
              'Если депозит не будет внесен в течение 5 минут, игра будет отменена'
            )}
          </div>
        )}
      </div>
    </div>
  );
};
