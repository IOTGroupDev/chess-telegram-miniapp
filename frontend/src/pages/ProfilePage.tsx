import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TelegramService } from '../services/telegram';
import { useTelegramBackButton } from '../hooks/useTelegramBackButton';
import { ThemeSelector } from '../components/ThemeSelector';
import { SoundSettings } from '../components/SoundSettings';
import { AchievementsDisplay } from '../components/AchievementsDisplay';
import { AchievementNotification } from '../components/AchievementNotification';
import { useAchievements } from '../hooks/useAchievements';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const telegram = TelegramService.getInstance();
  const user = telegram.getUser();
  const { stats, recentlyUnlocked } = useAchievements();

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
                {user?.firstName?.charAt(0).toUpperCase() || '👤'}
              </span>
            </div>

            <div className="flex-1">
              <h2 className="text-xl font-bold text-white mb-1">
                {user?.firstName || 'Player'} {user?.lastName || ''}
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