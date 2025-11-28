/**
 * Authentication Service
 * Validates Telegram initData and manages JWT tokens compatible with Supabase
 */

import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface TelegramInitData {
  user: TelegramUser;
  auth_date: number;
  hash: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly supabase: SupabaseClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      this.logger.error('[AuthService] SUPABASE_URL or SUPABASE_SERVICE_KEY is not configured', {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey,
      });
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be defined');
    }

    this.logger.log('[AuthService] Supabase client initialized', {
      supabaseUrl,
      serviceKeyPrefix: supabaseServiceKey.substring(0, 6),
    });

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  /**
   * Validates Telegram initData using HMAC-SHA256
   * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
   */
  validateTelegramData(initData: string): TelegramInitData {
    const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');

    if (!botToken) {
      this.logger.error('[AuthService] TELEGRAM_BOT_TOKEN is not configured');
      throw new UnauthorizedException('Telegram bot token not configured');
    }

    this.logger.debug('[AuthService] Starting Telegram data validation', {
      initDataLength: initData?.length ?? 0,
    });

    try {
      // Parse initData
      const urlParams = new URLSearchParams(initData);
      const hash = urlParams.get('hash');

      if (!hash) {
        this.logger.warn('[AuthService] Missing hash in initData');
        throw new UnauthorizedException('Missing hash in initData');
      }

      // Remove hash from params and sort
      urlParams.delete('hash');
      const dataCheckString = Array.from(urlParams.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

      // Create secret key
      const secretKey = crypto
        .createHmac('sha256', 'WebAppData')
        .update(botToken)
        .digest();

      // Calculate hash
      const calculatedHash = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

      // Verify hash
      if (calculatedHash !== hash) {
        this.logger.warn('[AuthService] Invalid Telegram data signature', {
          expectedHash: calculatedHash,
          receivedHash: hash,
        });
        throw new UnauthorizedException('Invalid Telegram data signature');
      }

      // Check auth_date (data should not be older than 24 hours)
      const authDateStr = urlParams.get('auth_date');
      const authDate = parseInt(authDateStr || '0', 10);
      const currentTime = Math.floor(Date.now() / 1000);

      if (currentTime - authDate > 86400) {
        this.logger.warn('[AuthService] Telegram data is too old', {
          authDate,
          currentTime,
          diff: currentTime - authDate,
        });
        throw new UnauthorizedException('Telegram data is too old');
      }

      // Parse user data
      const userStr = urlParams.get('user');
      if (!userStr) {
        this.logger.warn('[AuthService] Missing user data in initData');
        throw new UnauthorizedException('Missing user data in initData');
      }

      const user: TelegramUser = JSON.parse(userStr);

      this.logger.debug('[AuthService] Telegram data validated successfully', {
        telegramUserId: user.id,
        username: user.username,
      });

      return {
        user,
        auth_date: authDate,
        hash,
      };
    } catch (error) {
      this.logger.error('[AuthService] Failed to validate Telegram data', {
        errorMessage: (error as Error).message,
        errorStack: (error as Error).stack,
      });
      throw new UnauthorizedException('Invalid Telegram data');
    }
  }

  /**
   * Creates or updates user in Supabase and returns JWT token
   */
  async authenticateUser(initData: string): Promise<{
    accessToken: string;
    user: any;
  }> {
    this.logger.log('[AuthService] authenticateUser called');

    // Validate Telegram data
    const telegramData = this.validateTelegramData(initData);
    const { user: telegramUser } = telegramData;

    this.logger.log('[AuthService] Telegram user validated', {
      telegramId: telegramUser.id,
      username: telegramUser.username,
      language: telegramUser.language_code,
    });

    try {
      // Check if user exists in Supabase
      const { data: existingUser, error: fetchError } = await this.supabase
        .from('users')
        .select('*')
        .eq('telegram_id', telegramUser.id)
        .single();

      let userId: string;
      let userData: any;

      if (fetchError && fetchError.code !== 'PGRST116') {
        // Error other than "not found"
        this.logger.error('[AuthService] Error fetching user from Supabase', {
          error: fetchError,
        });
        throw new Error('Failed to fetch user data');
      }

      if (existingUser) {
        // Update existing user
        userId = existingUser.id;

        this.logger.log('[AuthService] Existing user found, updating', {
          userId,
          telegramId: existingUser.telegram_id,
        });

        const { data: updatedUser, error: updateError } = await this.supabase
          .from('users')
          .update({
            username: telegramUser.username || null,
            first_name: telegramUser.first_name,
            last_name: telegramUser.last_name || null,
            avatar_url: telegramUser.photo_url || null,
            language: telegramUser.language_code || 'en',
            last_seen_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)
          .select()
          .single();

        if (updateError) {
          this.logger.error('[AuthService] Error updating user in Supabase', {
            error: updateError,
            userId,
          });
          throw new Error('Failed to update user');
        }

        userData = updatedUser;
        this.logger.log('[AuthService] User updated successfully', { userId });
      } else {
        // Create new user
        this.logger.log('[AuthService] No existing user, creating new', {
          telegramId: telegramUser.id,
        });

        const { data: newUser, error: insertError } = await this.supabase
          .from('users')
          .insert({
            telegram_id: telegramUser.id,
            username: telegramUser.username || null,
            first_name: telegramUser.first_name,
            last_name: telegramUser.last_name || null,
            avatar_url: telegramUser.photo_url || null,
            language: telegramUser.language_code || 'en',
          })
          .select()
          .single();

        if (insertError) {
          this.logger.error('[AuthService] Error creating user in Supabase', {
            error: insertError,
            telegramId: telegramUser.id,
          });
          throw new Error('Failed to create user');
        }

        userId = newUser.id;
        userData = newUser;
        this.logger.log('[AuthService] New user created successfully', {
          userId,
          telegramId: telegramUser.id,
        });

        // Ensure wallet was created by trigger
        // If trigger failed, create wallet manually using database function
        const { data: wallet, error: walletError } = await this.supabase
          .from('user_wallets')
          .select('id')
          .eq('user_id', userId)
          .single();

        if (walletError || !wallet) {
          this.logger.warn('[AuthService] Wallet not found for new user, creating via fallback', {
            userId,
            walletError,
          });

          // Call database function to ensure wallet exists
          const { data: walletId, error: createWalletError } = await this.supabase.rpc(
            'ensure_user_wallet',
            { p_user_id: userId },
          );

          if (createWalletError) {
            this.logger.error('[AuthService] Failed to create wallet for user', {
              userId,
              error: createWalletError,
            });
            // Don't throw - user is created, wallet can be created later
          } else {
            this.logger.log('[AuthService] Wallet created via fallback for user', {
              userId,
              walletId,
            });
          }
        } else {
          this.logger.log('[AuthService] Wallet created successfully for new user', {
            userId,
            walletId: wallet.id,
          });
        }
      }

      // Generate JWT token compatible with Supabase
      const accessToken = this.generateSupabaseCompatibleJWT(userId);

      this.logger.log('[AuthService] JWT generated for user', { userId });

      return {
        accessToken,
        user: userData,
      };
    } catch (error) {
      this.logger.error('[AuthService] Authentication failed', {
        errorMessage: (error as Error).message,
        errorStack: (error as Error).stack,
      });
      throw new UnauthorizedException('Authentication failed');
    }
  }

  /**
   * Generates JWT token compatible with Supabase
   * Uses the same JWT_SECRET as Supabase for RLS compatibility
   */
  private generateSupabaseCompatibleJWT(userId: string): string {
    const payload = {
      sub: userId,
      role: 'authenticated',
      aud: 'authenticated',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
    };

    return this.jwtService.sign(payload);
  }

  /**
   * Validates JWT token
   */
  async validateToken(token: string): Promise<any> {
    this.logger.debug('[AuthService] validateToken called');

    try {
      const payload = this.jwtService.verify(token);

      this.logger.debug('[AuthService] JWT payload decoded', {
        sub: payload.sub,
        role: payload.role,
        aud: payload.aud,
        exp: payload.exp,
      });

      // Fetch user from Supabase
      const { data: user, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', payload.sub)
        .single();

      if (error || !user) {
        this.logger.warn('[AuthService] User not found for token', {
          userId: payload.sub,
          error,
        });
        throw new UnauthorizedException('User not found');
      }

      return user;
    } catch (error) {
      this.logger.error('[AuthService] Token validation failed', {
        errorMessage: (error as Error).message,
        errorStack: (error as Error).stack,
      });
      throw new UnauthorizedException('Invalid token');
    }
  }
}
