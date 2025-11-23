/**
 * Engine Controller
 * REST API for chess engine operations
 */

import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Query,
} from '@nestjs/common';
import { EngineManagerService } from './engine-manager.service';
import { EngineOptions } from './stockfish.service';

// DTOs
class AnalyzePositionDto {
  fen: string;
  depth?: number;
  multiPv?: number;
}

class GetBestMoveDto {
  fen: string;
  depth?: number;
}

class QuickEvalDto {
  fen: string;
}

@Controller('api/engine')
export class EngineController {
  constructor(private readonly engineManager: EngineManagerService) {}

  /**
   * GET /api/engine/health
   * Health check
   */
  @Get('health')
  @HttpCode(HttpStatus.OK)
  health() {
    return {
      status: 'ok',
      service: 'engine',
      queueLength: this.engineManager.getQueueLength(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /api/engine/analyze
   * Analyze chess position
   */
  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  async analyzePosition(@Body() dto: AnalyzePositionDto) {
    const options: EngineOptions = {
      depth: dto.depth || 20,
      multiPv: dto.multiPv || 1,
    };

    const result = await this.engineManager.analyzePosition(dto.fen, options);

    return {
      success: true,
      data: {
        bestMove: result.bestMove,
        ponder: result.ponder,
        evaluation: result.evaluation,
        depth: result.depth,
        nodes: result.nodes,
        nps: result.nps,
        time: result.time,
        pv: result.pv,
        mate: result.mate,
      },
    };
  }

  /**
   * POST /api/engine/best-move
   * Get best move for position
   */
  @Post('best-move')
  @HttpCode(HttpStatus.OK)
  async getBestMove(@Body() dto: GetBestMoveDto) {
    const bestMove = await this.engineManager.getBestMove(
      dto.fen,
      dto.depth || 20,
    );

    return {
      success: true,
      data: {
        bestMove,
      },
    };
  }

  /**
   * POST /api/engine/quick-eval
   * Quick position evaluation (lower depth)
   */
  @Post('quick-eval')
  @HttpCode(HttpStatus.OK)
  async quickEval(@Body() dto: QuickEvalDto) {
    const evaluation = await this.engineManager.quickEval(dto.fen);

    return {
      success: true,
      data: {
        evaluation,
      },
    };
  }

  /**
   * GET /api/engine/stats
   * Get engine statistics
   */
  @Get('stats')
  @HttpCode(HttpStatus.OK)
  async getStats() {
    const cacheStats = await this.engineManager.getCacheStats();

    return {
      success: true,
      data: {
        queueLength: this.engineManager.getQueueLength(),
        cache: cacheStats,
      },
    };
  }

  /**
   * POST /api/engine/clear-cache
   * Clear analysis cache
   */
  @Post('clear-cache')
  @HttpCode(HttpStatus.OK)
  async clearCache() {
    await this.engineManager.clearCache();

    return {
      success: true,
      message: 'Cache cleared successfully',
    };
  }
}
