/**
 * Payment Service
 * Telegram Stars payment integration
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WalletService } from '../wallet/wallet.service';

export interface CreateInvoiceDto {
  amount: number; // Amount in Stars
  description?: string;
}

export interface TelegramInvoice {
  title: string;
  description: string;
  payload: string;
  provider_token: string;
  currency: string;
  prices: Array<{ label: string; amount: number }>;
}

export interface PreCheckoutQuery {
  id: string;
  from: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
  };
  currency: string;
  total_amount: number;
  invoice_payload: string;
}

export interface SuccessfulPayment {
  currency: string;
  total_amount: number;
  invoice_payload: string;
  telegram_payment_charge_id: string;
  provider_payment_charge_id: string;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly walletService: WalletService,
  ) {}

  /**
   * Create a Telegram Stars invoice
   * @param userId User ID
   * @param createInvoiceDto Invoice details
   * @returns Invoice object for Telegram Bot API
   */
  async createStarsInvoice(
    userId: string,
    createInvoiceDto: CreateInvoiceDto,
  ): Promise<TelegramInvoice> {
    const { amount, description } = createInvoiceDto;

    // Validate amount
    if (amount < 1) {
      throw new BadRequestException('Minimum purchase amount is 1 Star');
    }

    if (amount > 2500) {
      throw new BadRequestException('Maximum purchase amount is 2500 Stars');
    }

    // Create unique payload for this transaction
    const payload = JSON.stringify({
      userId,
      amount,
      timestamp: Date.now(),
      type: 'stars_purchase',
    });

    const invoice: TelegramInvoice = {
      title: `Purchase ${amount} Telegram Stars`,
      description:
        description || `Add ${amount} Stars to your Chess Master wallet`,
      payload,
      provider_token: '', // Empty for Telegram Stars
      currency: 'XTR', // Telegram Stars currency code
      prices: [
        {
          label: `${amount} Stars`,
          amount, // Amount in Stars (no conversion needed)
        },
      ],
    };

    this.logger.log(
      `Created Stars invoice for user ${userId}: ${amount} Stars`,
    );

    return invoice;
  }

  /**
   * Validate pre-checkout query before payment
   * @param query Pre-checkout query from Telegram
   * @returns Validation result
   */
  async validatePreCheckout(query: PreCheckoutQuery): Promise<{
    ok: boolean;
    error_message?: string;
  }> {
    try {
      const payload = JSON.parse(query.invoice_payload);

      // Validate payload structure
      if (!payload.userId || !payload.amount || !payload.type) {
        return {
          ok: false,
          error_message: 'Invalid payment payload',
        };
      }

      // Check if payload is not too old (24 hours)
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      if (Date.now() - payload.timestamp > maxAge) {
        return {
          ok: false,
          error_message: 'Payment link expired. Please create a new one.',
        };
      }

      // Validate currency
      if (query.currency !== 'XTR') {
        return {
          ok: false,
          error_message: 'Invalid currency. Only Telegram Stars accepted.',
        };
      }

      // Validate amount matches
      if (query.total_amount !== payload.amount) {
        return {
          ok: false,
          error_message: 'Payment amount mismatch',
        };
      }

      this.logger.log(
        `Pre-checkout validated for user ${payload.userId}: ${payload.amount} Stars`,
      );

      return { ok: true };
    } catch (error) {
      this.logger.error('Pre-checkout validation failed', error);
      return {
        ok: false,
        error_message: 'Invalid payment data',
      };
    }
  }

  /**
   * Process successful payment
   * @param userId User ID from authenticated request
   * @param payment Successful payment data from Telegram
   */
  async processSuccessfulPayment(
    userId: string,
    payment: SuccessfulPayment,
  ): Promise<void> {
    try {
      const payload = JSON.parse(payment.invoice_payload);

      // Verify user ID matches
      if (payload.userId !== userId) {
        throw new BadRequestException('User ID mismatch');
      }

      // Verify currency
      if (payment.currency !== 'XTR') {
        throw new BadRequestException('Invalid currency');
      }

      // Add Stars to wallet
      const amount = payment.total_amount;
      await this.walletService.addStars(
        userId,
        amount,
        `Purchased ${amount} Telegram Stars`,
        {
          telegram_payment_charge_id: payment.telegram_payment_charge_id,
          provider_payment_charge_id: payment.provider_payment_charge_id,
        },
      );

      this.logger.log(
        `Successfully processed payment for user ${userId}: ${amount} Stars (charge: ${payment.telegram_payment_charge_id})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process payment for user ${userId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get recommended Stars packages
   */
  getStarsPackages(): Array<{
    amount: number;
    label: string;
    bonus?: number;
  }> {
    return [
      { amount: 10, label: 'Starter Pack' },
      { amount: 50, label: 'Popular Pack', bonus: 5 },
      { amount: 100, label: 'Premium Pack', bonus: 15 },
      { amount: 250, label: 'Elite Pack', bonus: 50 },
      { amount: 500, label: 'Champion Pack', bonus: 125 },
      { amount: 1000, label: 'Master Pack', bonus: 300 },
    ];
  }
}
