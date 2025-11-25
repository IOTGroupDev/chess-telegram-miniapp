/**
 * ChallengesDisplay Component
 * Main daily challenges screen
 */

import React from 'react';
import { ChallengeCard } from './ChallengeCard';
import { useChallenges } from '../hooks/useChallenges';
import { getTodayDate } from '../config/challenges';

export const ChallengesDisplay: React.FC = () => {
  const {
    challenges,
    streak,
    completedCount,
    totalCount,
    completionPercentage,
    totalReward,
    potentialReward,
    allCompleted,
  } = useChallenges();

  // Форматировать дату
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const today = getTodayDate();

  return (
    <div className="space-y-6">
      {/* Header with date and streak */}
      <div className="space-y-4">
        {/* Title and Date */}
        <div>
          <h2 className="text-3xl font-black text-white mb-2">
            Daily Challenges
          </h2>
          <p className="text-slate-400 text-sm">
            {formatDate(today)}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Progress Card */}
          <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/80 text-sm font-medium">
                Progress
              </span>
              <span className="text-3xl">📊</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-white">
                {completedCount}
              </span>
              <span className="text-lg text-white/70">/{totalCount}</span>
            </div>
            <div className="w-full h-2 bg-white/20 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-white/90 transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          {/* Streak Card */}
          <div className="bg-gradient-to-br from-orange-600 to-red-600 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/80 text-sm font-medium">
                Daily Streak
              </span>
              <span className="text-3xl">🔥</span>
            </div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-3xl font-black text-white">
                {streak.current}
              </span>
              <span className="text-lg text-white/70">days</span>
            </div>
            <div className="text-xs text-white/70">
              Best: {streak.longest} days
            </div>
          </div>
        </div>

        {/* Rewards Summary */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Today's Rewards</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                  {totalReward}
                </span>
                <span className="text-slate-500 text-sm">/ {potentialReward} XP</span>
              </div>
            </div>
            {allCompleted && (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-xl border border-green-500/30">
                <svg
                  className="w-5 h-5 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-green-400 font-bold text-sm">All Done!</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Challenges List */}
      <div className="space-y-4">
        <h3 className="text-white font-bold text-lg flex items-center gap-2">
          <span>Today's Challenges</span>
          <span className="text-slate-500 text-sm font-normal">
            ({completedCount}/{totalCount})
          </span>
        </h3>

        <div className="space-y-3">
          {challenges.map(challenge => (
            <ChallengeCard key={challenge.id} challenge={challenge} />
          ))}
        </div>
      </div>

      {/* All Completed Celebration */}
      {allCompleted && (
        <div className="bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl p-6 text-center shadow-lg">
          <div className="text-6xl mb-3">🎉</div>
          <h3 className="text-2xl font-black text-white mb-2">
            Perfect Day!
          </h3>
          <p className="text-white/90 mb-3">
            You've completed all daily challenges!
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-xl backdrop-blur-sm">
            <span className="text-white font-bold">Bonus:</span>
            <span className="text-2xl font-black text-white">
              +{Math.round(potentialReward * 0.1)}
            </span>
            <span className="text-white/80">XP</span>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <div className="flex gap-3">
          <div className="flex-shrink-0 text-2xl">ℹ️</div>
          <div className="flex-1">
            <p className="text-blue-300 text-sm font-medium mb-1">
              How it works
            </p>
            <p className="text-blue-200/80 text-xs">
              Complete daily challenges to earn XP and maintain your streak. New challenges are available every day at midnight. Complete all three to get a bonus reward!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
