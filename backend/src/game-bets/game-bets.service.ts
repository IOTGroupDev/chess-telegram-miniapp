/**
 * Game Bets Service
 * Business logic for game betting operations
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { WalletService } from '../wallet/wallet.service';

export type BetType = 'free' | 'coins' | 'stars';
export type BetStatus = 'pending' | 'locked' | 'completed' | 'cancelled' | 'refunded';
export type CurrencyType = 'coins' | 'stars';

export interface GameBet {
  id: string;
  game_id: string;
  bet_type: BetType;
  bet_amount: number | null;
  currency: CurrencyType | null;
  white_deposit_status: BetStatus;
  black_deposit_status: BetStatus;
  white_deposited_at: string | null;
  black_deposited_at: string | null;
  total_pot: number;
  platform_fee_percentage: number;
  platform_fee: number;
  winner_payout: number | null;
  terms_accepted_by_white: boolean;
  terms_accepted_by_black: boolean;
  status: BetStatus;
  payout_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateBetDto {
  game_id: string;
  bet_type: BetType;
  bet_amount?: number;
  currency?: CurrencyType;
}

@Injectable()
export class GameBetsService {
  private readonly logger = new Logger(GameBetsService.name);
  private readonly supabase: SupabaseClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly walletService: WalletService,
  ) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be defined');
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  /**
   * Get bet by game ID
   */
  async getBetByGameId(gameId: string): Promise<GameBet | null> {
    this.logger.log(`Getting bet for game: ${gameId}`);

    const { data, error } = await this.supabase
      .from('game_bets')
      .select('*')
      .eq('game_id', gameId)
      .maybeSingle();

    if (error) {
      this.logger.error(`Error fetching bet: ${error.message}`);
      throw new BadRequestException('Failed to fetch bet');
    }

    return data;
  }

  /**
   * Create a new bet
   * Only white player can create bet
   */
  async createBet(userId: string, createBetDto: CreateBetDto): Promise<GameBet> {
    this.logger.log(`Creating bet for game ${createBetDto.game_id}`);

    // Verify user is white player
    const { data: game, error: gameError } = await this.supabase
      .from('games')
      .select('white_player_id, black_player_id, status')
      .eq('id', createBetDto.game_id)
      .single();

    if (gameError || !game) {
      throw new NotFoundException('Game not found');
    }

    if (game.white_player_id !== userId) {
      throw new ForbiddenException('Only white player can create bet');
    }

    // Validate bet data
    if (createBetDto.bet_type !== 'free') {
      if (!createBetDto.bet_amount || !createBetDto.currency) {
        throw new BadRequestException('Amount and currency required for paid bets');
      }

      if (createBetDto.bet_amount <= 0) {
        throw new BadRequestException('Bet amount must be positive');
      }

      // Check balance
      const hasSufficient = await this.walletService.hasSufficientBalance(
        userId,
        createBetDto.bet_amount,
        createBetDto.currency,
      );

      if (!hasSufficient) {
        throw new BadRequestException('Insufficient balance');
      }
    }

    // Prepare bet data
    const betData: any = {
      game_id: createBetDto.game_id,
      bet_type: createBetDto.bet_type,
    };

    if (createBetDto.bet_type !== 'free') {
      betData.bet_amount = createBetDto.bet_amount;
      betData.currency = createBetDto.currency;
    }

    // Create bet
    const { data: bet, error: betError } = await this.supabase
      .from('game_bets')
      .insert(betData)
      .select()
      .single();

    if (betError) {
      this.logger.error(`Error creating bet: ${betError.message}`);
      throw new BadRequestException('Failed to create bet');
    }

    // Update game status
    if (createBetDto.bet_type === 'free') {
      // Free game - mark terms accepted and start immediately
      await this.supabase
        .from('game_bets')
        .update({
          terms_accepted_by_white: true,
          terms_accepted_by_black: true,
          status: 'completed',
        })
        .eq('id', bet.id);

      await this.supabase
        .from('games')
        .update({
          status: 'active',
          started_at: new Date().toISOString(),
        })
        .eq('id', createBetDto.game_id);
    } else {
      // Paid game - wait for acceptance
      await this.supabase
        .from('games')
        .update({ status: 'pending_bet_acceptance' })
        .eq('id', createBetDto.game_id);
    }

    return bet;
  }

  /**
   * Accept bet terms
   * Black player accepts white's bet proposal
   */
  async acceptBet(userId: string, gameId: string): Promise<GameBet> {
    this.logger.log(`User ${userId} accepting bet for game ${gameId}`);

    // Get game and bet
    const { data: game } = await this.supabase
      .from('games')
      .select('white_player_id, black_player_id')
      .eq('id', gameId)
      .single();

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    const bet = await this.getBetByGameId(gameId);
    if (!bet) {
      throw new NotFoundException('Bet not found');
    }

    // Determine player color and field to update
    const isWhitePlayer = game.white_player_id === userId;
    const isBlackPlayer = game.black_player_id === userId;

    if (!isWhitePlayer && !isBlackPlayer) {
      throw new ForbiddenException('User is not a player in this game');
    }

    // Check balance before accepting
    if (bet.bet_amount && bet.currency) {
      const hasSufficient = await this.walletService.hasSufficientBalance(
        userId,
        bet.bet_amount,
        bet.currency,
      );

      if (!hasSufficient) {
        throw new BadRequestException('Insufficient balance to accept bet');
      }
    }

    const fieldToUpdate = isWhitePlayer ? 'terms_accepted_by_white' : 'terms_accepted_by_black';

    // Update bet to mark terms as accepted
    const { data: updatedBet, error: updateError } = await this.supabase
      .from('game_bets')
      .update({ [fieldToUpdate]: true })
      .eq('game_id', gameId)
      .select()
      .single();

    if (updateError) {
      this.logger.error(`Error accepting bet: ${updateError.message}`);
      throw new BadRequestException('Failed to accept bet');
    }

    // Check if both accepted
    if (updatedBet.terms_accepted_by_white && updatedBet.terms_accepted_by_black) {
      // Both accepted - move to pending deposits
      await this.supabase.from('games').update({ status: 'pending_deposits' }).eq('id', gameId);
    }

    return updatedBet;
  }

  /**
   * Deposit bet amount
   * Calls database function to handle deposit
   */
  async depositBet(userId: string, gameId: string): Promise<{
    success: boolean;
    both_deposited?: boolean;
    error?: string;
  }> {
    this.logger.log(`User ${userId} depositing for game ${gameId}`);

    const { data, error } = await this.supabase.rpc('deposit_game_bet', {
      p_game_id: gameId,
      p_user_id: userId,
    });

    if (error) {
      this.logger.error(`Error depositing bet: ${error.message}`);
      throw new BadRequestException(error.message);
    }

    return data;
  }

  /**
   * Cancel bet (before deposits)
   */
  async cancelBet(userId: string, gameId: string): Promise<void> {
    this.logger.log(`User ${userId} canceling bet for game ${gameId}`);

    // Verify user is a player
    const { data: game } = await this.supabase
      .from('games')
      .select('white_player_id, black_player_id, status')
      .eq('id', gameId)
      .single();

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    if (game.white_player_id !== userId && game.black_player_id !== userId) {
      throw new ForbiddenException('User is not a player in this game');
    }

    // Can only cancel if game hasn't started
    if (game.status === 'active' || game.status === 'finished') {
      throw new BadRequestException('Cannot cancel bet for active or finished game');
    }

    // Call refund function
    const { error } = await this.supabase.rpc('refund_game_bet', {
      p_game_id: gameId,
      p_reason: 'Bet cancelled by player',
    });

    if (error) {
      this.logger.error(`Error refunding bet: ${error.message}`);
      throw new BadRequestException('Failed to cancel bet');
    }
  }

  /**
   * Calculate potential payout
   */
  calculatePayout(betAmount: number, feePercentage: number = 10): number {
    const totalPot = betAmount * 2;
    const platformFee = totalPot * (feePercentage / 100);
    return totalPot - platformFee;
  }

  /**
   * Get bet statistics
   */
  async getBetStatistics(): Promise<{
    total_bets: number;
    total_volume: number;
    total_fees_collected: number;
    free_games: number;
    paid_games: number;
  }> {
    const { data, error } = await this.supabase
      .from('game_bets')
      .select('bet_type, total_pot, platform_fee, status');

    if (error) {
      this.logger.error(`Error fetching bet statistics: ${error.message}`);
      throw new BadRequestException('Failed to fetch statistics');
    }

    const stats = {
      total_bets: data.length,
      total_volume: 0,
      total_fees_collected: 0,
      free_games: 0,
      paid_games: 0,
    };

    data.forEach((bet) => {
      if (bet.bet_type === 'free') {
        stats.free_games++;
      } else {
        stats.paid_games++;
        if (bet.status === 'completed') {
          stats.total_volume += bet.total_pot;
          stats.total_fees_collected += bet.platform_fee;
        }
      }
    });

    return stats;
  }
}
