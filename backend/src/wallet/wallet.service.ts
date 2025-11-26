/**
 * Wallet Service
 * Business logic for wallet operations
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface UserWallet {
  id: string;
  user_id: string;
  balance_coins: number;
  balance_stars: number;
  total_deposited: number;
  total_withdrawn: number;
  total_won: number;
  total_lost: number;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  user_id: string;
  wallet_id: string;
  transaction_type: string;
  amount: number;
  currency: 'coins' | 'stars';
  balance_before: number;
  balance_after: number;
  game_id: string | null;
  game_bet_id: string | null;
  description: string | null;
  metadata: any;
  created_at: string;
}

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);
  private readonly supabase: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be defined');
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  /**
   * Get user wallet by user ID
   */
  async getWallet(userId: string): Promise<UserWallet> {
    this.logger.log(`Getting wallet for user: ${userId}`);

    const { data, error } = await this.supabase
      .from('user_wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException(`Wallet not found for user ${userId}`);
      }
      this.logger.error(`Error fetching wallet: ${error.message}`);
      throw new BadRequestException('Failed to fetch wallet');
    }

    return data;
  }

  /**
   * Get transaction history for user
   */
  async getTransactions(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<WalletTransaction[]> {
    this.logger.log(`Getting transactions for user: ${userId}`);

    const { data, error } = await this.supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      this.logger.error(`Error fetching transactions: ${error.message}`);
      throw new BadRequestException('Failed to fetch transactions');
    }

    return data || [];
  }

  /**
   * Check if user has sufficient balance
   */
  async hasSufficientBalance(
    userId: string,
    amount: number,
    currency: 'coins' | 'stars',
  ): Promise<boolean> {
    const { data, error } = await this.supabase.rpc('has_sufficient_balance', {
      p_user_id: userId,
      p_amount: amount,
      p_currency: currency,
    });

    if (error) {
      this.logger.error(`Error checking balance: ${error.message}`);
      return false;
    }

    return data;
  }

  /**
   * Get balance for specific currency
   */
  async getBalance(userId: string, currency: 'coins' | 'stars'): Promise<number> {
    const wallet = await this.getWallet(userId);
    return currency === 'coins' ? wallet.balance_coins : wallet.balance_stars;
  }

  /**
   * Manually add coins to wallet (admin function or rewards)
   * This is useful for promotional rewards, admin operations, etc.
   */
  async addCoins(
    userId: string,
    amount: number,
    description: string = 'Manual deposit',
  ): Promise<UserWallet> {
    this.logger.log(`Adding ${amount} coins to user ${userId}`);

    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    const wallet = await this.getWallet(userId);

    // Update wallet balance
    const { data: updatedWallet, error: updateError } = await this.supabase
      .from('user_wallets')
      .update({
        balance_coins: wallet.balance_coins + amount,
        total_deposited: wallet.total_deposited + amount,
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      this.logger.error(`Error updating wallet: ${updateError.message}`);
      throw new BadRequestException('Failed to update wallet');
    }

    // Record transaction
    await this.supabase.from('wallet_transactions').insert({
      user_id: userId,
      wallet_id: wallet.id,
      transaction_type: 'deposit_coins',
      amount,
      currency: 'coins',
      balance_before: wallet.balance_coins,
      balance_after: wallet.balance_coins + amount,
      description,
    });

    return updatedWallet;
  }

  /**
   * Add Stars to wallet (from Telegram payment)
   */
  async addStars(
    userId: string,
    amount: number,
    description: string = 'Stars purchase',
    metadata?: any,
  ): Promise<UserWallet> {
    this.logger.log(`Adding ${amount} Stars to user ${userId}`);

    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    const wallet = await this.getWallet(userId);

    // Update wallet balance
    const { data: updatedWallet, error: updateError } = await this.supabase
      .from('user_wallets')
      .update({
        balance_stars: wallet.balance_stars + amount,
        total_deposited: wallet.total_deposited + amount,
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      this.logger.error(`Error updating wallet: ${updateError.message}`);
      throw new BadRequestException('Failed to update wallet');
    }

    // Record transaction
    await this.supabase.from('wallet_transactions').insert({
      user_id: userId,
      wallet_id: wallet.id,
      transaction_type: 'deposit_stars',
      amount,
      currency: 'stars',
      balance_before: wallet.balance_stars,
      balance_after: wallet.balance_stars + amount,
      description,
      metadata,
    });

    return updatedWallet;
  }

  /**
   * Withdraw coins from wallet (convert to real money, etc.)
   */
  async withdrawCoins(
    userId: string,
    amount: number,
    description: string = 'Withdrawal',
  ): Promise<UserWallet> {
    this.logger.log(`Withdrawing ${amount} coins from user ${userId}`);

    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    const wallet = await this.getWallet(userId);

    if (wallet.balance_coins < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    // Update wallet balance
    const { data: updatedWallet, error: updateError } = await this.supabase
      .from('user_wallets')
      .update({
        balance_coins: wallet.balance_coins - amount,
        total_withdrawn: wallet.total_withdrawn + amount,
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      this.logger.error(`Error updating wallet: ${updateError.message}`);
      throw new BadRequestException('Failed to update wallet');
    }

    // Record transaction
    await this.supabase.from('wallet_transactions').insert({
      user_id: userId,
      wallet_id: wallet.id,
      transaction_type: 'withdraw_coins',
      amount,
      currency: 'coins',
      balance_before: wallet.balance_coins,
      balance_after: wallet.balance_coins - amount,
      description,
    });

    return updatedWallet;
  }

  /**
   * Get wallet statistics
   */
  async getStatistics(userId: string) {
    const wallet = await this.getWallet(userId);

    return {
      total_deposited: wallet.total_deposited,
      total_withdrawn: wallet.total_withdrawn,
      total_won: wallet.total_won,
      total_lost: wallet.total_lost,
      net_profit: wallet.total_won - wallet.total_lost,
      current_balance_coins: wallet.balance_coins,
      current_balance_stars: wallet.balance_stars,
    };
  }
}
