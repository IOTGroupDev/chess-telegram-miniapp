/**
 * Base Engine Interface
 * Common interface for all chess engines (Stockfish, Leela, Komodo, etc.)
 */

export interface EngineOptions {
  depth?: number;
  multiPv?: number;
  threads?: number;
  hashSize?: number;
  timeLimit?: number; // milliseconds
  nodes?: number; // max nodes to search
}

export interface AnalysisResult {
  bestMove: string; // UCI format: e2e4
  ponder?: string; // Suggested ponder move
  evaluation: number; // Centipawns (positive = white advantage)
  depth: number;
  seldepth?: number;
  nodes?: number;
  nps?: number; // Nodes per second
  time?: number; // Time spent in ms
  mate?: number; // Mate in N moves (positive = white mates, negative = black mates)
  pv?: string[]; // Principal variation (sequence of moves)
  multipv?: Array<{
    // Multi-PV lines
    move: string;
    evaluation: number;
    pv: string[];
    mate?: number;
  }>;
}

export interface EngineInfo {
  name: string;
  version?: string;
  author?: string;
  type: 'classical' | 'neural' | 'hybrid'; // Classical (Stockfish), Neural (Leela), Hybrid (Komodo)
  strength: number; // ELO rating estimate
  supportedFeatures: {
    multiPv: boolean;
    analysis: boolean;
    skillLevel: boolean;
    limitedStrength: boolean;
  };
}

export abstract class BaseChessEngine {
  protected enginePath: string;
  protected options: EngineOptions;
  protected isInitialized = false;

  constructor(enginePath: string, options: EngineOptions = {}) {
    this.enginePath = enginePath;
    this.options = {
      depth: 20,
      multiPv: 1,
      threads: 2,
      hashSize: 512,
      ...options,
    };
  }

  /**
   * Initialize the engine
   */
  abstract initialize(): Promise<void>;

  /**
   * Get engine information
   */
  abstract getInfo(): EngineInfo;

  /**
   * Analyze a position and return the best move
   */
  abstract getBestMove(
    fen: string,
    options?: EngineOptions,
  ): Promise<AnalysisResult>;

  /**
   * Analyze a position with full details
   */
  abstract analyzePosition(
    fen: string,
    options?: EngineOptions,
  ): Promise<AnalysisResult>;

  /**
   * Quick evaluation (lower depth for faster response)
   */
  abstract quickEval(fen: string): Promise<number>;

  /**
   * Set engine option
   */
  abstract setOption(name: string, value: string | number): Promise<void>;

  /**
   * Stop current analysis
   */
  abstract stop(): void;

  /**
   * Quit and cleanup
   */
  abstract quit(): void;

  /**
   * Check if engine is ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}
