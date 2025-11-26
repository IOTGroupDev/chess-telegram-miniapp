/**
 * Arena Types - Public matches, tournaments, and badges
 */

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt?: Date;
}

export interface PlayerStats {
  userId: number;
  username: string;
  rating: number;
  publicWins: number;
  publicLosses: number;
  winStreak: number;
  bestWinStreak: number;
  totalSpectators: number;
  badges: Badge[];
  tipsReceived: number;
}

export interface PublicMatch {
  id: string;
  whitePlayer: {
    id: number;
    username: string;
    rating: number;
    avatar?: string;
  };
  blackPlayer: {
    id: number;
    username: string;
    rating: number;
    avatar?: string;
  };
  status: 'waiting' | 'active' | 'finished';
  spectatorCount: number;
  fen: string;
  currentTurn: 'white' | 'black';
  startedAt: Date;
  estimatedEndTime?: Date;
}

export interface TournamentMatch {
  id: string;
  round: number;
  position: number; // Position in bracket
  player1?: {
    id: number;
    username: string;
    rating: number;
    avatar?: string;
  };
  player2?: {
    id: number;
    username: string;
    rating: number;
    avatar?: string;
  };
  winner?: number; // player ID
  status: 'pending' | 'active' | 'finished';
  matchId?: string; // Link to actual game
}

export interface Tournament {
  id: string;
  name: string;
  type: 'ladder' | 'bracket' | 'royale';
  status: 'upcoming' | 'active' | 'finished';
  entryFee: number; // Stars
  prizePool: number; // Stars
  maxPlayers: number;
  currentPlayers: number;
  participants: PlayerStats[];
  matches: TournamentMatch[];
  startTime: Date;
  endTime?: Date;
}

// Mock badges
export const BADGES: Record<string, Badge> = {
  gladiator: {
    id: 'gladiator',
    name: 'Gladiator',
    description: 'Win 10 public matches',
    icon: '⚔️',
    rarity: 'rare',
  },
  crowdFavorite: {
    id: 'crowd_favorite',
    name: 'Crowd Favorite',
    description: 'Get 100+ spectators watching',
    icon: '👑',
    rarity: 'epic',
  },
  comebackKing: {
    id: 'comeback_king',
    name: 'Comeback King',
    description: 'Win from a losing position',
    icon: '🔄',
    rarity: 'rare',
  },
  speedrunMaster: {
    id: 'speedrun_master',
    name: 'Speedrun Master',
    description: 'Win in under 5 minutes',
    icon: '⚡',
    rarity: 'common',
  },
  giantSlayer: {
    id: 'giant_slayer',
    name: 'Giant Slayer',
    description: 'Defeat a player 200+ rating higher',
    icon: '🗡️',
    rarity: 'legendary',
  },
  untouchable: {
    id: 'untouchable',
    name: 'Untouchable',
    description: '10 win streak in public matches',
    icon: '🔥',
    rarity: 'legendary',
  },
  tactician: {
    id: 'tactician',
    name: 'Master Tactician',
    description: 'Win with a brilliant sacrifice',
    icon: '🧠',
    rarity: 'epic',
  },
  firstBlood: {
    id: 'first_blood',
    name: 'First Blood',
    description: 'Win your first public match',
    icon: '🩸',
    rarity: 'common',
  },
};
