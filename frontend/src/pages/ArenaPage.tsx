import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegramBackButton } from '../hooks/useTelegramBackButton';
import { telegramService } from '../services/telegramService';
import type { Tournament, TournamentMatch } from '../types/arena';

const ArenaPage: React.FC = () => {
  const navigate = useNavigate();
  useTelegramBackButton(() => navigate('/main'));

  // Mock tournament data (в стиле Mortal Kombat ladder)
  const [tournament] = useState<Tournament>({
    id: 'mk-ladder-1',
    name: 'MORTAL CHESS',
    type: 'ladder',
    status: 'active',
    entryFee: 100,
    prizePool: 1000,
    maxPlayers: 8,
    currentPlayers: 8,
    participants: [
      { userId: 1, username: 'ChessNinja', rating: 1850, publicWins: 42, publicLosses: 15, winStreak: 5, bestWinStreak: 12, totalSpectators: 340, badges: [], tipsReceived: 0 },
      { userId: 2, username: 'KnightRider', rating: 1720, publicWins: 28, publicLosses: 22, winStreak: 2, bestWinStreak: 7, totalSpectators: 180, badges: [], tipsReceived: 0 },
      { userId: 3, username: 'QueenSlayer', rating: 1680, publicWins: 35, publicLosses: 30, winStreak: 0, bestWinStreak: 9, totalSpectators: 250, badges: [], tipsReceived: 0 },
      { userId: 4, username: 'PawnStorm', rating: 1590, publicWins: 20, publicLosses: 18, winStreak: 3, bestWinStreak: 6, totalSpectators: 120, badges: [], tipsReceived: 0 },
      { userId: 5, username: 'RookDestroyer', rating: 1520, publicWins: 18, publicLosses: 25, winStreak: 1, bestWinStreak: 5, totalSpectators: 90, badges: [], tipsReceived: 0 },
      { userId: 6, username: 'BishopBoss', rating: 1480, publicWins: 15, publicLosses: 20, winStreak: 0, bestWinStreak: 4, totalSpectators: 75, badges: [], tipsReceived: 0 },
      { userId: 7, username: 'CheckMate99', rating: 1420, publicWins: 12, publicLosses: 15, winStreak: 2, bestWinStreak: 4, totalSpectators: 60, badges: [], tipsReceived: 0 },
      { userId: 8, username: 'Rookie2024', rating: 1350, publicWins: 8, publicLosses: 12, winStreak: 0, bestWinStreak: 3, totalSpectators: 45, badges: [], tipsReceived: 0 },
    ],
    matches: [
      // Quarter Finals
      { id: 'm1', round: 1, position: 0, player1: { id: 1, username: 'ChessNinja', rating: 1850 }, player2: { id: 8, username: 'Rookie2024', rating: 1350 }, winner: 1, status: 'finished' },
      { id: 'm2', round: 1, position: 1, player1: { id: 4, username: 'PawnStorm', rating: 1590 }, player2: { id: 5, username: 'RookDestroyer', rating: 1520 }, winner: 4, status: 'finished' },
      { id: 'm3', round: 1, position: 2, player1: { id: 2, username: 'KnightRider', rating: 1720 }, player2: { id: 7, username: 'CheckMate99', rating: 1420 }, winner: 2, status: 'finished' },
      { id: 'm4', round: 1, position: 3, player1: { id: 3, username: 'QueenSlayer', rating: 1680 }, player2: { id: 6, username: 'BishopBoss', rating: 1480 }, winner: 3, status: 'finished' },

      // Semi Finals
      { id: 'm5', round: 2, position: 0, player1: { id: 1, username: 'ChessNinja', rating: 1850 }, player2: { id: 4, username: 'PawnStorm', rating: 1590 }, winner: 1, status: 'finished' },
      { id: 'm6', round: 2, position: 1, player1: { id: 2, username: 'KnightRider', rating: 1720 }, player2: { id: 3, username: 'QueenSlayer', rating: 1680 }, status: 'active' },

      // Finals
      { id: 'm7', round: 3, position: 0, player1: { id: 1, username: 'ChessNinja', rating: 1850 }, status: 'pending' },
    ],
    startTime: new Date(),
  });

  const [selectedTab, setSelectedTab] = useState<'bracket' | 'matches' | 'leaderboard'>('bracket');

  const handleJoinArena = () => {
    telegramService.showAlert('Arena matches coming soon! 🎮');
  };

  const handleSpectate = (matchId: string) => {
    telegramService.showAlert(`Spectating match ${matchId}... 👀`);
  };

  const getRarityColor = (position: number) => {
    if (position === 0) return 'from-yellow-500 to-orange-600'; // Champion
    if (position <= 2) return 'from-purple-500 to-pink-600'; // Top 3
    if (position <= 4) return 'from-blue-500 to-cyan-600'; // Top 5
    return 'from-slate-600 to-slate-700';
  };

  const MatchCard = ({ match, roundName }: { match: TournamentMatch; roundName: string }) => (
    <div className="relative">
      <div className="bg-slate-800/90 border-2 border-red-500/50 rounded-xl p-3 backdrop-blur-sm relative overflow-hidden">
        {/* MK Style Background Effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-orange-500/5 to-yellow-500/5"></div>

        <div className="relative z-10">
          <div className="text-xs text-red-400 font-bold mb-2 text-center uppercase tracking-wider">
            {roundName}
          </div>

          {/* Player 1 */}
          {match.player1 && (
            <div className={`flex items-center justify-between p-2 rounded-lg mb-1 ${
              match.winner === match.player1.id ? 'bg-gradient-to-r from-green-600/30 to-emerald-600/30 border border-green-500/50' : 'bg-slate-700/50'
            }`}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold">
                  {match.player1.username[0]}
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{match.player1.username}</div>
                  <div className="text-xs text-slate-400">{match.player1.rating}</div>
                </div>
              </div>
              {match.winner === match.player1.id && (
                <span className="text-xl">👑</span>
              )}
            </div>
          )}

          {/* VS Divider */}
          <div className="text-center py-1">
            <span className="text-red-500 font-black text-sm">VS</span>
          </div>

          {/* Player 2 */}
          {match.player2 ? (
            <div className={`flex items-center justify-between p-2 rounded-lg ${
              match.winner === match.player2.id ? 'bg-gradient-to-r from-green-600/30 to-emerald-600/30 border border-green-500/50' : 'bg-slate-700/50'
            }`}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-xs font-bold">
                  {match.player2.username[0]}
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{match.player2.username}</div>
                  <div className="text-xs text-slate-400">{match.player2.rating}</div>
                </div>
              </div>
              {match.winner === match.player2.id && (
                <span className="text-xl">👑</span>
              )}
            </div>
          ) : (
            <div className="p-2 rounded-lg bg-slate-700/30 border border-dashed border-slate-600">
              <div className="text-sm text-slate-500 text-center">Awaiting Winner</div>
            </div>
          )}

          {/* Match Status */}
          {match.status === 'active' && (
            <button
              onClick={() => handleSpectate(match.id)}
              className="mt-2 w-full bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold py-2 rounded-lg text-xs hover:from-red-500 hover:to-orange-500 transition-all active:scale-95"
            >
              🔴 WATCH LIVE
            </button>
          )}
        </div>
      </div>
    </div>
  );

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
        {/* Epic Header - MK Style */}
        <div className="mb-6 text-center relative">
          <div className="absolute inset-0 bg-gradient-to-b from-red-600/20 via-orange-500/10 to-transparent blur-3xl"></div>
          <div className="relative">
            <h1 className="text-5xl font-black mb-2 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent">
              ⚔️ ARENA ⚔️
            </h1>
            <p className="text-sm text-red-400 uppercase tracking-widest font-bold">
              Mortal Chess Championship
            </p>
          </div>
        </div>

        {/* Tournament Info Card */}
        <div className="bg-gradient-to-br from-red-900/30 to-orange-900/20 border-2 border-red-500/50 rounded-xl p-4 mb-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xl font-black text-white mb-1">{tournament.name}</h2>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-yellow-400">💰 {tournament.prizePool} Stars Prize</span>
                <span className="text-slate-400">•</span>
                <span className="text-green-400">👥 {tournament.currentPlayers}/{tournament.maxPlayers}</span>
              </div>
            </div>
            <button
              onClick={handleJoinArena}
              className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-black px-6 py-3 rounded-xl transition-all active:scale-95 shadow-lg"
            >
              JOIN ARENA
              <div className="text-xs opacity-80">{tournament.entryFee} ⭐</div>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['bracket', 'matches', 'leaderboard'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm uppercase tracking-wide transition-all ${
                selectedTab === tab
                  ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
              }`}
            >
              {tab === 'bracket' && '🏆 Bracket'}
              {tab === 'matches' && '⚔️ Matches'}
              {tab === 'leaderboard' && '📊 Ranks'}
            </button>
          ))}
        </div>

        {/* Tournament Bracket */}
        {selectedTab === 'bracket' && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <div className="inline-block bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-black px-6 py-2 rounded-full text-sm uppercase">
                Ladder Tournament - Climb to Victory!
              </div>
            </div>

            {/* Quarter Finals */}
            <div>
              <h3 className="text-lg font-black text-red-400 mb-3 uppercase tracking-wider">⚔️ Quarter Finals</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {tournament.matches.filter(m => m.round === 1).map((match) => (
                  <MatchCard key={match.id} match={match} roundName="Quarter Final" />
                ))}
              </div>
            </div>

            {/* Semi Finals */}
            <div>
              <h3 className="text-lg font-black text-orange-400 mb-3 uppercase tracking-wider">🔥 Semi Finals</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {tournament.matches.filter(m => m.round === 2).map((match) => (
                  <MatchCard key={match.id} match={match} roundName="Semi Final" />
                ))}
              </div>
            </div>

            {/* Finals */}
            <div>
              <h3 className="text-lg font-black text-yellow-400 mb-3 uppercase tracking-wider">👑 Grand Final</h3>
              <div className="max-w-md mx-auto">
                {tournament.matches.filter(m => m.round === 3).map((match) => (
                  <MatchCard key={match.id} match={match} roundName="Championship Match" />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Active Matches */}
        {selectedTab === 'matches' && (
          <div className="space-y-3">
            {tournament.matches.filter(m => m.status === 'active').map((match) => (
              <div key={match.id} className="bg-slate-800/50 border border-red-500/50 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                    <span className="text-red-400 font-bold text-sm">LIVE NOW</span>
                  </div>
                  <span className="text-xs text-slate-400">Round {match.round}</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-white font-bold">{match.player1?.username}</div>
                  <span className="text-red-500 font-black">VS</span>
                  <div className="text-white font-bold">{match.player2?.username}</div>
                </div>
                <button
                  onClick={() => handleSpectate(match.id)}
                  className="mt-3 w-full bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold py-2 rounded-lg hover:from-red-500 hover:to-orange-500 transition-all active:scale-95"
                >
                  👁️ SPECTATE BATTLE
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Leaderboard */}
        {selectedTab === 'leaderboard' && (
          <div className="space-y-2">
            {tournament.participants
              .sort((a, b) => b.rating - a.rating)
              .map((player, index) => (
                <div
                  key={player.userId}
                  className={`bg-gradient-to-r ${getRarityColor(index)} p-4 rounded-xl border-2 ${
                    index === 0 ? 'border-yellow-400' : 'border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`text-2xl font-black ${
                        index === 0 ? 'text-yellow-400' :
                        index === 1 ? 'text-gray-300' :
                        index === 2 ? 'text-orange-400' :
                        'text-white'
                      }`}>
                        #{index + 1}
                      </div>
                      <div>
                        <div className="text-white font-bold flex items-center gap-2">
                          {player.username}
                          {index === 0 && <span className="text-xl">👑</span>}
                        </div>
                        <div className="text-xs text-white/70">
                          {player.publicWins}W - {player.publicLosses}L • {player.winStreak} streak 🔥
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-black text-white">{player.rating}</div>
                      <div className="text-xs text-white/70">{player.totalSpectators} 👁️</div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Call to Action */}
        <div className="mt-8 bg-gradient-to-br from-red-900/40 to-orange-900/40 border-2 border-red-500/50 rounded-xl p-6 text-center backdrop-blur-sm">
          <div className="text-3xl mb-2">⚡</div>
          <h3 className="text-xl font-black text-white mb-2">READY TO FIGHT?</h3>
          <p className="text-sm text-slate-300 mb-4">
            Climb the ladder, defeat all opponents, and claim the championship!
          </p>
          <button
            onClick={handleJoinArena}
            className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-black px-8 py-3 rounded-xl transition-all active:scale-95 shadow-lg"
          >
            ENTER THE ARENA
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArenaPage;
