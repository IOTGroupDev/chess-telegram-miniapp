import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/useAppStore';
import supabase from '../lib/supabaseClient';
import type { User, BetType, CurrencyType } from '../types/supabase';
import { GameModePopup } from '../components/GameModePopup';
import { BetAmountPopup } from '../components/BetAmountPopup';
import { useWallet } from '../hooks/useWallet';
import { useGameBet } from '../hooks/useGameBet';
import { telegramService } from '../services/telegramService';

const generateInviteCode = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

const OnlineChallengePage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, supabaseUserId, setCurrentGame } = useAppStore();

  const [players, setPlayers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [playersError, setPlayersError] = useState<string | null>(null);

  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [, setSelectedOpponent] = useState<User | null>(null);
  const [pendingGameId, setPendingGameId] = useState<string | null>(null);

  const [showGameModePopup, setShowGameModePopup] = useState(false);
  const [showBetAmountPopup, setShowBetAmountPopup] = useState(false);
  const [selectedBetType, setSelectedBetType] = useState<BetType | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyType | null>(null);

  const { wallet } = useWallet(supabaseUserId);
  const { createBet } = useGameBet(pendingGameId, supabaseUserId);

  useEffect(() => {
    if (!supabaseUserId) return;

    const loadPlayers = async () => {
      try {
        setLoadingPlayers(true);
        setPlayersError(null);

        const { data, error } = await supabase
          .from('users')
          .select('*')
          .neq('id', supabaseUserId)
          .order('last_seen_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        setPlayers((data as User[]) || []);
      } catch (err) {
        console.error('Failed to load players:', err);
        setPlayersError(
          err instanceof Error ? err.message : 'Не удалось загрузить список игроков'
        );
      } finally {
        setLoadingPlayers(false);
      }
    };

    loadPlayers();
  }, [supabaseUserId]);

  const filteredPlayers = useMemo(() => {
    if (!search.trim()) return players;
    const q = search.toLowerCase();
    return players.filter((p) => {
      const username = p.username || '';
      const firstName = p.first_name || '';
      const lastName = p.last_name || '';
      return (
        username.toLowerCase().includes(q) ||
        firstName.toLowerCase().includes(q) ||
        lastName.toLowerCase().includes(q)
      );
    });
  }, [players, search]);

  const handleBack = () => {
    navigate('/main');
  };

  const handleSelectOpponent = async (opponent: User) => {
    if (!supabaseUserId) {
      telegramService.showAlert(t('errors.authRequired'));
      return;
    }

    try {
      setIsCreatingGame(true);
      setSelectedOpponent(opponent);

      const inviteCode = generateInviteCode();

      const { data: game, error } = await supabase
        .from('games')
        .insert({
          white_player_id: supabaseUserId,
          black_player_id: opponent.id,
          status: 'pending_bet_setup',
          invite_code: inviteCode,
          time_control: 'blitz',
          time_limit: 300,
          time_increment: 3,
          is_rated: true,
          is_public: false,
        } as any)
        .select()
        .single();

      if (error) throw error;

      setPendingGameId((game as any).id);
      setShowGameModePopup(true);
    } catch (err) {
      console.error('Failed to create game:', err);
      telegramService.showAlert(t('errors.createGameFailed'));
    } finally {
      setIsCreatingGame(false);
    }
  };

  const handleGameModeSelect = async (betType: BetType) => {
    if (!pendingGameId) return;

    setSelectedBetType(betType);
    setShowGameModePopup(false);

    if (betType === 'free') {
      try {
        await createBet(betType);

        const { data: game } = await supabase
          .from('games')
          .select('invite_code')
          .eq('id', pendingGameId)
          .single();

        if ((game as any)?.invite_code) {
          const url = `${window.location.origin}/join/${(game as any).invite_code}`;
          const inviteLink = `https://t.me/share/url?url=${encodeURIComponent(url)}`;
          telegramService.openLink(inviteLink);
        }

        setCurrentGame(pendingGameId, 'online');
        navigate(`/online-game/${pendingGameId}`);
      } catch (err) {
        console.error('Failed to create free bet:', err);
        telegramService.showAlert(t('errors.createBetFailed'));
      }
    } else {
      setSelectedCurrency(betType === 'stars' ? 'stars' : 'coins');
      setShowBetAmountPopup(true);
    }
  };

  const handleBetAmountConfirm = async (amount: number) => {
    if (!selectedBetType || !selectedCurrency || !pendingGameId) return;

    try {
      setShowBetAmountPopup(false);
      setIsCreatingGame(true);

      await createBet(selectedBetType, amount, selectedCurrency);

      const { data: game } = await supabase
        .from('games')
        .select('invite_code')
        .eq('id', pendingGameId)
        .single();

      if ((game as any)?.invite_code) {
        const url = `${window.location.origin}/join/${(game as any).invite_code}`;
        const inviteLink = `https://t.me/share/url?url=${encodeURIComponent(url)}`;
        telegramService.openLink(inviteLink);
      }

      setCurrentGame(pendingGameId, 'online');
      navigate(`/online-game/${pendingGameId}`);
    } catch (err) {
      console.error('Failed to create bet:', err);
      telegramService.showAlert(t('errors.createBetFailed'));
      setIsCreatingGame(false);
    }
  };

  const handlePopupCancel = async () => {
    setShowGameModePopup(false);
    setShowBetAmountPopup(false);

    if (pendingGameId) {
      await supabase.from('games').delete().eq('id', pendingGameId);
      setPendingGameId(null);
    }

    setSelectedBetType(null);
    setSelectedCurrency(null);
    setSelectedOpponent(null);
  };

  if (!user) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="text-center text-white px-6">
          <p className="mb-4 text-lg">
            {t('errors.authRequired', 'Необходима авторизация')}
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all active:scale-95"
          >
            {t('common.back', 'Назад')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 pb-safe">
      <div className="max-w-md mx-auto px-4">
        <div
          className="flex items-center justify-between mb-4"
          style={{ paddingTop: 'max(env(safe-area-inset-top), 40px)' }}
        >
          <button
            onClick={handleBack}
            className="text-white/70 hover:text-white transition-colors flex items-center gap-1"
          >
            <span className="text-xl">←</span>
            <span className="text-sm">{t('common.back', 'Назад')}</span>
          </button>
          <h1 className="text-xl font-bold text-white">
            {t('onlineChallenge.title', 'Выберите соперника')}
          </h1>
          <div className="w-8" />
        </div>

        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t(
              'onlineChallenge.searchPlaceholder',
              'Поиск по имени или нику',
            )}
            className="w-full bg-slate-900/60 border border-white/20 rounded-xl px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-3 max-h-[60vh] overflow-y-auto">
          {loadingPlayers && (
            <div className="py-8 text-center text-slate-300 text-sm">
              {t('onlineChallenge.loading', 'Загрузка игроков...')}
            </div>
          )}
          {playersError && !loadingPlayers && (
            <div className="py-8 text-center text-red-400 text-sm">
              {playersError}
            </div>
          )}
          {!loadingPlayers && !playersError && filteredPlayers.length === 0 && (
            <div className="py-8 text-center text-slate-400 text-sm">
              {t(
                'onlineChallenge.empty',
                'Пока нет доступных соперников',
              )}
            </div>
          )}
          {!loadingPlayers && !playersError && filteredPlayers.length > 0 && (
            <div className="space-y-2">
              {filteredPlayers.map((player) => (
                <button
                  key={player.id}
                  onClick={() => handleSelectOpponent(player)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/70 hover:bg-slate-700/80 border border-white/10 hover:border-white/20 transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
                      {(player.first_name || player.username || '?')[0]?.toUpperCase() ||
                        '?'}
                    </div>
                    <div className="text-left">
                      <div className="text-sm text-white font-semibold">
                        {player.first_name || player.username || 'Player'}
                      </div>
                      {player.username && (
                        <div className="text-xs text-slate-400">
                          @{player.username}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 text-right">
                    <div>
                      {t('onlineChallenge.rating', 'Рейтинг')}:{' '}
                      {player.blitz_rating}
                    </div>
                    <div className="text-green-400">
                      {t('onlineChallenge.play', 'Играть')} →
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {isCreatingGame && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50">
          <div className="glass rounded-3xl p-8 border border-white/20 text-center max-w-xs bg-slate-900/90">
            <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white text-lg font-semibold">
              {t('game.creatingMatch', 'Создание матча...')}
            </p>
          </div>
        </div>
      )}

      <GameModePopup
        show={showGameModePopup}
        onSelect={handleGameModeSelect}
        onClose={handlePopupCancel}
      />

      {selectedCurrency && wallet && (
        <BetAmountPopup
          show={showBetAmountPopup}
          currency={selectedCurrency}
          userBalance={
            selectedCurrency === 'coins'
              ? wallet.balance_coins
              : wallet.balance_stars
          }
          onConfirm={handleBetAmountConfirm}
          onCancel={handlePopupCancel}
        />
      )}
    </div>
  );
};

export default OnlineChallengePage;
