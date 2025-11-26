/**
 * Analysis Controller
 * REST API for game analysis
 */

import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Param,
} from '@nestjs/common';
import { AnalysisService } from './analysis.service';

// DTOs
class AnalyzeGameDto {
  pgn!: string;
}

class AnalyzeMoveDto {
  playerMove!: string;
  bestMove!: string;
  fenBefore!: string;
  fenAfter!: string;
  evalBefore!: number;
  evalAfter!: number;
  moveQuality!: 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
}

@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  /**
   * GET /api/analysis/health
   * Health check
   */
  @Get('health')
  @HttpCode(HttpStatus.OK)
  health() {
    return {
      status: 'ok',
      service: 'analysis',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /api/analysis/game
   * Analyze a completed game from PGN
   */
  @Post('game')
  @HttpCode(HttpStatus.OK)
  async analyzeGame(@Body() dto: AnalyzeGameDto) {
    const analysis = await this.analysisService.analyzeGame(dto.pgn);

    return {
      success: true,
      data: analysis,
    };
  }

  /**
   * POST /api/analysis/move
   * Get AI-powered detailed analysis for a single move
   */
  @Post('move')
  @HttpCode(HttpStatus.OK)
  async analyzeMove(@Body() dto: AnalyzeMoveDto) {
    const explanation = await this.analysisService.analyzeSingleMove(
      dto.playerMove,
      dto.bestMove,
      dto.fenBefore,
      dto.fenAfter,
      dto.evalBefore,
      dto.evalAfter,
      dto.moveQuality,
    );

    return {
      success: true,
      data: {
        explanation,
      },
    };
  }

  /**
   * Example response format:
   * {
   *   success: true,
   *   data: {
   *     whiteAccuracy: 87.3,
   *     blackAccuracy: 82.1,
   *     moves: [
   *       {
   *         moveNumber: 1,
   *         move: "e2e4",
   *         san: "e4",
   *         classification: "best",
   *         engineEval: 20,
   *         bestMove: "e2e4",
   *         evalDrop: 0
   *       },
   *       ...
   *     ],
   *     keyMoments: [
   *       {
   *         moveNumber: 14,
   *         move: "f6g4",
   *         san: "Ng4",
   *         classification: "blunder",
   *         engineEval: -250,
   *         bestMove: "f6h5",
   *         evalDrop: 320
   *       }
   *     ],
   *     summary: "White played accurately throughout the game...",
   *     whiteStats: {
   *       best: 18,
   *       excellent: 5,
   *       good: 3,
   *       inaccuracy: 2,
   *       mistake: 1,
   *       blunder: 0
   *     },
   *     blackStats: {
   *       best: 15,
   *       excellent: 4,
   *       good: 4,
   *       inaccuracy: 3,
   *       mistake: 2,
   *       blunder: 1
   *     }
   *   }
   * }
   */
}
