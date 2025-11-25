/**
 * AchievementsDisplay Component
 * Full achievements screen with categories and filters
 */

import React, { useState } from 'react';
import { AchievementBadge } from './AchievementBadge';
import { useAchievements } from '../hooks/useAchievements';
import type { AchievementCategory } from '../config/achievements';
import { achievementCategories } from '../config/achievements';
import { telegramService } from '../services/telegram.service';

export const AchievementsDisplay: React.FC = () => {
  const {
    achievements,
    isUnlocked,
    getProgress,
    stats,
    achievementStats,
  } = useAchievements();

  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'all'>('all');

  // Filter achievements by category
  const filteredAchievements =
    selectedCategory === 'all'
      ? achievements
      : achievements.filter(a => a.category === selectedCategory);

  // Sort: unlocked first, then by rarity
  const sortedAchievements = [...filteredAchievements].sort((a, b) => {
    const aUnlocked = isUnlocked(a.id);
    const bUnlocked = isUnlocked(b.id);

    if (aUnlocked && !bUnlocked) return -1;
    if (!aUnlocked && bUnlocked) return 1;

    const rarityOrder = { legendary: 4, epic: 3, rare: 2, common: 1 };
    return rarityOrder[b.rarity] - rarityOrder[a.rarity];
  });

  const handleCategorySelect = (category: AchievementCategory | 'all') => {
    setSelectedCategory(category);
    telegramService.hapticFeedback('selection');
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">Достижения</h2>
          <div className="text-right">
            <div className="text-3xl font-bold text-white">
              {achievementStats.unlocked}
              <span className="text-lg text-white/70">/{achievementStats.total}</span>
            </div>
            <p className="text-sm text-white/80">{achievementStats.percentage}% завершено</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
          <div
            className="h-full bg-white/90 transition-all duration-500"
            style={{ width: `${achievementStats.percentage}%` }}
          />
        </div>

        {/* XP and Level */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/20">
          <div className="text-center">
            <p className="text-sm text-white/80 mb-1">Уровень</p>
            <p className="text-2xl font-bold text-white">{stats.level}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-white/80 mb-1">Опыт</p>
            <p className="text-2xl font-bold text-white">{stats.xp}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-white/80 mb-1">Серия</p>
            <p className="text-2xl font-bold text-white">{stats.currentStreak}</p>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => handleCategorySelect('all')}
          className={`flex-shrink-0 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
            selectedCategory === 'all'
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
              : 'bg-slate-800/50 text-slate-400 border border-white/10'
          }`}
        >
          Все
        </button>

        {(Object.keys(achievementCategories) as AchievementCategory[]).map(category => {
          const categoryInfo = achievementCategories[category];
          const categoryAchievements = achievements.filter(a => a.category === category);
          const unlockedCount = categoryAchievements.filter(a => isUnlocked(a.id)).length;

          return (
            <button
              key={category}
              onClick={() => handleCategorySelect(category)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                selectedCategory === category
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'bg-slate-800/50 text-slate-400 border border-white/10'
              }`}
            >
              {categoryInfo.emoji} {categoryInfo.name}{' '}
              <span className="text-xs opacity-70">
                {unlockedCount}/{categoryAchievements.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Achievements Grid */}
      <div className="space-y-3">
        {sortedAchievements.map(achievement => (
          <AchievementBadge
            key={achievement.id}
            achievement={achievement}
            isUnlocked={isUnlocked(achievement.id)}
            progress={getProgress(achievement.id)}
          />
        ))}

        {sortedAchievements.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500 text-lg">Нет достижений в этой категории</p>
          </div>
        )}
      </div>
    </div>
  );
};
