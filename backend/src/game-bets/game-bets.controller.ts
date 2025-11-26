/**
 * Game Bets Controller
 * REST API endpoints for game betting
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GameBetsService, CreateBetDto } from './game-bets.service';

interface AuthRequest extends Request {
  user: {
    sub: string;
    email?: string;
  };
}

@Controller('game-bets')
@UseGuards(JwtAuthGuard)
export class GameBetsController {
  private readonly logger = new Logger(GameBetsController.name);

  constructor(private readonly gameBetsService: GameBetsService) {}

  /**
   * GET /api/game-bets/:gameId
   * Get bet for a specific game
   */
  @Get(':gameId')
  async getBet(@Param('gameId') gameId: string, @Request() req: AuthRequest) {
    const userId = req.user.sub;
    this.logger.log(`GET /game-bets/${gameId} - User: ${userId}`);

    const bet = await this.gameBetsService.getBetByGameId(gameId);

    return {
      bet,
    };
  }

  /**
   * POST /api/game-bets
   * Create a new bet (white player only)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createBet(@Request() req: AuthRequest, @Body() createBetDto: CreateBetDto) {
    const userId = req.user.sub;
    this.logger.log(`POST /game-bets - User: ${userId}`);

    const bet = await this.gameBetsService.createBet(userId, createBetDto);

    return {
      success: true,
      bet,
    };
  }

  /**
   * POST /api/game-bets/:gameId/accept
   * Accept bet terms (black player)
   */
  @Post(':gameId/accept')
  @HttpCode(HttpStatus.OK)
  async acceptBet(@Param('gameId') gameId: string, @Request() req: AuthRequest) {
    const userId = req.user.sub;
    this.logger.log(`POST /game-bets/${gameId}/accept - User: ${userId}`);

    const bet = await this.gameBetsService.acceptBet(userId, gameId);

    return {
      success: true,
      bet,
    };
  }

  /**
   * POST /api/game-bets/:gameId/deposit
   * Deposit bet amount
   */
  @Post(':gameId/deposit')
  @HttpCode(HttpStatus.OK)
  async depositBet(@Param('gameId') gameId: string, @Request() req: AuthRequest) {
    const userId = req.user.sub;
    this.logger.log(`POST /game-bets/${gameId}/deposit - User: ${userId}`);

    const result = await this.gameBetsService.depositBet(userId, gameId);

    return {
      success: result.success,
      both_deposited: result.both_deposited,
      error: result.error,
    };
  }

  /**
   * DELETE /api/game-bets/:gameId
   * Cancel bet (before game starts)
   */
  @Delete(':gameId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelBet(@Param('gameId') gameId: string, @Request() req: AuthRequest) {
    const userId = req.user.sub;
    this.logger.log(`DELETE /game-bets/${gameId} - User: ${userId}`);

    await this.gameBetsService.cancelBet(userId, gameId);
  }

  /**
   * POST /api/game-bets/calculate-payout
   * Calculate potential payout for a bet amount
   */
  @Post('calculate-payout')
  @HttpCode(HttpStatus.OK)
  async calculatePayout(@Body() body: { bet_amount: number; fee_percentage?: number }) {
    this.logger.log(`POST /game-bets/calculate-payout`);

    const payout = this.gameBetsService.calculatePayout(
      body.bet_amount,
      body.fee_percentage || 10,
    );

    const totalPot = body.bet_amount * 2;
    const platformFee = totalPot - payout;

    return {
      bet_amount: body.bet_amount,
      total_pot: totalPot,
      platform_fee: platformFee,
      platform_fee_percentage: body.fee_percentage || 10,
      winner_payout: payout,
    };
  }

  /**
   * GET /api/game-bets/statistics
   * Get overall betting statistics
   * TODO: Add admin guard
   */
  @Get('stats/overview')
  async getStatistics() {
    this.logger.log(`GET /game-bets/stats/overview`);

    const stats = await this.gameBetsService.getBetStatistics();

    return stats;
  }
}
