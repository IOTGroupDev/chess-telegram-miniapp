/**
 * Stockfish Engine Service
 * Real UCI protocol implementation
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export interface EngineOptions {
  threads?: number;
  hashSize?: number; // MB
  multiPv?: number;
  depth?: number;
}

export interface AnalysisResult {
  bestMove: string; // UCI format (e.g., "e2e4")
  ponder?: string; // Ponder move
  evaluation: number; // Centipawns (positive = white advantage)
  depth: number;
  nodes: number;
  nps: number; // Nodes per second
  time: number; // Milliseconds
  pv: string[]; // Principal variation (array of UCI moves)
  mate?: number; // Moves to mate (if applicable)
}

export interface MultiPvResult {
  pv: number; // Line number
  evaluation: number;
  depth: number;
  moves: string[];
  mate?: number;
}

@Injectable()
export class StockfishService extends EventEmitter implements OnModuleDestroy {
  private readonly logger = new Logger(StockfishService.name);
  private process: ChildProcess | null = null;
  private isReady = false;
  private outputBuffer: string[] = [];
  private currentAnalysis: {
    resolve: (result: AnalysisResult) => void;
    reject: (error: Error) => void;
  } | null = null;

  private stockfishPath: string;
  private defaultOptions: Required<EngineOptions>;

  constructor() {
    super();

    // Get Stockfish path from environment or use default
    this.stockfishPath = process.env.STOCKFISH_PATH || '/usr/games/stockfish';

    // Default options
    this.defaultOptions = {
      threads: parseInt(process.env.STOCKFISH_THREADS || '2'),
      hashSize: parseInt(process.env.STOCKFISH_HASH_SIZE || '256'),
      multiPv: 1,
      depth: 20,
    };

    this.initialize();
  }

  /**
   * Initialize Stockfish engine
   */
  private async initialize(): Promise<void> {
    try {
      this.logger.log(`Initializing Stockfish at: ${this.stockfishPath}`);

      // Spawn Stockfish process
      this.process = spawn(this.stockfishPath, [], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      if (!this.process.stdout || !this.process.stdin) {
        throw new Error('Failed to initialize Stockfish I/O streams');
      }

      // Handle stdout
      this.process.stdout.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
          if (line.trim()) {
            this.handleOutput(line.trim());
          }
        }
      });

      // Handle stderr
      this.process.stderr?.on('data', (data: Buffer) => {
        this.logger.warn(`Stockfish stderr: ${data.toString()}`);
      });

      // Handle process exit
      this.process.on('exit', (code) => {
        this.logger.warn(`Stockfish process exited with code ${code}`);
        this.isReady = false;
      });

      // Handle errors
      this.process.on('error', (error) => {
        this.logger.error(`Stockfish process error: ${error.message}`);
        this.isReady = false;
      });

      // Initialize UCI
      await this.sendCommand('uci');
      await this.waitForReady();

      // Set options
      await this.setOption('Threads', this.defaultOptions.threads);
      await this.setOption('Hash', this.defaultOptions.hashSize);

      this.logger.log('Stockfish initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize Stockfish: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle output from Stockfish
   */
  private handleOutput(line: string): void {
    this.logger.debug(`Stockfish: ${line}`);
    this.outputBuffer.push(line);

    // Check for ready
    if (line === 'uciok' || line === 'readyok') {
      this.isReady = true;
      this.emit('ready');
    }

    // Check for bestmove
    if (line.startsWith('bestmove')) {
      this.handleBestMove(line);
    }

    // Check for info (analysis)
    if (line.startsWith('info')) {
      this.handleInfo(line);
    }
  }

  /**
   * Parse and handle bestmove output
   */
  private handleBestMove(line: string): void {
    const parts = line.split(' ');
    const bestMove = parts[1];
    const ponder = parts[3]; // ponder move (if any)

    if (this.currentAnalysis) {
      // Get last info line for evaluation
      const lastInfo = this.getLastAnalysis();

      this.currentAnalysis.resolve({
        bestMove,
        ponder,
        ...lastInfo,
      });

      this.currentAnalysis = null;
    }
  }

  /**
   * Parse info line from Stockfish
   */
  private handleInfo(line: string): void {
    // Example: info depth 20 seldepth 30 multipv 1 score cp 25 nodes 500000 nps 250000 time 2000 pv e2e4 e7e5 g1f3

    // Store for later use
    this.emit('info', line);
  }

  /**
   * Get last analysis from buffer
   */
  private getLastAnalysis(): Omit<AnalysisResult, 'bestMove' | 'ponder'> {
    // Find last info line with score
    for (let i = this.outputBuffer.length - 1; i >= 0; i--) {
      const line = this.outputBuffer[i];
      if (line.startsWith('info') && line.includes('score')) {
        return this.parseInfoLine(line);
      }
    }

    // Default
    return {
      evaluation: 0,
      depth: 0,
      nodes: 0,
      nps: 0,
      time: 0,
      pv: [],
    };
  }

  /**
   * Parse UCI info line
   */
  private parseInfoLine(
    line: string,
  ): Omit<AnalysisResult, 'bestMove' | 'ponder'> {
    const parts = line.split(' ');
    const result: Omit<AnalysisResult, 'bestMove' | 'ponder'> = {
      evaluation: 0,
      depth: 0,
      nodes: 0,
      nps: 0,
      time: 0,
      pv: [],
    };

    for (let i = 0; i < parts.length; i++) {
      switch (parts[i]) {
        case 'depth':
          result.depth = parseInt(parts[i + 1]);
          break;
        case 'nodes':
          result.nodes = parseInt(parts[i + 1]);
          break;
        case 'nps':
          result.nps = parseInt(parts[i + 1]);
          break;
        case 'time':
          result.time = parseInt(parts[i + 1]);
          break;
        case 'score':
          if (parts[i + 1] === 'cp') {
            result.evaluation = parseInt(parts[i + 2]);
          } else if (parts[i + 1] === 'mate') {
            result.mate = parseInt(parts[i + 2]);
            // Convert mate to evaluation
            result.evaluation = result.mate > 0 ? 10000 : -10000;
          }
          break;
        case 'pv':
          // All moves after 'pv' are principal variation
          result.pv = parts.slice(i + 1);
          break;
      }
    }

    return result;
  }

  /**
   * Send command to Stockfish
   */
  private sendCommand(command: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.process || !this.process.stdin) {
        reject(new Error('Stockfish process not initialized'));
        return;
      }

      this.logger.debug(`Sending command: ${command}`);
      this.process.stdin.write(command + '\n', (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Wait for engine to be ready
   */
  private waitForReady(): Promise<void> {
    return new Promise((resolve) => {
      if (this.isReady) {
        resolve();
        return;
      }

      const checkReady = () => {
        if (this.isReady) {
          this.off('ready', checkReady);
          resolve();
        }
      };

      this.on('ready', checkReady);
    });
  }

  /**
   * Set UCI option
   */
  private async setOption(name: string, value: number | string): Promise<void> {
    await this.sendCommand(`setoption name ${name} value ${value}`);
  }

  /**
   * Analyze position and get best move
   */
  async getBestMove(
    fen: string,
    options: EngineOptions = {},
  ): Promise<AnalysisResult> {
    await this.waitForReady();

    const depth = options.depth || this.defaultOptions.depth;
    const multiPv = options.multiPv || this.defaultOptions.multiPv;

    // Clear output buffer
    this.outputBuffer = [];

    // Set position
    await this.sendCommand(`position fen ${fen}`);

    // Set MultiPV if needed
    if (multiPv > 1) {
      await this.setOption('MultiPV', multiPv);
    }

    // Start analysis
    await this.sendCommand(`go depth ${depth}`);

    // Wait for bestmove
    return new Promise((resolve, reject) => {
      this.currentAnalysis = { resolve, reject };

      // Timeout after 60 seconds
      const timeout = setTimeout(() => {
        if (this.currentAnalysis) {
          this.currentAnalysis.reject(new Error('Analysis timeout'));
          this.currentAnalysis = null;
        }
      }, 60000);

      // Clear timeout when done
      const originalResolve = resolve;
      resolve = (result: AnalysisResult) => {
        clearTimeout(timeout);
        originalResolve(result);
      };
    });
  }

  /**
   * Analyze position with multiple lines
   */
  async analyzePosition(
    fen: string,
    options: EngineOptions = {},
  ): Promise<MultiPvResult[]> {
    const multiPv = options.multiPv || 3;
    const depth = options.depth || this.defaultOptions.depth;

    await this.waitForReady();

    // Clear output buffer
    this.outputBuffer = [];

    // Set position
    await this.sendCommand(`position fen ${fen}`);

    // Set MultiPV
    await this.setOption('MultiPV', multiPv);

    // Start analysis
    await this.sendCommand(`go depth ${depth}`);

    // Collect results
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Analysis timeout'));
      }, 60000);

      const checkBestMove = (line: string) => {
        if (line.startsWith('bestmove')) {
          clearTimeout(timeout);
          this.off('info', checkBestMove);

          // Parse all MultiPV lines
          const results: MultiPvResult[] = [];
          const infoLines = this.outputBuffer.filter(
            (l) => l.startsWith('info') && l.includes('multipv'),
          );

          for (const infoLine of infoLines) {
            const parts = infoLine.split(' ');
            let pvIndex = 1;
            const result: MultiPvResult = {
              pv: pvIndex,
              evaluation: 0,
              depth: 0,
              moves: [],
            };

            for (let i = 0; i < parts.length; i++) {
              switch (parts[i]) {
                case 'multipv':
                  result.pv = parseInt(parts[i + 1]);
                  break;
                case 'depth':
                  result.depth = parseInt(parts[i + 1]);
                  break;
                case 'score':
                  if (parts[i + 1] === 'cp') {
                    result.evaluation = parseInt(parts[i + 2]);
                  } else if (parts[i + 1] === 'mate') {
                    result.mate = parseInt(parts[i + 2]);
                    result.evaluation = result.mate > 0 ? 10000 : -10000;
                  }
                  break;
                case 'pv':
                  result.moves = parts.slice(i + 1);
                  break;
              }
            }

            results.push(result);
          }

          resolve(results);
        }
      };

      this.on('info', checkBestMove);
    });
  }

  /**
   * Quick evaluation (lower depth)
   */
  async quickEval(fen: string): Promise<number> {
    const result = await this.getBestMove(fen, { depth: 12 });
    return result.evaluation;
  }

  /**
   * Stop current analysis
   */
  async stopAnalysis(): Promise<void> {
    await this.sendCommand('stop');
  }

  /**
   * Cleanup on module destroy
   */
  onModuleDestroy(): void {
    this.terminate();
  }

  /**
   * Terminate engine
   */
  terminate(): void {
    if (this.process) {
      this.sendCommand('quit').catch(() => {});
      this.process.kill();
      this.process = null;
    }
    this.isReady = false;
  }
}
