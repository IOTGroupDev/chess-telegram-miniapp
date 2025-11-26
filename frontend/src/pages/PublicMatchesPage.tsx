import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegramBackButton } from '../hooks/useTelegramBackButton';
import { telegramService } from '../services/telegramService';
import type { PublicMatch } from '../types/arena';

const PublicMatchesPage: React.FC = () => {
  const navigate = useNavigate();
  useTelegramBackButton(() => navigate('/main'));

  // Mock public matches data
  const [publicMatches] = useState<PublicMatch[]>([
    {
      id: 'pub-1',
      whitePlayer: { id: 1, username: 'ChessNinja', rating: 1850 },
      blackPlayer: { id: 5, username: 'RookDestroyer', rating: 1520 },
      status: 'active',
      spectatorCount: 47,
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      currentTurn: 'white',
      startedAt: new Date(Date.now() - 5 * 60 * 1000),
    },
    {
      id: 'pub-2',
      whitePlayer: { id: 2, username: 'KnightRider', rating: 1720 },
      blackPlayer: { id: 3, username: 'QueenSlayer', rating: 1680 },
      status: 'active',
      spectatorCount: 32,
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      currentTurn: 'black',
      startedAt: new Date(Date.now() - 12 * 60 * 1000),
    },
    {
      id: 'pub-3',
      whitePlayer: { id: 7, username: 'CheckMate99', rating: 1420 },
      blackPlayer: { id: 8, username: 'Rookie2024', rating: 1350 },
      status: 'active',
      spectatorCount: 18,
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      currentTurn: 'white',
      startedAt: new Date(Date.now() - 3 * 60 * 1000),
    },
  ]);

  const [, setSelectedMatch] = useState<PublicMatch | null>(null);

  const handleSpectate = (match: PublicMatch) => {
    setSelectedMatch(match);
    telegramService.showAlert(`Joining as spectator... 👁️\n\n${match.whitePlayer.username} vs ${match.blackPlayer.username}`);
  };

  const handleCreatePublicMatch = () => {
    telegramService.showAlert('Creating public match... 🎮\n\nYour match will be open for spectators!');
  };

  const getElapsedTime = (startTime: Date) => {
    const minutes = Math.floor((Date.now() - startTime.getTime()) / 60000);
    return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  };

  const getRatingDiff = (r1: number, r2: number) => {
    const diff = Math.abs(r1 - r2);
    if (diff < 50) return '⚖️ Even';
    if (diff < 150) return '⚔️ Close';
    return '🔥 Upset Alert';
  };

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
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-black text-white mb-1 flex items-center gap-2">
                👁️ Live Matches
              </h1>
              <p className="text-sm text-slate-400">Watch the best battles in real-time</p>
            </div>
            <button
              onClick={handleCreatePublicMatch}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold px-4 py-2 rounded-xl transition-all active:scale-95 text-sm"
            >
              ➕ Host Match
            </button>
          </div>

          {/* Stats Bar */}
          <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-center justify-around">
              <div className="text-center">
                <div className="text-2xl font-black text-green-400">{publicMatches.length}</div>
                <div className="text-xs text-slate-400">Live Games</div>
              </div>
              <div className="w-px h-8 bg-white/10"></div>
              <div className="text-center">
                <div className="text-2xl font-black text-blue-400">
                  {publicMatches.reduce((sum, m) => sum + m.spectatorCount, 0)}
                </div>
                <div className="text-xs text-slate-400">Spectators</div>
              </div>
              <div className="w-px h-8 bg-white/10"></div>
              <div className="text-center">
                <div className="text-2xl font-black text-purple-400">1.2K</div>
                <div className="text-xs text-slate-400">Today</div>
              </div>
            </div>
          </div>
        </div>

        {/* Featured Match */}
        {publicMatches[0] && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-yellow-400 text-xl">⭐</span>
              <h2 className="text-lg font-bold text-white">Featured Match</h2>
            </div>
            <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/20 border-2 border-purple-500/50 rounded-xl p-5 backdrop-blur-sm relative overflow-hidden">
              {/* Background glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-orange-500/10"></div>

              <div className="relative z-10">
                {/* Live indicator */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                  <span className="text-red-400 font-bold text-sm uppercase">Live Now</span>
                  <span className="text-slate-400 text-sm">• {getElapsedTime(publicMatches[0].startedAt)}</span>
                </div>

                {/* Players */}
                <div className="grid grid-cols-3 gap-3 items-center mb-4">
                  {/* White Player */}
                  <div className="bg-slate-800/80 rounded-xl p-3 border border-white/10">
                    <div className="flex flex-col items-center text-center">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center text-xl font-black mb-2 border-2 border-white">
                        {publicMatches[0].whitePlayer.username[0]}
                      </div>
                      <div className="text-sm font-bold text-white mb-1 truncate max-w-full">
                        {publicMatches[0].whitePlayer.username}
                      </div>
                      <div className="text-xs text-yellow-400 font-bold">
                        {publicMatches[0].whitePlayer.rating}
                      </div>
                    </div>
                  </div>

                  {/* VS in middle */}
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-3xl">⚔️</span>
                    <span className="text-red-500 font-black text-sm">VS</span>
                    <div className="text-xs text-slate-400">
                      {getRatingDiff(publicMatches[0].whitePlayer.rating, publicMatches[0].blackPlayer.rating)}
                    </div>
                  </div>

                  {/* Black Player */}
                  <div className="bg-slate-800/80 rounded-xl p-3 border border-white/10">
                    <div className="flex flex-col items-center text-center">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-xl font-black mb-2 border-2 border-slate-600">
                        {publicMatches[0].blackPlayer.username[0]}
                      </div>
                      <div className="text-sm font-bold text-white mb-1 truncate max-w-full">
                        {publicMatches[0].blackPlayer.username}
                      </div>
                      <div className="text-xs text-yellow-400 font-bold">
                        {publicMatches[0].blackPlayer.rating}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Spectators and CTA */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <span className="text-lg">👁️</span>
                    <span className="font-bold text-white">{publicMatches[0].spectatorCount}</span>
                    <span>watching</span>
                  </div>
                  <button
                    onClick={() => handleSpectate(publicMatches[0])}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black py-3 px-6 rounded-xl transition-all active:scale-95 shadow-lg"
                  >
                    🔴 WATCH NOW
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Other Live Matches */}
        <div>
          <h2 className="text-lg font-bold text-white mb-3">All Live Matches</h2>
          <div className="space-y-3">
            {publicMatches.map((match) => (
              <div
                key={match.id}
                className="bg-slate-800/50 border border-white/10 rounded-xl p-4 backdrop-blur-sm hover:border-white/20 transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-green-400 font-bold text-xs uppercase">Live</span>
                    <span className="text-slate-500 text-xs">•</span>
                    <span className="text-slate-400 text-xs">{getElapsedTime(match.startedAt)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-400 text-xs">
                    <span>👁️</span>
                    <span className="font-bold text-white">{match.spectatorCount}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  {/* White */}
                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center text-sm font-bold border border-white/30">
                      {match.whitePlayer.username[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white truncate">
                        {match.whitePlayer.username}
                      </div>
                      <div className="text-xs text-slate-400">{match.whitePlayer.rating}</div>
                    </div>
                  </div>

                  {/* VS */}
                  <div className="text-red-500 font-black text-xs">VS</div>

                  {/* Black */}
                  <div className="flex items-center gap-2 flex-1 flex-row-reverse">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-sm font-bold border border-slate-600">
                      {match.blackPlayer.username[0]}
                    </div>
                    <div className="flex-1 min-w-0 text-right">
                      <div className="text-sm font-bold text-white truncate">
                        {match.blackPlayer.username}
                      </div>
                      <div className="text-xs text-slate-400">{match.blackPlayer.rating}</div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleSpectate(match)}
                  className="mt-3 w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded-lg transition-all active:scale-95 text-sm"
                >
                  👁️ Watch
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-6 bg-gradient-to-br from-blue-900/30 to-purple-900/20 border border-blue-500/30 rounded-xl p-6 text-center backdrop-blur-sm">
          <div className="text-3xl mb-2">🎮</div>
          <h3 className="text-lg font-bold text-white mb-2">Want to Play Publicly?</h3>
          <p className="text-sm text-slate-300 mb-4">
            Host your own public match and show your skills to the world!
          </p>
          <button
            onClick={handleCreatePublicMatch}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold px-8 py-3 rounded-xl transition-all active:scale-95"
          >
            Create Public Match
          </button>
        </div>
      </div>
    </div>
  );
};

export default PublicMatchesPage;
