/**
 * Payment Controller
 * REST API endpoints for Telegram Stars payments
 */

import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  PaymentService,
  CreateInvoiceDto,
  PreCheckoutQuery,
  SuccessfulPayment,
} from './payment.service';

interface AuthRequest extends Request {
  user: {
    sub: string;
    email?: string;
  };
}

@Controller('payment')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(private readonly paymentService: PaymentService) {}

  /**
   * POST /api/payment/create-invoice
   * Create a Telegram Stars invoice for purchasing Stars
   */
  @Post('create-invoice')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async createInvoice(
    @Request() req: AuthRequest,
    @Body() createInvoiceDto: CreateInvoiceDto,
  ) {
    const userId = req.user.sub;
    this.logger.log(
      `POST /payment/create-invoice - User: ${userId}, Amount: ${createInvoiceDto.amount}`,
    );

    const invoice = await this.paymentService.createStarsInvoice(
      userId,
      createInvoiceDto,
    );

    return {
      success: true,
      invoice,
    };
  }

  /**
   * POST /api/payment/pre-checkout
   * Validate pre-checkout query from Telegram
   * This endpoint is called by Telegram Bot API before processing payment
   */
  @Post('pre-checkout')
  @HttpCode(HttpStatus.OK)
  async preCheckout(@Body() query: PreCheckoutQuery) {
    this.logger.log(
      `POST /payment/pre-checkout - Query ID: ${query.id}, Amount: ${query.total_amount}`,
    );

    const result = await this.paymentService.validatePreCheckout(query);

    return result;
  }

  /**
   * POST /api/payment/successful-payment
   * Process successful payment from Telegram
   */
  @Post('successful-payment')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async successfulPayment(
    @Request() req: AuthRequest,
    @Body() payment: SuccessfulPayment,
  ) {
    const userId = req.user.sub;
    this.logger.log(
      `POST /payment/successful-payment - User: ${userId}, Amount: ${payment.total_amount}`,
    );

    await this.paymentService.processSuccessfulPayment(userId, payment);

    return {
      success: true,
      message: 'Payment processed successfully',
    };
  }

  /**
   * GET /api/payment/packages
   * Get recommended Stars packages with bonuses
   */
  @Get('packages')
  @HttpCode(HttpStatus.OK)
  async getPackages() {
    this.logger.log(`GET /payment/packages`);

    const packages = this.paymentService.getStarsPackages();

    return {
      packages,
    };
  }
}
