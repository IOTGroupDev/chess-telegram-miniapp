import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegramBackButton } from '../hooks/useTelegramBackButton';
import { telegramService } from '../services/telegramService';
import type { PlayerStats } from '../types/arena';
import { BADGES } from '../types/arena';

const LeaderboardPage: React.FC = () => {
  const navigate = useNavigate();
  useTelegramBackButton(() => navigate('/arena'));

  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'alltime'>('weekly');
  const [selectedCategory, setSelectedCategory] = useState<'rating' | 'wins' | 'streak'>('rating');

  // Mock leaderboard data
  const [players] = useState<PlayerStats[]>([
    { userId: 1, username: 'ChessNinja', rating: 1850, publicWins: 42, publicLosses: 15, winStreak: 5, bestWinStreak: 12, totalSpectators: 340, badges: ['gladiator', 'untouchable', 'giant_slayer'], tipsReceived: 2500 },
    { userId: 2, username: 'KnightRider', rating: 1720, publicWins: 28, publicLosses: 22, winStreak: 2, bestWinStreak: 7, totalSpectators: 180, badges: ['gladiator', 'first_blood'], tipsReceived: 1200 },
    { userId: 3, username: 'QueenSlayer', rating: 1680, publicWins: 35, publicLosses: 30, winStreak: 0, bestWinStreak: 9, totalSpectators: 250, badges: ['gladiator', 'speedrun_master', 'comeback_king'], tipsReceived: 1800 },
    { userId: 4, username: 'PawnStorm', rating: 1590, publicWins: 20, publicLosses: 18, winStreak: 3, bestWinStreak: 6, totalSpectators: 120, badges: ['first_blood'], tipsReceived: 600 },
    { userId: 5, username: 'RookDestroyer', rating: 1520, publicWins: 18, publicLosses: 25, winStreak: 1, bestWinStreak: 5, totalSpectators: 90, badges: ['first_blood', 'speedrun_master'], tipsReceived: 450 },
    { userId: 6, username: 'BishopBoss', rating: 1480, publicWins: 15, publicLosses: 20, winStreak: 0, bestWinStreak: 4, totalSpectators: 75, badges: ['first_blood'], tipsReceived: 300 },
    { userId: 7, username: 'CheckMate99', rating: 1420, publicWins: 12, publicLosses: 15, winStreak: 2, bestWinStreak: 4, totalSpectators: 60, badges: [], tipsReceived: 150 },
    { userId: 8, username: 'Rookie2024', rating: 1350, publicWins: 8, publicLosses: 12, winStreak: 0, bestWinStreak: 3, totalSpectators: 45, badges: [], tipsReceived: 80 },
    { userId: 9, username: 'TacticMaster', rating: 1290, publicWins: 6, publicLosses: 14, winStreak: 0, bestWinStreak: 2, totalSpectators: 30, badges: [], tipsReceived: 50 },
    { userId: 10, username: 'Beginner123', rating: 1200, publicWins: 4, publicLosses: 16, winStreak: 0, bestWinStreak: 1, totalSpectators: 20, badges: [], tipsReceived: 20 },
  ]);

  const getSortedPlayers = () => {
    const sorted = [...players];
    if (selectedCategory === 'rating') {
      sorted.sort((a, b) => b.rating - a.rating);
    } else if (selectedCategory === 'wins') {
      sorted.sort((a, b) => b.publicWins - a.publicWins);
    } else if (selectedCategory === 'streak') {
      sorted.sort((a, b) => b.bestWinStreak - a.bestWinStreak);
    }
    return sorted;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'from-yellow-500 to-orange-600';
    if (rank === 2) return 'from-gray-300 to-gray-500';
    if (rank === 3) return 'from-orange-500 to-orange-700';
    return 'from-slate-700 to-slate-800';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '👑';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const handleViewProfile = (userId: number) => {
    telegramService.showAlert(`Viewing profile for user ${userId}`);
  };

  const sortedPlayers = getSortedPlayers();

  return (
    <div
      className="min-h-screen text-white"
      style={{
        backgroundColor: '#0a0a0a',
        paddingTop: 'max(env(safe-area-inset-top), 12px)',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))'
      }}
    >
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 bg-clip-text text-transparent">
            🏆 LEADERBOARD 🏆
          </h1>
          <p className="text-slate-400 text-sm">Top warriors of the Arena</p>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2 mb-4 justify-center">
          {(['daily', 'weekly', 'alltime'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-4 py-2 rounded-xl font-bold text-sm uppercase tracking-wide transition-all ${
                selectedPeriod === period
                  ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
              }`}
            >
              {period === 'daily' && '📅 Daily'}
              {period === 'weekly' && '📆 Weekly'}
              {period === 'alltime' && '♾️ All Time'}
            </button>
          ))}
        </div>

        {/* Category Selector */}
        <div className="flex gap-2 mb-6 justify-center">
          {(['rating', 'wins', 'streak'] as const).map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                selectedCategory === category
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
              }`}
            >
              {category === 'rating' && '⭐ Rating'}
              {category === 'wins' && '🎯 Wins'}
              {category === 'streak' && '🔥 Streak'}
            </button>
          ))}
        </div>

        {/* Top 3 Podium */}
        <div className="mb-8">
          <div className="grid grid-cols-3 gap-3 items-end mb-6">
            {/* 2nd Place */}
            {sortedPlayers[1] && (
              <div className="text-center">
                <div className="bg-gradient-to-br from-gray-300 to-gray-500 rounded-2xl p-4 border-2 border-gray-400 mb-2 h-32 flex flex-col justify-end">
                  <div className="text-4xl mb-2">🥈</div>
                  <div className="text-xs font-bold text-white truncate">{sortedPlayers[1].username}</div>
                  <div className="text-lg font-black text-white">
                    {selectedCategory === 'rating' && sortedPlayers[1].rating}
                    {selectedCategory === 'wins' && sortedPlayers[1].publicWins}
                    {selectedCategory === 'streak' && sortedPlayers[1].bestWinStreak}
                  </div>
                </div>
                <div className="text-xs text-slate-400">{sortedPlayers[1].badges.length} badges</div>
              </div>
            )}

            {/* 1st Place */}
            {sortedPlayers[0] && (
              <div className="text-center">
                <div className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl p-4 border-2 border-yellow-400 mb-2 h-40 flex flex-col justify-end relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 via-orange-500/20 to-red-500/20 animate-pulse"></div>
                  <div className="relative z-10">
                    <div className="text-5xl mb-2 animate-bounce">👑</div>
                    <div className="text-sm font-bold text-white truncate">{sortedPlayers[0].username}</div>
                    <div className="text-2xl font-black text-white">
                      {selectedCategory === 'rating' && sortedPlayers[0].rating}
                      {selectedCategory === 'wins' && sortedPlayers[0].publicWins}
                      {selectedCategory === 'streak' && sortedPlayers[0].bestWinStreak}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-yellow-400 font-bold">CHAMPION • {sortedPlayers[0].badges.length} badges</div>
              </div>
            )}

            {/* 3rd Place */}
            {sortedPlayers[2] && (
              <div className="text-center">
                <div className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl p-4 border-2 border-orange-600 mb-2 h-28 flex flex-col justify-end">
                  <div className="text-4xl mb-2">🥉</div>
                  <div className="text-xs font-bold text-white truncate">{sortedPlayers[2].username}</div>
                  <div className="text-lg font-black text-white">
                    {selectedCategory === 'rating' && sortedPlayers[2].rating}
                    {selectedCategory === 'wins' && sortedPlayers[2].publicWins}
                    {selectedCategory === 'streak' && sortedPlayers[2].bestWinStreak}
                  </div>
                </div>
                <div className="text-xs text-slate-400">{sortedPlayers[2].badges.length} badges</div>
              </div>
            )}
          </div>
        </div>

        {/* Rest of Rankings */}
        <div className="space-y-2">
          {sortedPlayers.slice(3).map((player, index) => {
            const rank = index + 4;
            return (
              <div
                key={player.userId}
                onClick={() => handleViewProfile(player.userId)}
                className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div className="w-12 text-center">
                    <div
                      className={`
                        inline-flex items-center justify-center
                        w-10 h-10 rounded-full
                        bg-gradient-to-br ${getRankColor(rank)}
                        text-lg font-black
                      `}
                    >
                      {getRankIcon(rank)}
                    </div>
                  </div>

                  {/* Avatar & Name */}
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-lg">
                      {player.username[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-bold truncate flex items-center gap-2">
                        {player.username}
                        {player.winStreak > 0 && (
                          <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">
                            🔥 {player.winStreak}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">
                        {player.publicWins}W - {player.publicLosses}L
                      </div>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex gap-1">
                    {player.badges.slice(0, 3).map((badgeId) => {
                      const badge = BADGES[badgeId];
                      return badge ? (
                        <span key={badgeId} className="text-lg" title={badge.name}>
                          {badge.icon}
                        </span>
                      ) : null;
                    })}
                    {player.badges.length > 3 && (
                      <span className="text-xs text-slate-400">+{player.badges.length - 3}</span>
                    )}
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    <div className="text-xl font-black text-white">
                      {selectedCategory === 'rating' && player.rating}
                      {selectedCategory === 'wins' && player.publicWins}
                      {selectedCategory === 'streak' && player.bestWinStreak}
                    </div>
                    <div className="text-xs text-slate-400">
                      {selectedCategory === 'rating' && 'Rating'}
                      {selectedCategory === 'wins' && 'Wins'}
                      {selectedCategory === 'streak' && 'Best'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Your Rank Card */}
        <div className="mt-6 bg-gradient-to-br from-purple-900/40 to-blue-900/40 border-2 border-purple-500/50 rounded-xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-purple-300 mb-1">Your Rank</div>
              <div className="text-3xl font-black text-white">#15</div>
            </div>
            <button
              onClick={() => navigate('/profile')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold px-6 py-3 rounded-xl transition-all active:scale-95"
            >
              View Profile
            </button>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/arena')}
            className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold px-8 py-3 rounded-xl transition-all active:scale-95"
          >
            ⚔️ Back to Arena
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPage;
