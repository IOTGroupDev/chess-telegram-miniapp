import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { telegramService } from '../services/telegramService';
import { useTelegramBackButton } from '../hooks/useTelegramBackButton';
import { ThemeSelector } from '../components/ThemeSelector';
import { SoundSettings } from '../components/SoundSettings';
import { AchievementsDisplay } from '../components/AchievementsDisplay';
import { AchievementNotification } from '../components/AchievementNotification';
import { useAchievements } from '../hooks/useAchievements';
import { BADGES } from '../types/arena';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const user = telegramService.getUser();
  const { stats, recentlyUnlocked } = useAchievements();

  // Mock arena badges (in real app would come from backend)
  const [unlockedBadges] = useState(['first_blood', 'gladiator', 'speedrun_master']);

  // Use Telegram native BackButton
  useTelegramBackButton(() => navigate('/main'));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white" style={{ paddingTop: 'max(env(safe-area-inset-top), 60px)' }}>
      <div className="max-w-2xl mx-auto p-3 sm:p-4">
        {/* Header */}
        <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <span className="text-3xl">👤</span>
          <span>Profile & Settings</span>
        </h1>

        {/* User Info Card */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-white/10 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-3xl">
                {user?.first_name?.charAt(0).toUpperCase() || '👤'}
              </span>
            </div>

            <div className="flex-1">
              <h2 className="text-xl font-bold text-white mb-1">
                {user?.first_name || 'Player'} {user?.last_name || ''}
              </h2>

              {user?.username && (
                <p className="text-slate-400 text-sm">
                  @{user.username}
                </p>
              )}
            </div>

            <div className="text-center">
              <div className="text-3xl font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                {stats.currentRating}
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Rating
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
            <div className="text-2xl font-bold text-green-400 mb-1">
              {stats.wins}
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Wins
            </p>
          </div>

          <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
            <div className="text-2xl font-bold text-red-400 mb-1">
              {stats.losses}
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Losses
            </p>
          </div>

          <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
            <div className="text-2xl font-bold text-blue-400 mb-1">
              {stats.draws}
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Draws
            </p>
          </div>
        </div>

        {/* Theme Selector */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-white/10 mb-6">
          <ThemeSelector />
        </div>

        {/* Sound Settings */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-white/10 mb-6">
          <SoundSettings />
        </div>

        {/* Arena Badges */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-white/10 mb-6">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <span className="text-xl">⚔️</span>
            <span>Arena Badges</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.values(BADGES).map((badge) => {
              const isUnlocked = unlockedBadges.includes(badge.id);
              const rarityColors = {
                common: 'from-slate-600 to-slate-700',
                rare: 'from-blue-600 to-cyan-700',
                epic: 'from-purple-600 to-pink-700',
                legendary: 'from-yellow-500 to-orange-600',
              };

              return (
                <div
                  key={badge.id}
                  className={`relative rounded-xl p-4 border-2 transition-all ${
                    isUnlocked
                      ? `bg-gradient-to-br ${rarityColors[badge.rarity]} border-white/30 shadow-lg`
                      : 'bg-slate-900/50 border-slate-700 opacity-40'
                  }`}
                >
                  {/* Rarity indicator */}
                  {isUnlocked && (
                    <div className="absolute top-1 right-1">
                      {badge.rarity === 'legendary' && <span className="text-xs">✨</span>}
                      {badge.rarity === 'epic' && <span className="text-xs">💫</span>}
                      {badge.rarity === 'rare' && <span className="text-xs">⭐</span>}
                    </div>
                  )}

                  <div className="text-center">
                    <div className={`text-3xl mb-2 ${!isUnlocked && 'grayscale'}`}>
                      {badge.icon}
                    </div>
                    <div className="text-xs font-bold text-white mb-1">
                      {badge.name}
                    </div>
                    <div className="text-xs text-slate-300 opacity-80">
                      {badge.description}
                    </div>
                  </div>

                  {!isUnlocked && (
                    <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">🔒</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Badge Stats */}
          <div className="mt-4 flex items-center justify-center gap-6 text-sm">
            <div className="text-center">
              <div className="text-lg font-bold text-yellow-400">{unlockedBadges.length}</div>
              <div className="text-xs text-slate-400">Unlocked</div>
            </div>
            <div className="w-px h-8 bg-white/10"></div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-400">{Object.keys(BADGES).length}</div>
              <div className="text-xs text-slate-400">Total</div>
            </div>
          </div>

          <button
            onClick={() => navigate('/arena')}
            className="mt-4 w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold py-3 rounded-xl transition-all active:scale-95"
          >
            ⚔️ Enter Arena to Unlock More
          </button>
        </div>

        {/* Achievements Display */}
        <AchievementsDisplay />

        {/* Coming Soon Section */}
        <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-4 border border-white/10 mt-6">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <span className="text-xl">🚀</span>
            <span>Coming Soon</span>
          </h3>
          <ul className="text-slate-300 text-sm space-y-2">
            <li className="flex items-center gap-2">
              <span className="text-green-400">•</span>
              <span>Detailed statistics & rating history</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-orange-400">•</span>
              <span>Leaderboards</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-yellow-400">•</span>
              <span>Daily challenges</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Achievement Notification (global) */}
      <AchievementNotification
        achievement={recentlyUnlocked}
        onClose={() => {}}
      />
    </div>
  );
};