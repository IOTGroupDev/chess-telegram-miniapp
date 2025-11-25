/**
 * Achievement System Configuration
 * Chess Telegram Mini App
 */

export type AchievementCategory =
  | 'first_steps'    // Первые шаги
  | 'victories'      // Победы
  | 'streaks'        // Серии побед
  | 'milestones'     // Вехи
  | 'special'        // Особые достижения
  | 'puzzles'        // Головоломки
  | 'rating'         // Рейтинг
  | 'mastery';       // Мастерство

export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  emoji: string;
  requirement: number;      // Сколько нужно для получения
  rewardXP?: number;        // XP за достижение
  secret?: boolean;         // Скрытое до получения
}

export interface UserAchievement {
  achievementId: string;
  unlockedAt: string;
  progress: number;
  isCompleted: boolean;
}

// Все достижения в игре
export const achievements: Achievement[] = [
  // ═══════════════════════════════════
  // 🎯 Первые шаги
  // ═══════════════════════════════════
  {
    id: 'first_game',
    name: 'Первая партия',
    description: 'Сыграйте первую игру',
    category: 'first_steps',
    rarity: 'common',
    emoji: '♟️',
    requirement: 1,
    rewardXP: 10,
  },
  {
    id: 'first_win',
    name: 'Первая победа',
    description: 'Одержите первую победу',
    category: 'first_steps',
    rarity: 'common',
    emoji: '🏆',
    requirement: 1,
    rewardXP: 25,
  },
  {
    id: 'first_ai_win',
    name: 'Победа над AI',
    description: 'Победите компьютер',
    category: 'first_steps',
    rarity: 'common',
    emoji: '🤖',
    requirement: 1,
    rewardXP: 20,
  },
  {
    id: 'first_online_win',
    name: 'Онлайн победа',
    description: 'Победите живого игрока',
    category: 'first_steps',
    rarity: 'rare',
    emoji: '🎮',
    requirement: 1,
    rewardXP: 50,
  },
  {
    id: 'first_puzzle',
    name: 'Решатель задач',
    description: 'Решите первую головоломку',
    category: 'first_steps',
    rarity: 'common',
    emoji: '🧩',
    requirement: 1,
    rewardXP: 15,
  },

  // ═══════════════════════════════════
  // 🏆 Победы
  // ═══════════════════════════════════
  {
    id: 'wins_10',
    name: 'Ветеран',
    description: 'Одержите 10 побед',
    category: 'victories',
    rarity: 'common',
    emoji: '⭐',
    requirement: 10,
    rewardXP: 100,
  },
  {
    id: 'wins_50',
    name: 'Воин',
    description: 'Одержите 50 побед',
    category: 'victories',
    rarity: 'rare',
    emoji: '⚔️',
    requirement: 50,
    rewardXP: 250,
  },
  {
    id: 'wins_100',
    name: 'Чемпион',
    description: 'Одержите 100 побед',
    category: 'victories',
    rarity: 'epic',
    emoji: '👑',
    requirement: 100,
    rewardXP: 500,
  },
  {
    id: 'wins_250',
    name: 'Легенда',
    description: 'Одержите 250 побед',
    category: 'victories',
    rarity: 'legendary',
    emoji: '🔥',
    requirement: 250,
    rewardXP: 1000,
  },

  // ═══════════════════════════════════
  // 🔥 Серии побед
  // ═══════════════════════════════════
  {
    id: 'streak_3',
    name: 'На волне',
    description: 'Выиграйте 3 партии подряд',
    category: 'streaks',
    rarity: 'common',
    emoji: '🌊',
    requirement: 3,
    rewardXP: 50,
  },
  {
    id: 'streak_5',
    name: 'Не остановить',
    description: 'Выиграйте 5 партий подряд',
    category: 'streaks',
    rarity: 'rare',
    emoji: '🚀',
    requirement: 5,
    rewardXP: 100,
  },
  {
    id: 'streak_10',
    name: 'Непобедимый',
    description: 'Выиграйте 10 партий подряд',
    category: 'streaks',
    rarity: 'epic',
    emoji: '⚡',
    requirement: 10,
    rewardXP: 300,
  },
  {
    id: 'streak_20',
    name: 'Бог шахмат',
    description: 'Выиграйте 20 партий подряд',
    category: 'streaks',
    rarity: 'legendary',
    emoji: '💫',
    requirement: 20,
    rewardXP: 1000,
    secret: true,
  },

  // ═══════════════════════════════════
  // 📊 Вехи
  // ═══════════════════════════════════
  {
    id: 'games_10',
    name: 'Новичок',
    description: 'Сыграйте 10 партий',
    category: 'milestones',
    rarity: 'common',
    emoji: '🎯',
    requirement: 10,
    rewardXP: 50,
  },
  {
    id: 'games_50',
    name: 'Любитель',
    description: 'Сыграйте 50 партий',
    category: 'milestones',
    rarity: 'rare',
    emoji: '🎲',
    requirement: 50,
    rewardXP: 150,
  },
  {
    id: 'games_100',
    name: 'Энтузиаст',
    description: 'Сыграйте 100 партий',
    category: 'milestones',
    rarity: 'epic',
    emoji: '🎪',
    requirement: 100,
    rewardXP: 300,
  },
  {
    id: 'games_500',
    name: 'Мастер',
    description: 'Сыграйте 500 партий',
    category: 'milestones',
    rarity: 'legendary',
    emoji: '🏰',
    requirement: 500,
    rewardXP: 1500,
  },

  // ═══════════════════════════════════
  // ⚡ Особые достижения
  // ═══════════════════════════════════
  {
    id: 'speed_demon',
    name: 'Скоростной демон',
    description: 'Победите менее чем за 10 ходов',
    category: 'special',
    rarity: 'rare',
    emoji: '💨',
    requirement: 1,
    rewardXP: 100,
  },
  {
    id: 'comeback_king',
    name: 'Возвращение',
    description: 'Победите, потеряв ферзя',
    category: 'special',
    rarity: 'epic',
    emoji: '🎭',
    requirement: 1,
    rewardXP: 200,
    secret: true,
  },
  {
    id: 'checkmate_rook',
    name: 'Мат ладьей',
    description: 'Поставьте мат ладьёй',
    category: 'special',
    rarity: 'common',
    emoji: '🏯',
    requirement: 1,
    rewardXP: 30,
  },
  {
    id: 'checkmate_queen',
    name: 'Мат ферзём',
    description: 'Поставьте мат ферзём',
    category: 'special',
    rarity: 'common',
    emoji: '👸',
    requirement: 1,
    rewardXP: 30,
  },
  {
    id: 'checkmate_knight',
    name: 'Мат конём',
    description: 'Поставьте мат конём',
    category: 'special',
    rarity: 'rare',
    emoji: '🐴',
    requirement: 1,
    rewardXP: 75,
  },
  {
    id: 'checkmate_pawn',
    name: 'Мат пешкой',
    description: 'Поставьте мат пешкой',
    category: 'special',
    rarity: 'epic',
    emoji: '🎖️',
    requirement: 1,
    rewardXP: 150,
    secret: true,
  },

  // ═══════════════════════════════════
  // 🧩 Головоломки
  // ═══════════════════════════════════
  {
    id: 'puzzles_10',
    name: 'Умник',
    description: 'Решите 10 головоломок',
    category: 'puzzles',
    rarity: 'common',
    emoji: '🧠',
    requirement: 10,
    rewardXP: 100,
  },
  {
    id: 'puzzles_50',
    name: 'Тактик',
    description: 'Решите 50 головоломок',
    category: 'puzzles',
    rarity: 'rare',
    emoji: '🎯',
    requirement: 50,
    rewardXP: 250,
  },
  {
    id: 'puzzles_100',
    name: 'Гений тактики',
    description: 'Решите 100 головоломок',
    category: 'puzzles',
    rarity: 'epic',
    emoji: '💡',
    requirement: 100,
    rewardXP: 500,
  },
  {
    id: 'puzzle_streak_5',
    name: 'Без ошибок',
    description: 'Решите 5 головоломок подряд',
    category: 'puzzles',
    rarity: 'rare',
    emoji: '✨',
    requirement: 5,
    rewardXP: 150,
  },

  // ═══════════════════════════════════
  // 📈 Рейтинг
  // ═══════════════════════════════════
  {
    id: 'rating_1200',
    name: 'Начинающий',
    description: 'Достигните рейтинга 1200',
    category: 'rating',
    rarity: 'common',
    emoji: '📊',
    requirement: 1200,
    rewardXP: 100,
  },
  {
    id: 'rating_1400',
    name: 'Продвинутый',
    description: 'Достигните рейтинга 1400',
    category: 'rating',
    rarity: 'rare',
    emoji: '📈',
    requirement: 1400,
    rewardXP: 200,
  },
  {
    id: 'rating_1600',
    name: 'Эксперт',
    description: 'Достигните рейтинга 1600',
    category: 'rating',
    rarity: 'epic',
    emoji: '🎓',
    requirement: 1600,
    rewardXP: 400,
  },
  {
    id: 'rating_1800',
    name: 'Кандидат в мастера',
    description: 'Достигните рейтинга 1800',
    category: 'rating',
    rarity: 'legendary',
    emoji: '🎖️',
    requirement: 1800,
    rewardXP: 800,
  },
  {
    id: 'rating_2000',
    name: 'Мастер',
    description: 'Достигните рейтинга 2000',
    category: 'rating',
    rarity: 'legendary',
    emoji: '💎',
    requirement: 2000,
    rewardXP: 1500,
    secret: true,
  },

  // ═══════════════════════════════════
  // 🎓 Мастерство
  // ═══════════════════════════════════
  {
    id: 'no_blunders',
    name: 'Безошибочная игра',
    description: 'Выиграйте без грубых ошибок',
    category: 'mastery',
    rarity: 'rare',
    emoji: '🎯',
    requirement: 1,
    rewardXP: 150,
  },
  {
    id: 'perfect_accuracy',
    name: 'Идеальная точность',
    description: 'Сыграйте с точностью 95%+',
    category: 'mastery',
    rarity: 'epic',
    emoji: '💯',
    requirement: 1,
    rewardXP: 300,
    secret: true,
  },
];

// Категории для фильтрации
export const achievementCategories: Record<AchievementCategory, { name: string; emoji: string }> = {
  first_steps: { name: 'Первые шаги', emoji: '🎯' },
  victories: { name: 'Победы', emoji: '🏆' },
  streaks: { name: 'Серии', emoji: '🔥' },
  milestones: { name: 'Вехи', emoji: '📊' },
  special: { name: 'Особые', emoji: '⚡' },
  puzzles: { name: 'Головоломки', emoji: '🧩' },
  rating: { name: 'Рейтинг', emoji: '📈' },
  mastery: { name: 'Мастерство', emoji: '🎓' },
};

// Цвета по редкости
export const rarityColors: Record<AchievementRarity, string> = {
  common: 'from-gray-600 to-gray-400',
  rare: 'from-blue-600 to-blue-400',
  epic: 'from-purple-600 to-purple-400',
  legendary: 'from-yellow-600 to-orange-500',
};

// Получить достижение по ID
export const getAchievementById = (id: string): Achievement | undefined => {
  return achievements.find(a => a.id === id);
};

// Получить достижения по категории
export const getAchievementsByCategory = (category: AchievementCategory): Achievement[] => {
  return achievements.filter(a => a.category === category);
};
