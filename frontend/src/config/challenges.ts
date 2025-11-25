/**
 * Daily Challenges Configuration
 * Chess Telegram Mini App
 */

export type ChallengeType =
  | 'win_games'           // Выиграть N игр
  | 'win_ai_games'        // Выиграть N игр с AI
  | 'win_online_games'    // Выиграть N онлайн игр
  | 'play_games'          // Сыграть N игр
  | 'win_streak'          // Серия побед N подряд
  | 'solve_puzzles'       // Решить N пазлов
  | 'puzzle_streak'       // Решить N пазлов подряд
  | 'fast_wins'           // Победить за < N ходов
  | 'checkmate_piece'     // Поставить мат определенной фигурой
  | 'win_without_losses'; // Выиграть N игр без поражений

export type ChallengeDifficulty = 'easy' | 'medium' | 'hard';

export interface Challenge {
  id: string;
  type: ChallengeType;
  name: string;
  description: string;
  difficulty: ChallengeDifficulty;
  target: number;          // Цель (количество)
  rewardXP: number;
  rewardCoins?: number;    // Будущее: внутриигровая валюта
  emoji: string;
  metadata?: any;          // Дополнительные параметры (например, для checkmate_piece)
}

export interface DailyChallenge extends Challenge {
  date: string;            // YYYY-MM-DD
  progress: number;
  completed: boolean;
  completedAt?: string;    // ISO timestamp
}

// Шаблоны челленджей по сложности
export const challengeTemplates: Record<ChallengeDifficulty, Challenge[]> = {
  easy: [
    {
      id: 'easy_win_1',
      type: 'win_games',
      name: 'Первая победа дня',
      description: 'Выиграйте 1 игру',
      difficulty: 'easy',
      target: 1,
      rewardXP: 50,
      emoji: '🏆',
    },
    {
      id: 'easy_play_3',
      type: 'play_games',
      name: 'Три партии',
      description: 'Сыграйте 3 игры (любой исход)',
      difficulty: 'easy',
      target: 3,
      rewardXP: 30,
      emoji: '♟️',
    },
    {
      id: 'easy_puzzle_3',
      type: 'solve_puzzles',
      name: 'Тактический тренинг',
      description: 'Решите 3 головоломки',
      difficulty: 'easy',
      target: 3,
      rewardXP: 40,
      emoji: '🧩',
    },
    {
      id: 'easy_ai_win_1',
      type: 'win_ai_games',
      name: 'Победа над AI',
      description: 'Победите компьютер 1 раз',
      difficulty: 'easy',
      target: 1,
      rewardXP: 35,
      emoji: '🤖',
    },
  ],

  medium: [
    {
      id: 'medium_win_3',
      type: 'win_games',
      name: 'Тройная победа',
      description: 'Выиграйте 3 игры',
      difficulty: 'medium',
      target: 3,
      rewardXP: 100,
      emoji: '⭐',
    },
    {
      id: 'medium_streak_3',
      type: 'win_streak',
      name: 'Победная серия',
      description: 'Выиграйте 3 игры подряд',
      difficulty: 'medium',
      target: 3,
      rewardXP: 120,
      emoji: '🔥',
    },
    {
      id: 'medium_puzzle_5',
      type: 'solve_puzzles',
      name: 'Мастер тактики',
      description: 'Решите 5 головоломок',
      difficulty: 'medium',
      target: 5,
      rewardXP: 80,
      emoji: '💡',
    },
    {
      id: 'medium_online_win_2',
      type: 'win_online_games',
      name: 'Онлайн доминация',
      description: 'Выиграйте 2 онлайн игры',
      difficulty: 'medium',
      target: 2,
      rewardXP: 110,
      emoji: '🎮',
    },
    {
      id: 'medium_fast_win',
      type: 'fast_wins',
      name: 'Скоростной мат',
      description: 'Победите менее чем за 15 ходов',
      difficulty: 'medium',
      target: 15,
      rewardXP: 90,
      emoji: '⚡',
    },
    {
      id: 'medium_puzzle_streak_3',
      type: 'puzzle_streak',
      name: 'Безошибочная серия',
      description: 'Решите 3 головоломки подряд',
      difficulty: 'medium',
      target: 3,
      rewardXP: 100,
      emoji: '✨',
    },
  ],

  hard: [
    {
      id: 'hard_win_5',
      type: 'win_games',
      name: 'Пятикратный чемпион',
      description: 'Выиграйте 5 игр',
      difficulty: 'hard',
      target: 5,
      rewardXP: 200,
      emoji: '👑',
    },
    {
      id: 'hard_streak_5',
      type: 'win_streak',
      name: 'Непобедимый',
      description: 'Выиграйте 5 игр подряд',
      difficulty: 'hard',
      target: 5,
      rewardXP: 250,
      emoji: '💫',
    },
    {
      id: 'hard_puzzle_10',
      type: 'solve_puzzles',
      name: 'Гроссмейстер тактики',
      description: 'Решите 10 головоломок',
      difficulty: 'hard',
      target: 10,
      rewardXP: 180,
      emoji: '🎯',
    },
    {
      id: 'hard_win_no_loss_3',
      type: 'win_without_losses',
      name: 'Безупречная серия',
      description: 'Выиграйте 3 игры без единого поражения',
      difficulty: 'hard',
      target: 3,
      rewardXP: 220,
      emoji: '💎',
    },
    {
      id: 'hard_fast_win_10',
      type: 'fast_wins',
      name: 'Молниеносный мат',
      description: 'Победите менее чем за 10 ходов',
      difficulty: 'hard',
      target: 10,
      rewardXP: 200,
      emoji: '⚡',
    },
    {
      id: 'hard_checkmate_knight',
      type: 'checkmate_piece',
      name: 'Мат конём',
      description: 'Поставьте мат конём',
      difficulty: 'hard',
      target: 1,
      rewardXP: 150,
      emoji: '🐴',
      metadata: { piece: 'knight' },
    },
  ],
};

// Цвета по сложности
export const difficultyColors: Record<ChallengeDifficulty, string> = {
  easy: 'from-green-600 to-emerald-500',
  medium: 'from-blue-600 to-cyan-500',
  hard: 'from-purple-600 to-pink-500',
};

// Награды по сложности (базовые)
export const difficultyRewards: Record<ChallengeDifficulty, number> = {
  easy: 50,
  medium: 100,
  hard: 200,
};

/**
 * Генерация ежедневных челленджей
 * 1 легкий + 1 средний + 1 сложный
 */
export const generateDailyChallenges = (date: string): DailyChallenge[] => {
  // Используем дату как seed для детерминированной генерации
  const seed = date.split('-').reduce((acc, val) => acc + parseInt(val), 0);

  const getRandomTemplate = (templates: Challenge[], offset: number): Challenge => {
    const index = (seed + offset) % templates.length;
    return { ...templates[index] };
  };

  const challenges: DailyChallenge[] = [
    {
      ...getRandomTemplate(challengeTemplates.easy, 0),
      date,
      progress: 0,
      completed: false,
    },
    {
      ...getRandomTemplate(challengeTemplates.medium, 1),
      date,
      progress: 0,
      completed: false,
    },
    {
      ...getRandomTemplate(challengeTemplates.hard, 2),
      date,
      progress: 0,
      completed: false,
    },
  ];

  return challenges;
};

/**
 * Получить текущую дату в формате YYYY-MM-DD
 */
export const getTodayDate = (): string => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

/**
 * Получить прогресс в процентах
 */
export const getChallengeProgress = (progress: number, target: number): number => {
  return Math.min(Math.round((progress / target) * 100), 100);
};
