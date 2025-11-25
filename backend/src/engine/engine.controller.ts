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
import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { EngineManagerService } from './engine-manager.service';
import { EngineFactory, EngineType } from './engine.factory';
import { EngineOptions } from './stockfish.service';

// DTOs
class AnalyzePositionDto {
  @IsString()
  fen!: string;

  @IsOptional()
  @IsNumber()
  depth?: number;

  @IsOptional()
  @IsNumber()
  multiPv?: number;

  @IsOptional()
  @IsEnum(['stockfish', 'leela', 'komodo'])
  engine?: EngineType;
}

class GetBestMoveDto {
  @IsString()
  fen!: string;

  @IsOptional()
  @IsNumber()
  depth?: number;

  @IsOptional()
  @IsEnum(['stockfish', 'leela', 'komodo'])
  engine?: EngineType;
}

class QuickEvalDto {
  @IsString()
  fen!: string;
}

class MultiEngineAnalyzeDto {
  @IsString()
  fen!: string;

  @IsOptional()
  @IsNumber()
  depth?: number;
}

@Controller('engine')
export class EngineController {
  constructor(
    private readonly engineManager: EngineManagerService,
    private readonly engineFactory: EngineFactory,
  ) {}

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

  /**
   * POST /api/engine/multi-engine-analyze
   * Analyze position with all available engines and compare
   */
  @Post('multi-engine-analyze')
  @HttpCode(HttpStatus.OK)
  async multiEngineAnalyze(@Body() dto: MultiEngineAnalyzeDto) {
    const comparison = await this.engineFactory.analyzeWithAllEngines(
      dto.fen,
      { depth: dto.depth || 20 },
    );

    return {
      success: true,
      data: comparison,
    };
  }

  /**
   * GET /api/engine/available
   * Get list of available engines
   */
  @Get('available')
  @HttpCode(HttpStatus.OK)
  getAvailableEngines() {
    const engines = this.engineFactory.getAvailableEngines();
    const engineInfos = engines.map((type) => ({
      type,
      info: this.engineFactory.getEngineInfo(type),
    }));

    return {
      success: true,
      data: {
        engines: engineInfos,
      },
    };
  }

  /**
   * GET /api/engine/health-check
   * Health check for all engines
   */
  @Get('health-check')
  @HttpCode(HttpStatus.OK)
  async engineHealthCheck() {
    const health = await this.engineFactory.healthCheck();

    return {
      success: true,
      data: {
        engines: health,
      },
    };
  }

  /**
   * POST /api/engine/analyze-with-engine
   * Analyze position with specific engine
   */
  @Post('analyze-with-engine')
  @HttpCode(HttpStatus.OK)
  async analyzeWithSpecificEngine(@Body() dto: AnalyzePositionDto) {
    const engineType = dto.engine || 'stockfish';
    const options: EngineOptions = {
      depth: dto.depth || 20,
      multiPv: dto.multiPv || 1,
    };

    const result = await this.engineFactory.analyzePosition(
      dto.fen,
      engineType,
      options,
    );

    return {
      success: true,
      data: {
        engine: engineType,
        result: {
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
      },
    };
  }
}
