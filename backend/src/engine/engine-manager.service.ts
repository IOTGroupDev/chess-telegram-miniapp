/**
 * Engine Manager Service
 * Manages engine requests with queue and caching
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { StockfishService, AnalysisResult, EngineOptions } from './stockfish.service';

export interface CachedAnalysis {
  bestMove: string;
  evaluation: number;
  depth: number;
  timestamp: number;
}

@Injectable()
export class EngineManagerService implements OnModuleInit {
  private readonly logger = new Logger(EngineManagerService.name);
  private stockfish: StockfishService;
  private redis: Redis | null = null;
  private requestQueue: Array<{
    fen: string;
    options: EngineOptions;
    resolve: (result: AnalysisResult) => void;
    reject: (error: Error) => void;
  }> = [];
  private isProcessing = false;

  constructor(private readonly configService: ConfigService) {
    this.stockfish = new StockfishService();

    // Initialize Redis if configured
    const redisHost = this.configService.get('REDIS_HOST');
    const redisPort = this.configService.get<number>('REDIS_PORT');

    if (redisHost && redisPort) {
      try {
        this.redis = new Redis({
          host: redisHost,
          port: redisPort,
        });
        this.logger.log('Redis connected for caching');
      } catch (error) {
        this.logger.warn('Redis connection failed, caching disabled');
      }
    } else {
      this.logger.warn('Redis not configured, caching disabled');
    }
  }

  async onModuleInit() {
    this.logger.log('Engine Manager initialized');
  }

  /**
   * Get cache key for position
   */
  private getCacheKey(fen: string, depth: number): string {
    return `analysis:${fen}:${depth}`;
  }

  /**
   * Get cached analysis
   */
  private async getFromCache(
    fen: string,
    depth: number,
  ): Promise<CachedAnalysis | null> {
    if (!this.redis) return null;

    try {
      const key = this.getCacheKey(fen, depth);
      const cached = await this.redis.get(key);

      if (cached) {
        this.logger.debug(`Cache hit for ${fen.substring(0, 20)}...`);
        return JSON.parse(cached);
      }

      return null;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Cache get error: ${err.message}`);
      return null;
    }
  }

  /**
   * Save analysis to cache
   */
  private async saveToCache(
    fen: string,
    depth: number,
    result: AnalysisResult,
  ): Promise<void> {
    if (!this.redis) return;

    try {
      const key = this.getCacheKey(fen, depth);
      const cached: CachedAnalysis = {
        bestMove: result.bestMove,
        evaluation: result.evaluation,
        depth: result.depth,
        timestamp: Date.now(),
      };

      // Cache for 24 hours
      await this.redis.setex(key, 86400, JSON.stringify(cached));
      this.logger.debug(`Cached analysis for ${fen.substring(0, 20)}...`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Cache save error: ${err.message}`);
    }
  }

  /**
   * Process queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (!request) continue;

      try {
        const result = await this.stockfish.getBestMove(
          request.fen,
          request.options,
        );
        request.resolve(result);

        // Cache result
        await this.saveToCache(
          request.fen,
          request.options.depth || 20,
          result,
        );
      } catch (error) {
        request.reject(error as Error);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Analyze position with caching
   */
  async analyzePosition(
    fen: string,
    options: EngineOptions = {},
  ): Promise<AnalysisResult> {
    const depth = options.depth || 20;

    // Check cache first
    const cached = await this.getFromCache(fen, depth);
    if (cached && cached.depth >= depth) {
      this.logger.debug('Returning cached result');
      return {
        bestMove: cached.bestMove,
        evaluation: cached.evaluation,
        depth: cached.depth,
        nodes: 0,
        nps: 0,
        time: 0,
        pv: [],
      };
    }

    // Add to queue
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ fen, options, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Get best move (convenience method)
   * Accepts full EngineOptions, including depth, uciElo, moveTime, etc.
   */
  async getBestMove(
    fen: string,
    options: EngineOptions = {},
  ): Promise<string> {
    const result = await this.analyzePosition(fen, options);
    return result.bestMove;
  }

  /**
   * Quick evaluation (lower depth for speed)
   */
  async quickEval(fen: string): Promise<number> {
    const result = await this.analyzePosition(fen, { depth: 12 });
    return result.evaluation;
  }

  /**
   * Deep analysis (higher depth for accuracy)
   */
  async deepAnalysis(
    fen: string,
    depth: number = 25,
  ): Promise<AnalysisResult> {
    return this.analyzePosition(fen, { depth });
  }

  /**
   * Multi-line analysis
   */
  async analyzeWithMultiPv(
    fen: string,
    lines: number = 3,
    depth: number = 20,
  ): Promise<AnalysisResult[]> {
    // For now, return single line
    // TODO: Implement multi-PV properly
    const result = await this.analyzePosition(fen, { depth, multiPv: lines });
    return [result];
  }

  /**
   * Get queue length (for monitoring)
   */
  getQueueLength(): number {
    return this.requestQueue.length;
  }

  /**
   * Get cache stats
   */
  async getCacheStats(): Promise<{
    keys: number;
    memory: string;
  }> {
    if (!this.redis) {
      return { keys: 0, memory: 'disabled' };
    }

    try {
      const keys = await this.redis.keys('analysis:*');
      const info = await this.redis.info('memory');
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memory = memoryMatch ? memoryMatch[1] : 'unknown';

      return {
        keys: keys.length,
        memory,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Cache stats error: ${err.message}`);
      return { keys: 0, memory: 'unknown' };
    }
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    if (!this.redis) return;

    try {
      const keys = await this.redis.keys('analysis:*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.log(`Cleared ${keys.length} cached analyses`);
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Cache clear error: ${err.message}`);
    }
  }
}
