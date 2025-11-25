/**
 * ChallengesPage
 * Daily challenges screen
 */

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegramBackButton } from '../hooks/useTelegramBackButton';
import { ChallengesDisplay } from '../components/ChallengesDisplay';
import { AchievementNotification } from '../components/AchievementNotification';
import { useChallenges } from '../hooks/useChallenges';
import type { Achievement } from '../config/achievements';
import type { DailyChallenge } from '../config/challenges';

export const ChallengesPage: React.FC = () => {
  const navigate = useNavigate();
  const { recentlyCompleted } = useChallenges();

  // Convert DailyChallenge to Achievement format for notification
  const challengeAsAchievement = useMemo((): Achievement | null => {
    if (!recentlyCompleted) return null;

    const challenge = recentlyCompleted as DailyChallenge;
    const difficultyToRarity = {
      easy: 'common' as const,
      medium: 'rare' as const,
      hard: 'epic' as const,
    };

    return {
      id: challenge.id,
      name: challenge.name,
      description: challenge.description,
      category: 'special',
      rarity: difficultyToRarity[challenge.difficulty],
      emoji: challenge.emoji,
      requirement: challenge.target,
      rewardXP: challenge.rewardXP,
    };
  }, [recentlyCompleted]);

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
        achievement={challengeAsAchievement}
        onClose={() => {}}
      />
    </div>
  );
};
