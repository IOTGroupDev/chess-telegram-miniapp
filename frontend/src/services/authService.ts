/**
 * Authentication Service
 * Handles Telegram authentication via NestJS backend
 */

import { supabase } from '../lib/supabaseClient';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    telegram_id: number;
    username: string | null;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
}

export class AuthService {
  private static accessToken: string | null = null;

  /**
   * Authenticates user with Telegram initData
   */
  static async authenticateWithTelegram(initData: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/telegram`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ initData }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Authentication failed');
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error('Invalid authentication response');
      }

      const { accessToken, user } = result.data;

      // Store token
      this.accessToken = accessToken;
      localStorage.setItem('access_token', accessToken);

      // Set token for Supabase client
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: accessToken, // We're using the same token
      });

      return { accessToken, user };
    } catch (error) {
      console.error('[AuthService] Authentication failed:', error);
      throw error;
    }
  }

  /**
   * Gets stored access token
   */
  static getAccessToken(): string | null {
    if (!this.accessToken) {
      this.accessToken = localStorage.getItem('access_token');
    }
    return this.accessToken;
  }

  /**
   * Clears authentication
   */
  static async logout(): Promise<void> {
    this.accessToken = null;
    localStorage.removeItem('access_token');
    await supabase.auth.signOut();
  }

  /**
   * Checks if user is authenticated
   */
  static isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  /**
   * Gets authorization header for API requests
   */
  static getAuthHeader(): Record<string, string> {
    const token = this.getAccessToken();
    if (!token) {
      return {};
    }
    return {
      Authorization: `Bearer ${token}`,
    };
  }
}

export default AuthService;
