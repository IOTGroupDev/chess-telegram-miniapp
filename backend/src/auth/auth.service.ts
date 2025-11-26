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
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be defined');
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  /**
   * Validates Telegram initData using HMAC-SHA256
   * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
   */
  validateTelegramData(initData: string): TelegramInitData {
    const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');

    if (!botToken) {
      throw new UnauthorizedException('Telegram bot token not configured');
    }

    try {
      // Parse initData
      const urlParams = new URLSearchParams(initData);
      const hash = urlParams.get('hash');

      if (!hash) {
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
        throw new UnauthorizedException('Invalid Telegram data signature');
      }

      // Check auth_date (data should not be older than 24 hours)
      const authDate = parseInt(urlParams.get('auth_date') || '0', 10);
      const currentTime = Math.floor(Date.now() / 1000);

      if (currentTime - authDate > 86400) {
        throw new UnauthorizedException('Telegram data is too old');
      }

      // Parse user data
      const userStr = urlParams.get('user');
      if (!userStr) {
        throw new UnauthorizedException('Missing user data in initData');
      }

      const user: TelegramUser = JSON.parse(userStr);

      return {
        user,
        auth_date: authDate,
        hash,
      };
    } catch (error) {
      this.logger.error('Failed to validate Telegram data', error);
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
    // Validate Telegram data
    const telegramData = this.validateTelegramData(initData);
    const { user: telegramUser } = telegramData;

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
        this.logger.error('Error fetching user from Supabase', fetchError);
        throw new Error('Failed to fetch user data');
      }

      if (existingUser) {
        // Update existing user
        userId = existingUser.id;

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
          this.logger.error('Error updating user in Supabase', updateError);
          throw new Error('Failed to update user');
        }

        userData = updatedUser;
        this.logger.log(`User ${userId} updated successfully`);
      } else {
        // Create new user
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
          this.logger.error('Error creating user in Supabase', insertError);
          throw new Error('Failed to create user');
        }

        userId = newUser.id;
        userData = newUser;
        this.logger.log(`New user ${userId} created successfully`);

        // Ensure wallet was created by trigger
        // If trigger failed, create wallet manually using database function
        const { data: wallet, error: walletError } = await this.supabase
          .from('user_wallets')
          .select('id')
          .eq('user_id', userId)
          .single();

        if (walletError || !wallet) {
          this.logger.warn(`Wallet not found for new user ${userId}, creating via fallback`);

          // Call database function to ensure wallet exists
          const { data: walletId, error: createWalletError } = await this.supabase
            .rpc('ensure_user_wallet', { p_user_id: userId });

          if (createWalletError) {
            this.logger.error(`Failed to create wallet for user ${userId}`, createWalletError);
            // Don't throw - user is created, wallet can be created later
          } else {
            this.logger.log(`Wallet ${walletId} created via fallback for user ${userId}`);
          }
        } else {
          this.logger.log(`Wallet ${wallet.id} created successfully for user ${userId}`);
        }
      }

      // Generate JWT token compatible with Supabase
      const accessToken = this.generateSupabaseCompatibleJWT(userId);

      return {
        accessToken,
        user: userData,
      };
    } catch (error) {
      this.logger.error('Authentication failed', error);
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
    try {
      const payload = this.jwtService.verify(token);

      // Fetch user from Supabase
      const { data: user, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', payload.sub)
        .single();

      if (error || !user) {
        throw new UnauthorizedException('User not found');
      }

      return user;
    } catch (error) {
      this.logger.error('Token validation failed', error);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
