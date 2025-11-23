/**
 * Rating Controller
 * REST API for rating calculations
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Glicko2Service, GlickoRating, GameResult } from './glicko2.service';

// DTOs
class CalculateRatingDto {
  player!: GlickoRating;
  results!: GameResult[];
}

class CalculateSingleGameDto {
  player!: GlickoRating;
  opponent!: GlickoRating;
  result!: number; // 1 = win, 0.5 = draw, 0 = loss
}

class WinProbabilityDto {
  playerRating!: number;
  opponentRating!: number;
  opponentRD?: number;
}

class RatingChangePreviewDto {
  player!: GlickoRating;
  opponent!: GlickoRating;
}

@Controller('api/rating')
export class RatingController {
  constructor(private readonly glicko2: Glicko2Service) {}

  /**
   * POST /api/rating/calculate
   * Calculate new rating after multiple games
   */
  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  calculateRating(@Body() dto: CalculateRatingDto) {
    const newRating = this.glicko2.calculateNewRating(
      dto.player,
      dto.results,
    );

    return {
      success: true,
      data: {
        oldRating: dto.player,
        newRating,
        change: {
          rating: newRating.rating - dto.player.rating,
          rd: newRating.rd - dto.player.rd,
          volatility: newRating.volatility - dto.player.volatility,
        },
      },
    };
  }

  /**
   * POST /api/rating/calculate-game
   * Calculate new rating after a single game
   */
  @Post('calculate-game')
  @HttpCode(HttpStatus.OK)
  calculateSingleGame(@Body() dto: CalculateSingleGameDto) {
    const newRating = this.glicko2.calculateSingleGame(
      dto.player,
      dto.opponent,
      dto.result,
    );

    return {
      success: true,
      data: {
        oldRating: dto.player,
        newRating,
        change: newRating.rating - dto.player.rating,
      },
    };
  }

  /**
   * POST /api/rating/win-probability
   * Calculate win probability between two players
   */
  @Post('win-probability')
  @HttpCode(HttpStatus.OK)
  calculateWinProbability(@Body() dto: WinProbabilityDto) {
    const winProbability = this.glicko2.calculateWinProbability(
      dto.playerRating,
      dto.opponentRating,
      dto.opponentRD,
    );

    return {
      success: true,
      data: {
        winProbability: Math.round(winProbability * 100 * 100) / 100,
        drawProbability: Math.round((1 - winProbability * 2) * 100 * 100) / 100,
        lossProbability: Math.round((1 - winProbability) * 100 * 100) / 100,
      },
    };
  }

  /**
   * POST /api/rating/preview
   * Preview rating changes for possible game outcomes
   */
  @Post('preview')
  @HttpCode(HttpStatus.OK)
  getRatingChangePreview(@Body() dto: RatingChangePreviewDto) {
    const preview = this.glicko2.calculateRatingChangePreview(
      dto.player,
      dto.opponent,
    );

    const winProbability = this.glicko2.calculateWinProbability(
      dto.player.rating,
      dto.opponent.rating,
      dto.opponent.rd,
    );

    return {
      success: true,
      data: {
        ratingChanges: preview,
        probabilities: {
          win: Math.round(winProbability * 100 * 100) / 100,
          draw: Math.round((1 - winProbability * 2) * 100 * 100) / 100,
          loss: Math.round((1 - winProbability) * 100 * 100) / 100,
        },
        expectedChange:
          preview.win * winProbability +
          preview.draw * (1 - winProbability * 2) +
          preview.loss * (1 - winProbability),
      },
    };
  }

  /**
   * GET /api/rating/default
   * Get default rating for new player
   */
  @Get('default')
  @HttpCode(HttpStatus.OK)
  getDefaultRating() {
    const defaultRating = this.glicko2.getDefaultRating();

    return {
      success: true,
      data: defaultRating,
    };
  }

  /**
   * GET /api/rating/provisional
   * Check if rating is provisional (high RD)
   */
  @Get('provisional')
  @HttpCode(HttpStatus.OK)
  isProvisional(@Query('rd') rd: string) {
    const rdValue = parseFloat(rd);
    const isProvisional = this.glicko2.isProvisional(rdValue);

    return {
      success: true,
      data: {
        rd: rdValue,
        isProvisional,
        threshold: 110,
      },
    };
  }
}
