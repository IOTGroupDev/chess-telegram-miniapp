import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegramBackButton } from '../hooks/useTelegramBackButton';
import { BADGES } from '../types/arena';

const ArenaStatsPage: React.FC = () => {
  const navigate = useNavigate();
  useTelegramBackButton(() => navigate('/profile'));

  // Mock user stats
  const [stats] = useState({
    username: 'ChessNinja',
    rating: 1850,
    rank: 1,
    totalMatches: 57,
    wins: 42,
    losses: 15,
    draws: 0,
    winRate: 73.7,
    currentStreak: 5,
    bestStreak: 12,
    totalSpectators: 340,
    avgSpectators: 12,
    mostSpectators: 47,
    tipsReceived: 2500,
    tournamentsWon: 3,
    tournamentsPlayed: 5,
    badges: ['gladiator', 'untouchable', 'giant_slayer', 'crowd_favorite', 'first_blood'],
    favoriteOpenings: [
      { name: 'Sicilian Defense', games: 15, winRate: 80 },
      { name: "Queen's Gambit", games: 12, winRate: 75 },
      { name: 'Italian Game', games: 10, winRate: 70 },
    ],
    recentMatches: [
      { opponent: 'RookDestroyer', result: 'win', rating: 1520, spectators: 47, date: '2h ago' },
      { opponent: 'KnightRider', result: 'win', rating: 1720, spectators: 32, date: '5h ago' },
      { opponent: 'QueenSlayer', result: 'win', rating: 1680, spectators: 28, date: '1d ago' },
      { opponent: 'BishopBoss', result: 'win', rating: 1480, spectators: 18, date: '1d ago' },
      { opponent: 'PawnStorm', result: 'loss', rating: 1590, spectators: 25, date: '2d ago' },
    ],
    ratingHistory: [
      { date: 'Week 1', rating: 1650 },
      { date: 'Week 2', rating: 1720 },
      { date: 'Week 3', rating: 1780 },
      { date: 'Week 4', rating: 1850 },
    ],
  });

  return (
    <div
      className="min-h-screen text-white"
      style={{
        backgroundColor: '#1e293b',
        paddingTop: 'max(env(safe-area-inset-top), 12px)',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))'
      }}
    >
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-black text-white mb-2 flex items-center gap-2">
            ⚔️ Arena Statistics
          </h1>
          <p className="text-slate-400 text-sm">Your complete battle record</p>
        </div>

        {/* Profile Summary */}
        <div className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 border border-purple-500/30 rounded-xl p-6 mb-6 backdrop-blur-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center text-3xl font-black border-4 border-yellow-400">
              {stats.username[0]}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-black text-white mb-1">{stats.username}</h2>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-yellow-400 font-bold">Rank #{stats.rank}</span>
                <span className="text-slate-400">•</span>
                <span className="text-green-400 font-bold">{stats.rating} Rating</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="bg-slate-800/50 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-green-400">{stats.wins}</div>
              <div className="text-xs text-slate-400">Wins</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-red-400">{stats.losses}</div>
              <div className="text-xs text-slate-400">Losses</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-orange-400">{stats.currentStreak}</div>
              <div className="text-xs text-slate-400">Streak</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-purple-400">{stats.winRate}%</div>
              <div className="text-xs text-slate-400">Win Rate</div>
            </div>
          </div>
        </div>

        {/* Badges Section */}
        <div className="bg-slate-800/50 border border-white/10 rounded-xl p-6 mb-6 backdrop-blur-sm">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            🏅 Earned Badges ({stats.badges.length})
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {stats.badges.map((badgeId) => {
              const badge = BADGES[badgeId];
              if (!badge) return null;

              const rarityColors = {
                common: 'from-slate-600 to-slate-700',
                rare: 'from-blue-600 to-cyan-700',
                epic: 'from-purple-600 to-pink-700',
                legendary: 'from-yellow-500 to-orange-600',
              };

              return (
                <div
                  key={badgeId}
                  className={`bg-gradient-to-br ${rarityColors[badge.rarity]} rounded-xl p-3 border-2 border-white/30 shadow-lg text-center`}
                >
                  <div className="text-3xl mb-1">{badge.icon}</div>
                  <div className="text-xs font-bold text-white">{badge.name}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Tournament Stats */}
          <div className="bg-slate-800/50 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              🏆 Tournament Stats
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Tournaments Won</span>
                <span className="text-xl font-bold text-yellow-400">{stats.tournamentsWon}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Tournaments Played</span>
                <span className="text-xl font-bold text-white">{stats.tournamentsPlayed}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Win Rate</span>
                <span className="text-xl font-bold text-green-400">
                  {Math.round((stats.tournamentsWon / stats.tournamentsPlayed) * 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* Spectator Stats */}
          <div className="bg-slate-800/50 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              👁️ Spectator Stats
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Total Spectators</span>
                <span className="text-xl font-bold text-blue-400">{stats.totalSpectators}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Average per Game</span>
                <span className="text-xl font-bold text-white">{stats.avgSpectators}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Most Spectators</span>
                <span className="text-xl font-bold text-purple-400">{stats.mostSpectators}</span>
              </div>
            </div>
          </div>

          {/* Streak Stats */}
          <div className="bg-slate-800/50 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              🔥 Streak Stats
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Current Streak</span>
                <span className="text-xl font-bold text-orange-400">{stats.currentStreak} 🔥</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Best Streak</span>
                <span className="text-xl font-bold text-red-400">{stats.bestStreak} 🔥🔥</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Win Rate</span>
                <span className="text-xl font-bold text-green-400">{stats.winRate}%</span>
              </div>
            </div>
          </div>

          {/* Tips Stats */}
          <div className="bg-slate-800/50 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              ⭐ Tips Received
            </h3>
            <div className="text-center">
              <div className="text-5xl font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent mb-2">
                {stats.tipsReceived}
              </div>
              <div className="text-sm text-slate-400">Total Stars Earned</div>
            </div>
          </div>
        </div>

        {/* Favorite Openings */}
        <div className="bg-slate-800/50 border border-white/10 rounded-xl p-6 mb-6 backdrop-blur-sm">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            📖 Favorite Openings
          </h3>
          <div className="space-y-3">
            {stats.favoriteOpenings.map((opening, index) => (
              <div key={opening.name} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="text-white font-bold">{opening.name}</div>
                  <div className="text-xs text-slate-400">{opening.games} games</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-400">{opening.winRate}%</div>
                  <div className="text-xs text-slate-400">win rate</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Matches */}
        <div className="bg-slate-800/50 border border-white/10 rounded-xl p-6 mb-6 backdrop-blur-sm">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            ⚔️ Recent Battles
          </h3>
          <div className="space-y-2">
            {stats.recentMatches.map((match, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  match.result === 'win'
                    ? 'bg-green-900/20 border-green-500/30'
                    : 'bg-red-900/20 border-red-500/30'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      match.result === 'win' ? 'bg-green-600' : 'bg-red-600'
                    }`}
                  >
                    {match.result === 'win' ? '✓' : '✗'}
                  </div>
                  <div>
                    <div className="text-white font-bold">vs {match.opponent}</div>
                    <div className="text-xs text-slate-400">
                      {match.rating} rating • {match.spectators} 👁️ • {match.date}
                    </div>
                  </div>
                </div>
                <div className={`font-bold uppercase text-sm ${
                  match.result === 'win' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {match.result}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rating Progress Chart */}
        <div className="bg-slate-800/50 border border-white/10 rounded-xl p-6 mb-6 backdrop-blur-sm">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            📈 Rating Progress
          </h3>
          <div className="space-y-3">
            {stats.ratingHistory.map((entry, index) => (
              <div key={entry.date} className="flex items-center gap-3">
                <div className="w-20 text-sm text-slate-400">{entry.date}</div>
                <div className="flex-1">
                  <div className="h-8 bg-slate-700 rounded-lg overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-end pr-2"
                      style={{ width: `${(entry.rating / 2000) * 100}%` }}
                    >
                      <span className="text-white font-bold text-sm">{entry.rating}</span>
                    </div>
                  </div>
                </div>
                {index < stats.ratingHistory.length - 1 && (
                  <div className="text-green-400 font-bold text-sm">
                    +{stats.ratingHistory[index + 1].rating - entry.rating}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/arena')}
            className="flex-1 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold py-3 rounded-xl transition-all active:scale-95"
          >
            ⚔️ Back to Arena
          </button>
          <button
            onClick={() => navigate('/leaderboard')}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-3 rounded-xl transition-all active:scale-95"
          >
            🏆 View Leaderboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArenaStatsPage;
