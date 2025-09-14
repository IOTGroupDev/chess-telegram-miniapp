import type { Game, User, Move } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface CreateOnlineGameRequest {
  telegramId: number;
  mode: 'waiting' | 'join';
}

export interface CreateOnlineGameResponse {
  id: string;
  status: 'waiting' | 'active' | 'finished';
  message?: string;
  whitePlayer?: { id: string };
  blackPlayer?: { id: string };
  fen?: string;
  moves?: any[];
  createdAt?: string;
}

class ApiService {
  private static instance: ApiService;

  private constructor() {}

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Game endpoints
  public async createGame(mode: 'ai' | 'online'): Promise<Game> {
    return this.request<Game>('/games', {
      method: 'POST',
      body: JSON.stringify({ mode }),
    });
  }

  public async getGame(gameId: string): Promise<Game> {
    return this.request<Game>(`/games/${gameId}`);
  }

  public async makeMove(gameId: string, from: string, to: string, promotion?: string): Promise<Move> {
    return this.request<Move>(`/games/${gameId}/moves`, {
      method: 'POST',
      body: JSON.stringify({ from, to, promotion }),
    });
  }

  // User endpoints
  public async getUser(userId: string): Promise<User> {
    return this.request<User>(`/users/${userId}`);
  }

  public async getUserHistory(userId: string): Promise<Game[]> {
    return this.request<Game[]>(`/users/${userId}/history`);
  }

  // AI endpoints
  public async getAiMove(gameId: string): Promise<Move> {
    return this.request<Move>(`/games/${gameId}/ai-move`, {
      method: 'POST',
    });
  }

  // Online Game endpoints
  public async createOnlineGame(request: CreateOnlineGameRequest): Promise<CreateOnlineGameResponse> {
    return this.request<CreateOnlineGameResponse>('/online-games', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  public async getOnlineGame(gameId: string): Promise<Game> {
    return this.request<Game>(`/online-games/${gameId}`);
  }

  public async getWaitingGames(): Promise<{ id: string; whitePlayer: { id: string }; createdAt: string } | null> {
    return this.request<{ id: string; whitePlayer: { id: string }; createdAt: string } | null>('/online-games/waiting/list');
  }
}

export default ApiService;
