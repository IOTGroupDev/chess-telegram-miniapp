/**
 * AchievementBadge Component
 * Display individual achievement with unlock status
 */

import React from 'react';
import type { Achievement } from '../config/achievements';
import { rarityColors } from '../config/achievements';

interface AchievementBadgeProps {
  achievement: Achievement;
  isUnlocked: boolean;
  progress?: number;
  onClick?: () => void;
}

export const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  achievement,
  isUnlocked,
  progress = 0,
  onClick,
}) => {
  const progressPercentage = Math.min((progress / achievement.requirement) * 100, 100);
  const isSecret = achievement.secret && !isUnlocked;

  return (
    <button
      onClick={onClick}
      className={`relative group w-full p-4 rounded-xl transition-all duration-300 ${
        isUnlocked
          ? 'bg-gradient-to-br ' + rarityColors[achievement.rarity] + ' shadow-lg'
          : 'bg-slate-800/50 border border-white/10'
      } ${onClick ? 'hover:scale-105 active:scale-95' : ''}`}
    >
      {/* Glow effect for unlocked */}
      {isUnlocked && (
        <div
          className={`absolute -inset-0.5 bg-gradient-to-r ${rarityColors[achievement.rarity]} rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity`}
        />
      )}

      <div className="relative flex items-start gap-3">
        {/* Emoji Badge */}
        <div
          className={`flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center text-3xl ${
            isUnlocked
              ? 'bg-white/20 backdrop-blur-sm'
              : 'bg-slate-700/50 grayscale opacity-50'
          }`}
        >
          {isSecret ? '❓' : achievement.emoji}
        </div>

        {/* Info */}
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3
              className={`font-semibold text-sm ${
                isUnlocked ? 'text-white' : 'text-slate-400'
              }`}
            >
              {isSecret ? '???' : achievement.name}
            </h3>

            {achievement.rewardXP && (
              <span
                className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                  isUnlocked
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-700/50 text-slate-400'
                }`}
              >
                +{achievement.rewardXP} XP
              </span>
            )}
          </div>

          <p
            className={`text-xs mb-2 ${
              isUnlocked ? 'text-white/80' : 'text-slate-500'
            }`}
          >
            {isSecret ? 'Секретное достижение' : achievement.description}
          </p>

          {/* Progress bar */}
          {!isUnlocked && !isSecret && (
            <div className="space-y-1">
              <div className="w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <p className="text-xs text-slate-500">
                {progress} / {achievement.requirement}
              </p>
            </div>
          )}

          {/* Unlocked date */}
          {isUnlocked && (
            <p className="text-xs text-white/60 mt-1">
              ✓ Разблокировано
            </p>
          )}
        </div>
      </div>

      {/* Rarity indicator */}
      <div
        className={`absolute top-2 right-2 w-2 h-2 rounded-full ${
          isUnlocked ? 'bg-white/40' : 'bg-slate-600/40'
        }`}
      />
    </button>
  );
};
