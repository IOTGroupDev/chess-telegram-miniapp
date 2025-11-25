/**
 * ChallengesPage
 * Daily challenges screen
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegramBackButton } from '../hooks/useTelegramBackButton';
import { ChallengesDisplay } from '../components/ChallengesDisplay';
import { AchievementNotification } from '../components/AchievementNotification';
import { useChallenges } from '../hooks/useChallenges';

export const ChallengesPage: React.FC = () => {
  const navigate = useNavigate();
  const { recentlyCompleted } = useChallenges();

  // Use Telegram native BackButton
  useTelegramBackButton(() => navigate('/main'));

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white"
      style={{ paddingTop: 'max(env(safe-area-inset-top), 60px)' }}
    >
      <div className="max-w-2xl mx-auto p-3 sm:p-4">
        <ChallengesDisplay />
      </div>

      {/* Challenge Completion Notification */}
      <AchievementNotification
        achievement={recentlyCompleted}
        onClose={() => {}}
      />
    </div>
  );
};
