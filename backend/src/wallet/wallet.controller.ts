/**
 * Wallet Controller
 * REST API endpoints for wallet operations
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WalletService } from './wallet.service';

interface AuthRequest extends Request {
  user: {
    sub: string;
    email?: string;
  };
}

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  private readonly logger = new Logger(WalletController.name);

  constructor(private readonly walletService: WalletService) {}

  /**
   * GET /api/wallet
   * Get current user's wallet
   */
  @Get()
  async getWallet(@Request() req: AuthRequest) {
    const userId = req.user.sub;
    this.logger.log(`GET /wallet - User: ${userId}`);
    return this.walletService.getWallet(userId);
  }

  /**
   * GET /api/wallet/balance
   * Get balance for specific currency
   */
  @Get('balance')
  async getBalance(@Request() req: AuthRequest, @Query('currency') currency: 'coins' | 'stars' = 'coins') {
    const userId = req.user.sub;
    this.logger.log(`GET /wallet/balance?currency=${currency} - User: ${userId}`);

    const balance = await this.walletService.getBalance(userId, currency);

    return {
      currency,
      balance,
    };
  }

  /**
   * GET /api/wallet/transactions
   * Get transaction history
   */
  @Get('transactions')
  async getTransactions(
    @Request() req: AuthRequest,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
  ) {
    const userId = req.user.sub;
    const limitNum = parseInt(limit, 10);
    const offsetNum = parseInt(offset, 10);

    this.logger.log(
      `GET /wallet/transactions?limit=${limitNum}&offset=${offsetNum} - User: ${userId}`,
    );

    const transactions = await this.walletService.getTransactions(userId, limitNum, offsetNum);

    return {
      transactions,
      limit: limitNum,
      offset: offsetNum,
      count: transactions.length,
    };
  }

  /**
   * GET /api/wallet/statistics
   * Get wallet statistics (winnings, losses, etc.)
   */
  @Get('statistics')
  async getStatistics(@Request() req: AuthRequest) {
    const userId = req.user.sub;
    this.logger.log(`GET /wallet/statistics - User: ${userId}`);
    return this.walletService.getStatistics(userId);
  }

  /**
   * POST /api/wallet/check-balance
   * Check if user has sufficient balance
   */
  @Post('check-balance')
  @HttpCode(HttpStatus.OK)
  async checkBalance(
    @Request() req: AuthRequest,
    @Body() body: { amount: number; currency: 'coins' | 'stars' },
  ) {
    const userId = req.user.sub;
    this.logger.log(`POST /wallet/check-balance - User: ${userId}`);

    const hasSufficient = await this.walletService.hasSufficientBalance(
      userId,
      body.amount,
      body.currency,
    );

    return {
      has_sufficient_balance: hasSufficient,
      amount: body.amount,
      currency: body.currency,
    };
  }

  /**
   * POST /api/wallet/add-coins
   * Add coins to wallet (admin/rewards)
   * TODO: Add admin guard
   */
  @Post('add-coins')
  @HttpCode(HttpStatus.OK)
  async addCoins(@Request() req: AuthRequest, @Body() body: { amount: number; description?: string }) {
    const userId = req.user.sub;
    this.logger.log(`POST /wallet/add-coins - User: ${userId}, Amount: ${body.amount}`);

    const wallet = await this.walletService.addCoins(
      userId,
      body.amount,
      body.description || 'Coins added',
    );

    return {
      success: true,
      wallet,
    };
  }

  /**
   * POST /api/wallet/withdraw
   * Withdraw coins from wallet
   */
  @Post('withdraw')
  @HttpCode(HttpStatus.OK)
  async withdrawCoins(@Request() req: AuthRequest, @Body() body: { amount: number; description?: string }) {
    const userId = req.user.sub;
    this.logger.log(`POST /wallet/withdraw - User: ${userId}, Amount: ${body.amount}`);

    const wallet = await this.walletService.withdrawCoins(
      userId,
      body.amount,
      body.description || 'Withdrawal',
    );

    return {
      success: true,
      wallet,
    };
  }
}
