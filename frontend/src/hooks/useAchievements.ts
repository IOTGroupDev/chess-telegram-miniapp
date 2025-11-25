/**
 * useAchievements Hook
 * Track and manage user achievements
 */

import { useState, useEffect, useCallback } from 'react';
import type { Achievement, UserAchievement } from '../config/achievements';
import { achievements, getAchievementById } from '../config/achievements';

const ACHIEVEMENTS_STORAGE_KEY = 'chess_achievements';
const STATS_STORAGE_KEY = 'chess_stats';

// Статистика игрока для отслеживания достижений
export interface PlayerStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  currentStreak: number;
  bestStreak: number;
  aiWins: number;
  onlineWins: number;
  puzzlesSolved: number;
  puzzleStreak: number;
  fastestWin: number;        // Минимальное кол-во ходов
  currentRating: number;
  peakRating: number;
  xp: number;
  level: number;
}

const defaultStats: PlayerStats = {
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  currentStreak: 0,
  bestStreak: 0,
  aiWins: 0,
  onlineWins: 0,
  puzzlesSolved: 0,
  puzzleStreak: 0,
  fastestWin: 999,
  currentRating: 1000,
  peakRating: 1000,
  xp: 0,
  level: 1,
};

export const useAchievements = () => {
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [stats, setStats] = useState<PlayerStats>(defaultStats);
  const [recentlyUnlocked, setRecentlyUnlocked] = useState<Achievement | null>(null);

  // Загрузка из localStorage
  useEffect(() => {
    const savedAchievements = localStorage.getItem(ACHIEVEMENTS_STORAGE_KEY);
    const savedStats = localStorage.getItem(STATS_STORAGE_KEY);

    if (savedAchievements) {
      setUserAchievements(JSON.parse(savedAchievements));
    }

    if (savedStats) {
      setStats(JSON.parse(savedStats));
    }
  }, []);

  // Сохранение в localStorage
  const saveAchievements = useCallback((newAchievements: UserAchievement[]) => {
    setUserAchievements(newAchievements);
    localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(newAchievements));
  }, []);

  const saveStats = useCallback((newStats: PlayerStats) => {
    setStats(newStats);
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(newStats));
  }, []);

  // Проверить, разблокировано ли достижение
  const isUnlocked = useCallback(
    (achievementId: string): boolean => {
      const userAch = userAchievements.find(a => a.achievementId === achievementId);
      return userAch?.isCompleted || false;
    },
    [userAchievements]
  );

  // Получить прогресс достижения
  const getProgress = useCallback(
    (achievementId: string): number => {
      const userAch = userAchievements.find(a => a.achievementId === achievementId);
      return userAch?.progress || 0;
    },
    [userAchievements]
  );

  // Разблокировать достижение
  const unlockAchievement = useCallback(
    (achievementId: string) => {
      if (isUnlocked(achievementId)) return;

      const achievement = getAchievementById(achievementId);
      if (!achievement) return;

      const newAchievement: UserAchievement = {
        achievementId,
        unlockedAt: new Date().toISOString(),
        progress: achievement.requirement,
        isCompleted: true,
      };

      const newAchievements = [...userAchievements, newAchievement];
      saveAchievements(newAchievements);

      // Добавить XP
      if (achievement.rewardXP) {
        const newXP = stats.xp + achievement.rewardXP;
        const newLevel = Math.floor(newXP / 1000) + 1; // 1000 XP = 1 уровень
        saveStats({ ...stats, xp: newXP, level: newLevel });
      }

      // Показать уведомление
      setRecentlyUnlocked(achievement);
      setTimeout(() => setRecentlyUnlocked(null), 5000);
    },
    [isUnlocked, userAchievements, stats, saveAchievements, saveStats]
  );

  // Обновить прогресс достижения
  const updateProgress = useCallback(
    (achievementId: string, progress: number) => {
      const achievement = getAchievementById(achievementId);
      if (!achievement || isUnlocked(achievementId)) return;

      const existingIndex = userAchievements.findIndex(a => a.achievementId === achievementId);

      if (existingIndex >= 0) {
        const updated = [...userAchievements];
        updated[existingIndex] = {
          ...updated[existingIndex],
          progress,
        };
        saveAchievements(updated);
      } else {
        const newAchievement: UserAchievement = {
          achievementId,
          unlockedAt: '',
          progress,
          isCompleted: false,
        };
        saveAchievements([...userAchievements, newAchievement]);
      }

      // Если достигли цели - разблокировать
      if (progress >= achievement.requirement) {
        unlockAchievement(achievementId);
      }
    },
    [userAchievements, isUnlocked, saveAchievements, unlockAchievement]
  );

  // Записать победу в игре
  const recordWin = useCallback(
    (isAI: boolean = false, moveCount?: number) => {
      const newStats = {
        ...stats,
        gamesPlayed: stats.gamesPlayed + 1,
        wins: stats.wins + 1,
        currentStreak: stats.currentStreak + 1,
        bestStreak: Math.max(stats.currentStreak + 1, stats.bestStreak),
      };

      if (isAI) {
        newStats.aiWins = stats.aiWins + 1;
      } else {
        newStats.onlineWins = stats.onlineWins + 1;
      }

      if (moveCount && moveCount < stats.fastestWin) {
        newStats.fastestWin = moveCount;
      }

      saveStats(newStats);

      // Проверка достижений
      if (newStats.gamesPlayed === 1) unlockAchievement('first_game');
      if (newStats.wins === 1) unlockAchievement('first_win');
      if (newStats.aiWins === 1) unlockAchievement('first_ai_win');
      if (newStats.onlineWins === 1) unlockAchievement('first_online_win');

      updateProgress('wins_10', newStats.wins);
      updateProgress('wins_50', newStats.wins);
      updateProgress('wins_100', newStats.wins);
      updateProgress('wins_250', newStats.wins);

      updateProgress('games_10', newStats.gamesPlayed);
      updateProgress('games_50', newStats.gamesPlayed);
      updateProgress('games_100', newStats.gamesPlayed);
      updateProgress('games_500', newStats.gamesPlayed);

      updateProgress('streak_3', newStats.currentStreak);
      updateProgress('streak_5', newStats.currentStreak);
      updateProgress('streak_10', newStats.currentStreak);
      updateProgress('streak_20', newStats.currentStreak);

      if (moveCount && moveCount < 10) {
        unlockAchievement('speed_demon');
      }
    },
    [stats, saveStats, unlockAchievement, updateProgress]
  );

  // Записать поражение
  const recordLoss = useCallback(() => {
    const newStats = {
      ...stats,
      gamesPlayed: stats.gamesPlayed + 1,
      losses: stats.losses + 1,
      currentStreak: 0,
    };
    saveStats(newStats);

    if (newStats.gamesPlayed === 1) unlockAchievement('first_game');
    updateProgress('games_10', newStats.gamesPlayed);
    updateProgress('games_50', newStats.gamesPlayed);
    updateProgress('games_100', newStats.gamesPlayed);
    updateProgress('games_500', newStats.gamesPlayed);
  }, [stats, saveStats, unlockAchievement, updateProgress]);

  // Записать ничью
  const recordDraw = useCallback(() => {
    const newStats = {
      ...stats,
      gamesPlayed: stats.gamesPlayed + 1,
      draws: stats.draws + 1,
      currentStreak: 0,
    };
    saveStats(newStats);

    if (newStats.gamesPlayed === 1) unlockAchievement('first_game');
    updateProgress('games_10', newStats.gamesPlayed);
    updateProgress('games_50', newStats.gamesPlayed);
    updateProgress('games_100', newStats.gamesPlayed);
    updateProgress('games_500', newStats.gamesPlayed);
  }, [stats, saveStats, unlockAchievement, updateProgress]);

  // Записать решённую головоломку
  const recordPuzzleSolved = useCallback(() => {
    const newStats = {
      ...stats,
      puzzlesSolved: stats.puzzlesSolved + 1,
      puzzleStreak: stats.puzzleStreak + 1,
    };
    saveStats(newStats);

    if (newStats.puzzlesSolved === 1) unlockAchievement('first_puzzle');
    updateProgress('puzzles_10', newStats.puzzlesSolved);
    updateProgress('puzzles_50', newStats.puzzlesSolved);
    updateProgress('puzzles_100', newStats.puzzlesSolved);
    updateProgress('puzzle_streak_5', newStats.puzzleStreak);
  }, [stats, saveStats, unlockAchievement, updateProgress]);

  // Записать неправильное решение головоломки
  const recordPuzzleFailed = useCallback(() => {
    const newStats = {
      ...stats,
      puzzleStreak: 0,
    };
    saveStats(newStats);
  }, [stats, saveStats]);

  // Обновить рейтинг
  const updateRating = useCallback(
    (newRating: number) => {
      const newStats = {
        ...stats,
        currentRating: newRating,
        peakRating: Math.max(newRating, stats.peakRating),
      };
      saveStats(newStats);

      updateProgress('rating_1200', newRating);
      updateProgress('rating_1400', newRating);
      updateProgress('rating_1600', newRating);
      updateProgress('rating_1800', newRating);
      updateProgress('rating_2000', newRating);
    },
    [stats, saveStats, updateProgress]
  );

  // Записать мат определённой фигурой
  const recordCheckmateWith = useCallback(
    (piece: 'queen' | 'rook' | 'knight' | 'pawn') => {
      const achievementMap = {
        queen: 'checkmate_queen',
        rook: 'checkmate_rook',
        knight: 'checkmate_knight',
        pawn: 'checkmate_pawn',
      };
      unlockAchievement(achievementMap[piece]);
    },
    [unlockAchievement]
  );

  // Получить все разблокированные достижения
  const unlockedAchievements = achievements.filter(a => isUnlocked(a.id));

  // Статистика достижений
  const achievementStats = {
    total: achievements.length,
    unlocked: unlockedAchievements.length,
    percentage: Math.round((unlockedAchievements.length / achievements.length) * 100),
  };

  // Сброс (для тестирования)
  const resetAchievements = useCallback(() => {
    localStorage.removeItem(ACHIEVEMENTS_STORAGE_KEY);
    localStorage.removeItem(STATS_STORAGE_KEY);
    setUserAchievements([]);
    setStats(defaultStats);
  }, []);

  return {
    // Данные
    achievements,
    userAchievements,
    unlockedAchievements,
    stats,
    achievementStats,
    recentlyUnlocked,

    // Методы проверки
    isUnlocked,
    getProgress,

    // Методы записи событий
    recordWin,
    recordLoss,
    recordDraw,
    recordPuzzleSolved,
    recordPuzzleFailed,
    updateRating,
    recordCheckmateWith,

    // Ручное управление
    unlockAchievement,
    updateProgress,
    resetAchievements,
  };
};
