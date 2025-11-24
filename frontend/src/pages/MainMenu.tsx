import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { telegramService } from '../services/telegramService';
import supabase from '../lib/supabaseClient';

export const MainMenu: React.FC = () => {
  const navigate = useNavigate();
  const { user, setCurrentGame } = useAppStore();
  const [isCreatingGame, setIsCreatingGame] = useState(false);

  const handlePlayAI = () => {
    setCurrentGame(null, 'ai');
    navigate('/ai-game');
  };

  const handlePlayOnline = async () => {
    if (!user?.id) {
      telegramService.showAlert('Необходима авторизация через Telegram');
      return;
    }

    try {
      setIsCreatingGame(true);

      // Try to join an existing waiting game
      const { data: waitingGames } = await supabase
        .from('games')
        .select('id')
        .eq('status', 'waiting')
        .neq('white_player_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1);

      if (waitingGames && waitingGames.length > 0) {
        // Join existing game
        const gameId = (waitingGames[0] as any).id;

        const { error: updateError } = await supabase
          // @ts-ignore
          .from('games')          .update({
            black_player_id: user.id,
            status: 'active',
            started_at: new Date().toISOString(),
          })
          .eq('id', gameId);

        if (updateError) throw updateError;

        setCurrentGame(gameId, 'online');
        navigate(`/online-game/${gameId}`);
      } else {
        // No players found - offer to play with AI
        setIsCreatingGame(false);

        const webApp = telegramService.getWebApp();
        webApp.showPopup({
          title: 'Нет игроков онлайн',
          message: 'Не удалось найти противника. Хотите сыграть с AI?',
          buttons: [
            { id: 'ai', type: 'default', text: 'Играть с AI' },
            { id: 'cancel', type: 'cancel', text: 'Отмена' }
          ]
        }, (buttonId: string) => {
          if (buttonId === 'ai') {
            // Redirect to AI game
            setCurrentGame(null, 'ai');
            navigate('/ai-game');
          }
        });
      }
    } catch (error) {
      console.error('Failed to create online game:', error);
      telegramService.showAlert('Не удалось создать онлайн-игру. Попробуйте позже.');
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

  const handleViewTournaments = () => {
    navigate('/tournaments');
  };

  const handlePlayPuzzles = () => {
    navigate('/puzzles');
  };

  const handleAITraining = () => {
    navigate('/ai-training');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 pt-4">
      <div className="max-w-md mx-auto px-4 py-6 pt-4">
        {/* Compact Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="text-5xl">♔</div>
            <div className="text-left">
              <h1 className="text-3xl font-black text-white tracking-tight">Chess Master</h1>
              <p className="text-sm text-blue-200">Master every move</p>
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
                  <p className="text-blue-200 text-xs">Rating: 1500 • Level 5</p>
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
              <h3 className="text-white font-bold text-base mb-1">Play Online</h3>
              <p className="text-blue-200 text-xs leading-tight">Challenge players</p>
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
              <h3 className="text-white font-bold text-base mb-1">vs AI</h3>
              <p className="text-blue-200 text-xs leading-tight">Fight Stockfish</p>
            </div>
          </div>

          {/* AI Training - Featured */}
          <div
            onClick={handleAITraining}
            className="col-span-2 glass rounded-2xl p-5 border-2 border-yellow-400/40 shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-orange-500/10 to-red-500/10"></div>
            <div className="relative flex items-center gap-4">
              <div className="text-5xl">🎓</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-white font-black text-xl">AI Training</h3>
                  <span className="px-2 py-0.5 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full">NEW</span>
                </div>
                <p className="text-blue-200 text-sm">Learn with real-time hints & analysis</p>
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
              <h3 className="text-white font-bold text-base mb-1">Puzzles</h3>
              <p className="text-blue-200 text-xs leading-tight">Solve tactics</p>
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
              <h3 className="text-white font-bold text-base mb-1">Tournaments</h3>
              <p className="text-blue-200 text-xs leading-tight">Compete now</p>
            </div>
          </div>
        </div>

        {/* Secondary Actions - Compact List */}
        <div className="space-y-2 mb-6">
          {/* History */}
          <div
            onClick={handleViewHistory}
            className="glass rounded-xl p-3 border border-white/10 hover:border-white/30 transition-all cursor-pointer flex items-center gap-3"
          >
            <div className="text-2xl">📚</div>
            <span className="text-white font-medium text-sm flex-1">Game History</span>
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
            <span className="text-white font-medium text-sm flex-1">Share with Friends</span>
            <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>

        {/* Footer Branding */}
        <div className="text-center py-4">
          <p className="text-white/40 text-xs">Powered by Stockfish 15 • Made with ♟️</p>
        </div>

        {/* Loading Overlay */}
        {isCreatingGame && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50">
            <div className="glass rounded-3xl p-8 border border-white/20 text-center max-w-xs">
              <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-white text-lg font-semibold">Finding opponent...</p>
              <p className="text-white/60 text-sm mt-2">This may take a moment</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};