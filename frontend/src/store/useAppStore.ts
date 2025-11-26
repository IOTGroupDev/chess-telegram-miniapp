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

  // Auth
  accessToken: string | null;
  supabaseUserId: string | null;

  // App state
  isLoading: boolean;
  error: string | null;
  language: string;

  // Game state
  currentGameId: string | null;
  gameMode: 'ai' | 'online' | null;

  // Actions
  setUser: (user: TelegramUser | null) => void;
  setAuthorized: (authorized: boolean) => void;
  setAccessToken: (token: string | null) => void;
  setSupabaseUserId: (userId: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLanguage: (language: string) => void;
  setCurrentGame: (gameId: string | null, mode: 'ai' | 'online' | null) => void;
  clearError: () => void;
  reset: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      user: null,
      isAuthorized: false,
      accessToken: null,
      supabaseUserId: null,
      isLoading: false,
      error: null,
      language: 'en',
      currentGameId: null,
      gameMode: null,

      // Actions
      setUser: (user) => set({ user, isAuthorized: !!user }),
      setAuthorized: (authorized) => set({ isAuthorized: authorized }),
      setAccessToken: (token) => set({ accessToken: token }),
      setSupabaseUserId: (userId) => set({ supabaseUserId: userId }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      setLanguage: (language) => set({ language }),
      setCurrentGame: (gameId, mode) => set({ currentGameId: gameId, gameMode: mode }),
      clearError: () => set({ error: null }),
      reset: () => set({
        user: null,
        isAuthorized: false,
        accessToken: null,
        supabaseUserId: null,
        isLoading: false,
        error: null,
        language: 'en',
        currentGameId: null,
        gameMode: null,
      }),
    }),
    {
      name: 'chess-app-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthorized: state.isAuthorized,
        language: state.language,
        accessToken: state.accessToken,
        supabaseUserId: state.supabaseUserId,
      }),
    }
  )
);
