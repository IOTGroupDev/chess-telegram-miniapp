/**
 * Authentication Controller
 * Handles Telegram authentication endpoints
 */

import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';

class TelegramAuthDto {
  initData: string;
}

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/auth/telegram
   * Authenticates user via Telegram initData
   *
   * @param body - { initData: string }
   * @returns { accessToken: string, user: User }
   */
  @Post('telegram')
  @HttpCode(HttpStatus.OK)
  async authenticateTelegram(@Body() body: TelegramAuthDto) {
    this.logger.log('Telegram authentication request received');

    try {
      const result = await this.authService.authenticateUser(body.initData);

      this.logger.log(`User ${result.user.id} authenticated successfully`);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error('Authentication failed', error);
      throw error;
    }
  }
}
