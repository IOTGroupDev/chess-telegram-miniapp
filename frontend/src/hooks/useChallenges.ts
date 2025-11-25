/**
 * useChallenges Hook
 * Track and manage daily challenges
 */

import { useState, useEffect, useCallback } from 'react';
import type { DailyChallenge, ChallengeType } from '../config/challenges';
import { generateDailyChallenges, getTodayDate } from '../config/challenges';

const CHALLENGES_STORAGE_KEY = 'chess_daily_challenges';
const STREAK_STORAGE_KEY = 'chess_daily_streak';

interface ChallengeStreak {
  current: number;
  longest: number;
  lastCompletedDate: string;
}

export const useChallenges = () => {
  const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
  const [streak, setStreak] = useState<ChallengeStreak>({
    current: 0,
    longest: 0,
    lastCompletedDate: '',
  });
  const [recentlyCompleted, setRecentlyCompleted] = useState<DailyChallenge | null>(null);

  // Загрузка из localStorage
  useEffect(() => {
    const today = getTodayDate();
    const saved = localStorage.getItem(CHALLENGES_STORAGE_KEY);
    const savedStreak = localStorage.getItem(STREAK_STORAGE_KEY);

    if (savedStreak) {
      setStreak(JSON.parse(savedStreak));
    }

    if (saved) {
      const parsed: DailyChallenge[] = JSON.parse(saved);

      // Проверить, что челленджи за сегодня
      if (parsed.length > 0 && parsed[0].date === today) {
        setChallenges(parsed);
      } else {
        // Генерировать новые челленджи
        const newChallenges = generateDailyChallenges(today);
        setChallenges(newChallenges);
        localStorage.setItem(CHALLENGES_STORAGE_KEY, JSON.stringify(newChallenges));
      }
    } else {
      // Первый запуск - генерировать челленджи
      const newChallenges = generateDailyChallenges(today);
      setChallenges(newChallenges);
      localStorage.setItem(CHALLENGES_STORAGE_KEY, JSON.stringify(newChallenges));
    }
  }, []);

  // Сохранение в localStorage
  const saveChallenges = useCallback((updatedChallenges: DailyChallenge[]) => {
    setChallenges(updatedChallenges);
    localStorage.setItem(CHALLENGES_STORAGE_KEY, JSON.stringify(updatedChallenges));
  }, []);

  const saveStreak = useCallback((updatedStreak: ChallengeStreak) => {
    setStreak(updatedStreak);
    localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(updatedStreak));
  }, []);

  // Обновить прогресс челленджа
  const updateChallengeProgress = useCallback(
    (type: ChallengeType, increment: number = 1, metadata?: any) => {
      const updated = challenges.map(challenge => {
        // Пропустить уже завершённые
        if (challenge.completed) return challenge;

        // Проверить тип челленджа
        let shouldUpdate = challenge.type === type;

        // Для checkmate_piece проверить дополнительные метаданные
        if (type === 'checkmate_piece' && challenge.metadata?.piece) {
          shouldUpdate = shouldUpdate && metadata?.piece === challenge.metadata.piece;
        }

        if (!shouldUpdate) return challenge;

        const newProgress = challenge.progress + increment;
        const isNowCompleted = newProgress >= challenge.target;

        if (isNowCompleted && !challenge.completed) {
          // Челлендж завершён
          const completedChallenge = {
            ...challenge,
            progress: challenge.target,
            completed: true,
            completedAt: new Date().toISOString(),
          };

          // Показать уведомление
          setRecentlyCompleted(completedChallenge);
          setTimeout(() => setRecentlyCompleted(null), 5000);

          return completedChallenge;
        }

        return {
          ...challenge,
          progress: Math.min(newProgress, challenge.target),
        };
      });

      saveChallenges(updated);

      // Проверить, все ли челленджи завершены
      const allCompleted = updated.every(c => c.completed);
      if (allCompleted) {
        updateStreak();
      }
    },
    [challenges, saveChallenges]
  );

  // Обновить серию выполненных дней
  const updateStreak = useCallback(() => {
    const today = getTodayDate();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = yesterday.toISOString().split('T')[0];

    let newStreak = { ...streak };

    if (streak.lastCompletedDate === yesterdayDate) {
      // Продолжение серии
      newStreak.current += 1;
      newStreak.longest = Math.max(newStreak.current, newStreak.longest);
    } else if (streak.lastCompletedDate === today) {
      // Уже завершено сегодня, ничего не делаем
      return;
    } else {
      // Серия прервана, начинаем заново
      newStreak.current = 1;
    }

    newStreak.lastCompletedDate = today;
    saveStreak(newStreak);
  }, [streak, saveStreak]);

  // Трекеры для разных типов событий
  const trackWin = useCallback(
    (isAI: boolean, moveCount?: number) => {
      updateChallengeProgress('win_games');
      updateChallengeProgress('play_games');

      if (isAI) {
        updateChallengeProgress('win_ai_games');
      } else {
        updateChallengeProgress('win_online_games');
      }

      // Для fast_wins проверяем количество ходов
      if (moveCount) {
        challenges.forEach(challenge => {
          if (challenge.type === 'fast_wins' && !challenge.completed) {
            if (moveCount <= challenge.target) {
              updateChallengeProgress('fast_wins');
            }
          }
        });
      }
    },
    [updateChallengeProgress, challenges]
  );

  const trackLoss = useCallback(() => {
    updateChallengeProgress('play_games');
  }, [updateChallengeProgress]);

  const trackDraw = useCallback(() => {
    updateChallengeProgress('play_games');
  }, [updateChallengeProgress]);

  const trackPuzzleSolved = useCallback(() => {
    updateChallengeProgress('solve_puzzles');
  }, [updateChallengeProgress]);

  const trackCheckmateWith = useCallback(
    (piece: 'queen' | 'rook' | 'knight' | 'pawn') => {
      updateChallengeProgress('checkmate_piece', 1, { piece });
    },
    [updateChallengeProgress]
  );

  // Трекер для win_streak и win_without_losses требует внешней логики
  const trackWinStreak = useCallback(
    (currentStreak: number) => {
      challenges.forEach(challenge => {
        if (challenge.type === 'win_streak' && !challenge.completed) {
          if (currentStreak >= challenge.target) {
            updateChallengeProgress('win_streak', challenge.target - challenge.progress);
          }
        }
      });
    },
    [challenges, updateChallengeProgress]
  );

  const trackWinWithoutLoss = useCallback(
    (consecutiveWins: number) => {
      challenges.forEach(challenge => {
        if (challenge.type === 'win_without_losses' && !challenge.completed) {
          // Обновляем прогресс только если нет поражений
          if (consecutiveWins >= challenge.progress + 1) {
            updateChallengeProgress('win_without_losses');
          }
        }
      });
    },
    [challenges, updateChallengeProgress]
  );

  const resetWinWithoutLoss = useCallback(() => {
    // Сбросить прогресс челленджа win_without_losses при поражении
    const updated = challenges.map(challenge => {
      if (challenge.type === 'win_without_losses' && !challenge.completed) {
        return { ...challenge, progress: 0 };
      }
      return challenge;
    });
    saveChallenges(updated);
  }, [challenges, saveChallenges]);

  // Статистика челленджей
  const completedCount = challenges.filter(c => c.completed).length;
  const totalCount = challenges.length;
  const allCompleted = completedCount === totalCount;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Общая награда за все челленджи
  const totalReward = challenges.reduce((sum, c) => sum + (c.completed ? c.rewardXP : 0), 0);
  const potentialReward = challenges.reduce((sum, c) => sum + c.rewardXP, 0);

  return {
    // Данные
    challenges,
    streak,
    recentlyCompleted,

    // Статистика
    completedCount,
    totalCount,
    allCompleted,
    completionPercentage,
    totalReward,
    potentialReward,

    // Методы трекинга
    trackWin,
    trackLoss,
    trackDraw,
    trackPuzzleSolved,
    trackCheckmateWith,
    trackWinStreak,
    trackWinWithoutLoss,
    resetWinWithoutLoss,

    // Ручное управление
    updateChallengeProgress,
  };
};
