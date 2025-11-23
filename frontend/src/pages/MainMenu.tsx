import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { useAppStore } from '../store/useAppStore';
import { telegramService } from '../services/telegramService';
import supabase from '../lib/supabase';

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
        const gameId = waitingGames[0].id;

        const { error: updateError } = await supabase
          .from('games')
          .update({
            black_player_id: user.id,
            status: 'active',
            started_at: new Date().toISOString(),
          })
          .eq('id', gameId);

        if (updateError) throw updateError;

        setCurrentGame(gameId, 'online');
        navigate(`/online-game/${gameId}`);
      } else {
        // Create new waiting game
        const { data: newGame, error: createError } = await supabase
          .from('games')
          .insert({
            white_player_id: user.id,
            time_control: 'blitz',
            time_limit: 300, // 5 minutes
            time_increment: 3, // 3 seconds per move
            status: 'waiting',
          })
          .select()
          .single();

        if (createError) throw createError;

        setCurrentGame(newGame.id, 'online');
        navigate(`/online-game/${newGame.id}`);
      }
    } catch (error) {
      console.error('Failed to create online game:', error);
      telegramService.showAlert('Не удалось создать онлайн-игру. Попробуйте позже.');
    } finally {
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

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-12 animate-slide-in-down">
          <div className="inline-block p-6 rounded-3xl glass mb-6">
            <h1 className="text-6xl font-black text-white mb-2 drop-shadow-2xl">♔</h1>
            <h2 className="text-3xl font-bold text-white mb-2">Chess Master</h2>
            <p className="text-white/80 text-lg">Challenge your mind, master the game</p>
          </div>
        </div>

        {/* User Welcome */}
        {user && (
          <div className="game-card mb-8 animate-fade-in">
            <div className="flex items-center space-x-4">
              <div className="player-avatar">
                {user.first_name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Welcome back!</h3>
                <p className="text-white/70">{user.first_name} {user.last_name}</p>
              </div>
            </div>
          </div>
        )}

        {/* Game Options */}
        <div className="space-y-6 animate-slide-in-up">
          <div className="menu-card" onClick={handlePlayOnline}>
            <div className="flex items-center space-x-4">
              <div className="text-4xl">🎮</div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-xl mb-1">Play Online</h3>
                <p className="text-white/70">Challenge players worldwide</p>
              </div>
              <div className="text-2xl text-white/50">→</div>
            </div>
          </div>

          <div className="menu-card" onClick={handlePlayAI}>
            <div className="flex items-center space-x-4">
              <div className="text-4xl">🤖</div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-xl mb-1">Play vs AI</h3>
                <p className="text-white/70">Test your skills against Stockfish</p>
              </div>
              <div className="text-2xl text-white/50">→</div>
            </div>
          </div>

          <div className="menu-card" onClick={handleCreateInviteLink}>
            <div className="flex items-center space-x-4">
              <div className="text-4xl">🔗</div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-xl mb-1">Create Invite</h3>
                <p className="text-white/70">Share game with friends</p>
              </div>
              <div className="text-2xl text-white/50">→</div>
            </div>
          </div>

          <div className="menu-card" onClick={handleViewHistory}>
            <div className="flex items-center space-x-4">
              <div className="text-4xl">📚</div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-xl mb-1">Game History</h3>
                <p className="text-white/70">Review your past games</p>
              </div>
              <div className="text-2xl text-white/50">→</div>
            </div>
          </div>

          <div className="menu-card" onClick={handleViewProfile}>
            <div className="flex items-center space-x-4">
              <div className="text-4xl">👤</div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-xl mb-1">Profile</h3>
                <p className="text-white/70">View your statistics</p>
              </div>
              <div className="text-2xl text-white/50">→</div>
            </div>
          </div>
        </div>

        {/* Loading Overlay */}
        {isCreatingGame && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="glass rounded-3xl p-8 text-center">
              <div className="spinner w-12 h-12 mx-auto mb-4"></div>
              <p className="text-white text-lg">Searching for game...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};