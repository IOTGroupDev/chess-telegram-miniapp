export interface User {
  id: string;
  username: string;
  firstName: string;
  lastName?: string;
  telegramId: number;
  rating: number;
  createdAt: Date;
}

export interface Game {
  id: string;
  whitePlayer: User;
  blackPlayer: User;
  status: 'waiting' | 'active' | 'finished';
  winner?: 'white' | 'black' | 'draw';
  fen: string;
  moves: Move[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Move {
  id: string;
  gameId: string;
  from: string;
  to: string;
  piece: string;
  captured?: string;
  promotion?: string;
  san: string;
  fen: string;
  timestamp: Date;
}

export interface GameState {
  game: Game | null;
  isPlayerTurn: boolean;
  selectedSquare: string | null;
  possibleMoves: string[];
  isGameOver: boolean;
  winner: 'white' | 'black' | 'draw' | null;
  fen: string;
  moves: Move[];
  status: 'waiting' | 'active' | 'finished';

  /**
   * Подсветка последнего хода соперника:
   * - lastMoveFrom: из какой клетки была сделана последняя ход соперника
   * - lastMoveTo: в какую клетку пришла фигура соперника
   *
   * Эти поля используются визуальными компонентами доски для
   * отображения направления и фигуры последнего хода оппонента.
   */
  lastMoveFrom?: string | null;
  lastMoveTo?: string | null;
}

export type GameMode = 'ai' | 'online';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}
