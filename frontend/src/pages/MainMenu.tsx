import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/useAppStore';
import { telegramService } from '../services/telegramService';
import supabase from '../lib/supabaseClient';
import { useWallet } from '../hooks/useWallet';
import { useGameBet } from '../hooks/useGameBet';
import { GameModePopup } from '../components/GameModePopup';
import { BetAmountPopup } from '../components/BetAmountPopup';
import type { BetType, CurrencyType } from '../types/supabase';

export const MainMenu: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, supabaseUserId, setCurrentGame } = useAppStore();
  const [isCreatingGame, setIsCreatingGame] = useState(false);

  // Betting flow state
  const [showGameModePopup, setShowGameModePopup] = useState(false);
  const [showBetAmountPopup, setShowBetAmountPopup] = useState(false);
  const [selectedBetType, setSelectedBetType] = useState<BetType | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyType | null>(null);
  const [pendingGameId, setPendingGameId] = useState<string | null>(null);

  // Hooks
  const { wallet } = useWallet(supabaseUserId);
  const { createBet } = useGameBet(pendingGameId, supabaseUserId);

  const handlePlayAI = () => {
    setCurrentGame(null, 'ai');
    navigate('/ai-game');
  };

  const handlePlayOnline = () => {
    if (!user?.id) {
      telegramService.showAlert(t('errors.authRequired'));
      return;
    }

    navigate('/online-challenge');
  };

  const handleCreateInviteLink = async () => {
    // Use Supabase user ID (UUID), not Telegram user ID (number)
    if (!supabaseUserId) {
      telegramService.showAlert(t('errors.authRequired'));
      return;
    }

    try {
      setIsCreatingGame(true);

      // Generate invite code
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      // Create game with pending_bet_setup status
      const { data: game, error: gameError } = await supabase
        .from('games')
        .insert({
          white_player_id: supabaseUserId,
          status: 'pending_bet_setup',
          invite_code: inviteCode,
          time_control: 'blitz',
          time_limit: 300, // 5 minutes
          time_increment: 3, // 3 seconds
          is_rated: true,
          is_public: false,
        } as any)
        .select()
        .single();

      if (gameError) throw gameError;

      // Set pending game and show GameModePopup
      setPendingGameId((game as any)?.id);
      setShowGameModePopup(true);
      setIsCreatingGame(false);
    } catch (error) {
      console.error('Failed to create game:', error);
      telegramService.showAlert(t('errors.createGameFailed'));
      setIsCreatingGame(false);
    }
  };

  // Handle game mode selection
  const handleGameModeSelect = async (betType: BetType) => {
    setSelectedBetType(betType);
    setShowGameModePopup(false);

    // Safety check: game must be created and ID must be a valid UUID
    if (!pendingGameId) {
      telegramService.showAlert(t('errors.createGameFailed'));
      return;
    }

    if (betType === 'free') {
      // Free game - create bet and share immediately
      try {
        await createBet(betType);

        // Get invite code for sharing
        const { data: game } = await supabase
          .from('games')
          .select('invite_code')
          .eq('id', pendingGameId)
          .single();

        if ((game as any)?.invite_code) {
          const inviteLink = `https://t.me/share/url?url=${encodeURIComponent(
            `${window.location.origin}/join/${(game as any).invite_code}`
          )}`;
          telegramService.openLink(inviteLink);
        }

        // Navigate to game waiting room
        setCurrentGame(pendingGameId, 'online');
        navigate(`/online-game/${pendingGameId}`);
      } catch (error) {
        console.error('Failed to create free bet:', error);
        telegramService.showAlert(t('errors.createBetFailed'));
      }
    } else {
      // Paid game - show amount popup
      setSelectedCurrency(betType === 'stars' ? 'stars' : 'coins');
      setShowBetAmountPopup(true);
    }
  };

  // Handle bet amount confirmation
  const handleBetAmountConfirm = async (amount: number) => {
    if (!selectedBetType || !selectedCurrency || !pendingGameId) return;

    try {
      setShowBetAmountPopup(false);
      setIsCreatingGame(true);

      // Create bet
      await createBet(selectedBetType, amount, selectedCurrency);

      // Get invite code for sharing
      const { data: game } = await supabase
        .from('games')
        .select('invite_code')
        .eq('id', pendingGameId)
        .single();

      if ((game as any)?.invite_code) {
        const inviteLink = `https://t.me/share/url?url=${encodeURIComponent(
          `${window.location.origin}/join/${(game as any).invite_code}`
        )}`;
        telegramService.openLink(inviteLink);
      }

      // Navigate to game waiting room
      setCurrentGame(pendingGameId, 'online');
      navigate(`/online-game/${pendingGameId}`);
    } catch (error) {
      console.error('Failed to create bet:', error);
      telegramService.showAlert(t('errors.createBetFailed'));
      setIsCreatingGame(false);
    }
  };

  // Handle popup cancellation
  const handlePopupCancel = async () => {
    setShowGameModePopup(false);
    setShowBetAmountPopup(false);

    // Delete the pending game if cancelled
    if (pendingGameId) {
      await supabase.from('games').delete().eq('id', pendingGameId);
      setPendingGameId(null);
    }

    setSelectedBetType(null);
    setSelectedCurrency(null);
  };

  const handleViewHistory = () => {
    navigate('/history');
  };

  const handleViewProfile = () => {
    navigate('/profile');
  };

  const handleViewTournaments = () => {
    navigate('/tournaments');
  };

  const handlePlayPuzzles = () => {
    navigate('/puzzles');
  };

  const handleAITraining = () => {
    navigate('/ai-training');
  };

  const handleViewChallenges = () => {
    navigate('/challenges');
  };

  const handleArena = () => {
    navigate('/arena');
  };

  const handlePublicMatches = () => {
    navigate('/public-matches');
  };

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 pb-safe">
      <div className="max-w-md mx-auto px-4">
        {/* Compact Header */}
        <div className="text-center mb-6" style={{ paddingTop: 'max(env(safe-area-inset-top), 50px)' }}>
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="text-5xl">♔</div>
            <div className="text-left">
              <h1 className="text-3xl font-black text-white tracking-tight">{t('app.title')}</h1>
              <p className="text-sm text-blue-200">{t('app.subtitle')}</p>
            </div>
          </div>
        </div>

        {/* User Stats Card */}
        {user && (
          <div className="glass rounded-2xl p-4 mb-6 border border-white/20 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {user.first_name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <h3 className="text-white font-bold text-base leading-tight">{user.first_name}</h3>
                  <p className="text-blue-200 text-xs">{t('profile.rating')}: 1500 • {t('profile.level')} 5</p>
                </div>
              </div>
              <button
                onClick={handleViewProfile}
                className="text-white/70 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Main Actions - 2x2 Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Play Online */}
          <div
            onClick={handlePlayOnline}
            className="glass rounded-2xl p-4 border border-white/20 shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-2xl"></div>
            <div className="relative">
              <div className="text-4xl mb-2">🎮</div>
              <h3 className="text-white font-bold text-base mb-1">{t('menu.playOnline')}</h3>
              <p className="text-blue-200 text-xs leading-tight">{t('menu_descriptions.playOnline')}</p>
            </div>
          </div>

          {/* Play vs AI */}
          <div
            onClick={handlePlayAI}
            className="glass rounded-2xl p-4 border border-white/20 shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full blur-2xl"></div>
            <div className="relative">
              <div className="text-4xl mb-2">🤖</div>
              <h3 className="text-white font-bold text-base mb-1">{t('menu.playAI')}</h3>
              <p className="text-blue-200 text-xs leading-tight">{t('menu_descriptions.playAI')}</p>
            </div>
          </div>

          {/* Arena - Featured (MK Style) */}
          <div
            onClick={handleArena}
            className="col-span-2 glass rounded-2xl p-5 border-2 border-red-500/50 shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-orange-500/10 to-yellow-500/10"></div>
            <div className="relative flex items-center gap-4">
              <div className="text-5xl">⚔️</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-white font-black text-xl">{t('menu.arena')}</h3>
                  <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">{t('badges.hot')}</span>
                </div>
                <p className="text-orange-200 text-sm">{t('menu_descriptions.arena')}</p>
              </div>
              <svg className="w-6 h-6 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>

          {/* AI Training */}
          <div
            onClick={handleAITraining}
            className="col-span-2 glass rounded-2xl p-5 border-2 border-yellow-400/40 shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-orange-500/10 to-red-500/10"></div>
            <div className="relative flex items-center gap-4">
              <div className="text-5xl">🎓</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-white font-black text-xl">{t('menu.aiTraining')}</h3>
                  <span className="px-2 py-0.5 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full">{t('badges.new')}</span>
                </div>
                <p className="text-blue-200 text-sm">{t('menu_descriptions.aiTraining')}</p>
              </div>
              <svg className="w-6 h-6 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>

          {/* Tactical Puzzles */}
          <div
            onClick={handlePlayPuzzles}
            className="glass rounded-2xl p-4 border border-white/20 shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-full blur-2xl"></div>
            <div className="relative">
              <div className="text-4xl mb-2">🧩</div>
              <h3 className="text-white font-bold text-base mb-1">{t('menu.puzzles')}</h3>
              <p className="text-blue-200 text-xs leading-tight">{t('menu_descriptions.puzzles')}</p>
            </div>
          </div>

          {/* Tournaments */}
          <div
            onClick={handleViewTournaments}
            className="glass rounded-2xl p-4 border border-white/20 shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-yellow-500/20 to-amber-500/20 rounded-full blur-2xl"></div>
            <div className="relative">
              <div className="text-4xl mb-2">🏆</div>
              <h3 className="text-white font-bold text-base mb-1">{t('menu.tournaments')}</h3>
              <p className="text-blue-200 text-xs leading-tight">{t('menu_descriptions.tournaments')}</p>
            </div>
          </div>
        </div>

        {/* Secondary Actions - Compact List */}
        <div className="space-y-2 mb-6">
          {/* Public Matches / Spectate */}
          <div
            onClick={handlePublicMatches}
            className="glass rounded-xl p-3 border border-white/10 hover:border-white/30 transition-all cursor-pointer flex items-center gap-3"
          >
            <div className="text-2xl">👁️</div>
            <span className="text-white font-medium text-sm flex-1">{t('menu.watchLive')}</span>
            <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">{t('badges.live')}</span>
            <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>

          {/* Daily Challenges */}
          <div
            onClick={handleViewChallenges}
            className="glass rounded-xl p-3 border border-white/10 hover:border-white/30 transition-all cursor-pointer flex items-center gap-3"
          >
            <div className="text-2xl">🎯</div>
            <span className="text-white font-medium text-sm flex-1">{t('menu.challenges')}</span>
            <span className="px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded-full">{t('badges.new')}</span>
            <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>

          {/* History */}
          <div
            onClick={handleViewHistory}
            className="glass rounded-xl p-3 border border-white/10 hover:border-white/30 transition-all cursor-pointer flex items-center gap-3"
          >
            <div className="text-2xl">📚</div>
            <span className="text-white font-medium text-sm flex-1">{t('menu.history')}</span>
            <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>

          {/* Invite */}
          <div
            onClick={handleCreateInviteLink}
            className="glass rounded-xl p-3 border border-white/10 hover:border-white/30 transition-all cursor-pointer flex items-center gap-3"
          >
            <div className="text-2xl">🔗</div>
            <span className="text-white font-medium text-sm flex-1">{t('menu.shareWithFriends')}</span>
            <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>

        {/* Footer Branding */}
        <div className="text-center py-4 pb-6">
          <p className="text-white/40 text-xs">{t('footer.poweredBy')}</p>
        </div>
      </div>

      {/* Loading Overlay */}
      {isCreatingGame && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50">
          <div className="glass rounded-3xl p-8 border border-white/20 text-center max-w-xs">
            <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white text-lg font-semibold">{t('game.findingOpponent')}</p>
            <p className="text-white/60 text-sm mt-2">{t('game.waitMessage')}</p>
          </div>
        </div>
      )}

      {/* Betting Flow Popups */}
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
            selectedCurrency === 'coins' ? wallet.balance_coins : wallet.balance_stars
          }
          onConfirm={handleBetAmountConfirm}
          onCancel={handlePopupCancel}
        />
      )}
    </div>
  );
};
