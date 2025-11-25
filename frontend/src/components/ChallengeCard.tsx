/**
 * ChallengeCard Component
 * Display individual daily challenge with progress
 */

import React from 'react';
import type { DailyChallenge } from '../config/challenges';
import { difficultyColors, getChallengeProgress } from '../config/challenges';

interface ChallengeCardProps {
  challenge: DailyChallenge;
}

export const ChallengeCard: React.FC<ChallengeCardProps> = ({ challenge }) => {
  const progressPercentage = getChallengeProgress(challenge.progress, challenge.target);
  const isCompleted = challenge.completed;

  return (
    <div
      className={`relative p-5 rounded-2xl transition-all duration-300 ${
        isCompleted
          ? `bg-gradient-to-br ${difficultyColors[challenge.difficulty]} shadow-lg`
          : 'bg-slate-800/50 border-2 border-white/10'
      }`}
    >
      {/* Glow effect for completed */}
      {isCompleted && (
        <div
          className={`absolute -inset-0.5 bg-gradient-to-r ${difficultyColors[challenge.difficulty]} rounded-2xl blur opacity-30`}
        />
      )}

      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          {/* Emoji + Info */}
          <div className="flex items-start gap-3 flex-1">
            <div
              className={`flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-3xl ${
                isCompleted
                  ? 'bg-white/20 backdrop-blur-sm'
                  : 'bg-slate-700/50'
              }`}
            >
              {challenge.emoji}
            </div>

            <div className="flex-1 min-w-0">
              <h3
                className={`font-bold text-base mb-1 ${
                  isCompleted ? 'text-white' : 'text-slate-200'
                }`}
              >
                {challenge.name}
              </h3>
              <p
                className={`text-sm ${
                  isCompleted ? 'text-white/80' : 'text-slate-400'
                }`}
              >
                {challenge.description}
              </p>
            </div>
          </div>

          {/* Difficulty Badge */}
          <div
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold uppercase ${
              isCompleted
                ? 'bg-white/20 text-white'
                : challenge.difficulty === 'easy'
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : challenge.difficulty === 'medium'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
            }`}
          >
            {challenge.difficulty}
          </div>
        </div>

        {/* Progress */}
        {!isCompleted && (
          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Progress</span>
              <span className="text-white font-bold">
                {challenge.progress} / {challenge.target}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2.5 bg-slate-700/50 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${difficultyColors[challenge.difficulty]} transition-all duration-500`}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Reward */}
        <div
          className={`flex items-center justify-between pt-3 border-t ${
            isCompleted ? 'border-white/20' : 'border-white/10'
          }`}
        >
          <span
            className={`text-sm font-medium ${
              isCompleted ? 'text-white/80' : 'text-slate-400'
            }`}
          >
            {isCompleted ? 'Earned' : 'Reward'}
          </span>
          <div className="flex items-center gap-2">
            <span
              className={`text-xl font-bold ${
                isCompleted ? 'text-white' : 'text-yellow-400'
              }`}
            >
              +{challenge.rewardXP}
            </span>
            <span
              className={`text-sm ${
                isCompleted ? 'text-white/80' : 'text-slate-400'
              }`}
            >
              XP
            </span>
          </div>
        </div>

        {/* Completed checkmark */}
        {isCompleted && (
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
            <svg
              className="w-5 h-5 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};
