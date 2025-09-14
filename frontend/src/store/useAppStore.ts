import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface AppState {
  // Telegram user data
  user: TelegramUser | null;
  isAuthorized: boolean;
  
  // App state
  isLoading: boolean;
  error: string | null;
  
  // Game state
  currentGameId: string | null;
  gameMode: 'ai' | 'online' | null;
  
  // Actions
  setUser: (user: TelegramUser | null) => void;
  setAuthorized: (authorized: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCurrentGame: (gameId: string | null, mode: 'ai' | 'online' | null) => void;
  clearError: () => void;
  reset: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthorized: false,
      isLoading: false,
      error: null,
      currentGameId: null,
      gameMode: null,

      // Actions
      setUser: (user) => set({ user, isAuthorized: !!user }),
      setAuthorized: (authorized) => set({ isAuthorized: authorized }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      setCurrentGame: (gameId, mode) => set({ currentGameId: gameId, gameMode: mode }),
      clearError: () => set({ error: null }),
      reset: () => set({
        user: null,
        isAuthorized: false,
        isLoading: false,
        error: null,
        currentGameId: null,
        gameMode: null,
      }),
    }),
    {
      name: 'chess-app-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthorized: state.isAuthorized,
      }),
    }
  )
);
