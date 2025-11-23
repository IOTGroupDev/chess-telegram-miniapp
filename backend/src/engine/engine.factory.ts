/**
 * Engine Factory
 * Central manager for all chess engines
 */

import { Injectable, Logger } from '@nestjs/common';
import { StockfishService } from './stockfish.service';
import { LeelaService } from './leela.service';
import { KomodoService } from './komodo.service';
import { AnalysisResult, EngineOptions } from './base-engine.interface';

export type EngineType = 'stockfish' | 'leela' | 'komodo';

export interface MultiEngineAnalysis {
  engine: EngineType;
  result: AnalysisResult;
  engineInfo: {
    name: string;
    type: 'classical' | 'neural' | 'hybrid';
    strength: number;
  };
}

export interface ComparisonAnalysis {
  position: string; // FEN
  analyses: MultiEngineAnalysis[];
  consensus?: {
    // If all engines agree on best move
    agreed: boolean;
    bestMove?: string;
    evaluation?: number;
  };
  disagreement?: {
    // If engines disagree
    stockfishMove: string;
    leelaMove: string;
    komodoMove: string;
  };
}

@Injectable()
export class EngineFactory {
  private readonly logger = new Logger(EngineFactory.name);
  private engines: Map<EngineType, any> = new Map();

  constructor(
    private stockfish: StockfishService,
    private leela: LeelaService,
    private komodo: KomodoService,
  ) {
    this.engines.set('stockfish', stockfish);
    this.engines.set('leela', leela);
    this.engines.set('komodo', komodo);
  }

  /**
   * Get specific engine by type
   */
  getEngine(type: EngineType) {
    const engine = this.engines.get(type);
    if (!engine) {
      throw new Error(`Engine ${type} not found`);
    }
    return engine;
  }

  /**
   * Analyze position with all engines and compare
   */
  async analyzeWithAllEngines(
    fen: string,
    options?: EngineOptions,
  ): Promise<ComparisonAnalysis> {
    this.logger.log(`Multi-engine analysis for position: ${fen}`);

    // Run all engines in parallel
    const [stockfishResult, leelaResult, komodoResult] = await Promise.all([
      this.stockfish.getBestMove(fen, options).catch((err) => {
        this.logger.error('Stockfish analysis failed', err);
        return null;
      }),
      this.leela.getBestMove(fen, options).catch((err) => {
        this.logger.error('Leela analysis failed', err);
        return null;
      }),
      this.komodo.getBestMove(fen, options).catch((err) => {
        this.logger.error('Komodo analysis failed', err);
        return null;
      }),
    ]);

    const analyses: MultiEngineAnalysis[] = [];

    if (stockfishResult) {
      analyses.push({
        engine: 'stockfish',
        result: stockfishResult,
        engineInfo: {
          name: 'Stockfish 17',
          type: 'classical',
          strength: 3600,
        },
      });
    }

    if (leelaResult) {
      analyses.push({
        engine: 'leela',
        result: leelaResult,
        engineInfo: {
          name: 'Leela Chess Zero',
          type: 'neural',
          strength: 3200,
        },
      });
    }

    if (komodoResult) {
      analyses.push({
        engine: 'komodo',
        result: komodoResult,
        engineInfo: {
          name: 'Komodo Dragon 3',
          type: 'hybrid',
          strength: 3400,
        },
      });
    }

    // Check consensus
    const moves = analyses.map((a) => a.result.bestMove);
    const uniqueMoves = new Set(moves);

    const comparison: ComparisonAnalysis = {
      position: fen,
      analyses,
    };

    if (uniqueMoves.size === 1) {
      // All engines agree!
      const bestMove = moves[0];
      const avgEval =
        analyses.reduce((sum, a) => sum + a.result.evaluation, 0) /
        analyses.length;

      comparison.consensus = {
        agreed: true,
        bestMove,
        evaluation: Math.round(avgEval),
      };
    } else {
      // Engines disagree - interesting position!
      comparison.consensus = { agreed: false };
      comparison.disagreement = {
        stockfishMove: stockfishResult?.bestMove || 'N/A',
        leelaMove: leelaResult?.bestMove || 'N/A',
        komodoMove: komodoResult?.bestMove || 'N/A',
      };
    }

    return comparison;
  }

  /**
   * Get best move from preferred engine with fallback
   */
  async getBestMoveWithFallback(
    fen: string,
    preferredEngine: EngineType,
    options?: EngineOptions,
  ): Promise<AnalysisResult> {
    try {
      const engine = this.getEngine(preferredEngine);
      return await engine.getBestMove(fen, options);
    } catch (error) {
      this.logger.warn(
        `${preferredEngine} failed, falling back to Stockfish`,
        error,
      );

      // Fallback to Stockfish
      if (preferredEngine !== 'stockfish') {
        return this.stockfish.getBestMove(fen, options);
      }

      throw error;
    }
  }

  /**
   * Analyze position with specific engine
   */
  async analyzePosition(
    fen: string,
    engineType: EngineType,
    options?: EngineOptions,
  ): Promise<AnalysisResult> {
    const engine = this.getEngine(engineType);
    return engine.getBestMove(fen, options);
  }

  /**
   * Get engine information
   */
  getEngineInfo(type: EngineType) {
    const engine = this.getEngine(type);
    return engine.getInfo();
  }

  /**
   * Get all available engines
   */
  getAvailableEngines(): EngineType[] {
    return Array.from(this.engines.keys());
  }

  /**
   * Health check for all engines
   */
  async healthCheck(): Promise<Record<EngineType, boolean>> {
    const health: Record<string, boolean> = {};

    for (const [type, engine] of this.engines.entries()) {
      try {
        await engine.getBestMove(
          'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          { depth: 1 },
        );
        health[type] = true;
      } catch (error) {
        this.logger.error(`Health check failed for ${type}`, error);
        health[type] = false;
      }
    }

    return health as Record<EngineType, boolean>;
  }
}
