/**
 * Komodo Dragon Engine Service
 * Hybrid classical/neural chess engine
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { BaseChessEngine, EngineOptions, AnalysisResult, EngineInfo } from './base-engine.interface';

@Injectable()
export class KomodoService extends EventEmitter implements OnModuleDestroy {
  private readonly logger = new Logger(KomodoService.name);
  private process: ChildProcess | null = null;
  private outputBuffer: string[] = [];
  private currentAnalysis: {
    resolve: (result: AnalysisResult) => void;
    reject: (error: Error) => void;
  } | null = null;

  constructor(private configService: ConfigService) {
    const komodoPath = configService.get('KOMODO_PATH', '/usr/games/komodo');
    const threads = parseInt(configService.get('KOMODO_THREADS', '2'));
    const hashSize = parseInt(configService.get('KOMODO_HASH_SIZE', '512'));

    super(komodoPath, {
      threads,
      hashSize,
      depth: 20,
      multiPv: 1,
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    this.logger.log('Initializing Komodo Dragon...');

    try {
      // Spawn Komodo process
      this.process = spawn(this.enginePath, [], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      if (!this.process.stdin || !this.process.stdout) {
        throw new Error('Failed to create Komodo process streams');
      }

      // Handle output
      this.process.stdout.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
          if (line.trim()) {
            this.handleOutput(line.trim());
          }
        }
      });

      this.process.stderr?.on('data', (data: Buffer) => {
        this.logger.error(`Komodo stderr: ${data.toString()}`);
      });

      this.process.on('exit', (code) => {
        this.logger.warn(`Komodo process exited with code ${code}`);
        this.isInitialized = false;
      });

      // Initialize UCI
      await this.sendCommand('uci');
      await this.waitForResponse('uciok');

      // Set options
      await this.setOption('Threads', this.options.threads || 2);
      await this.setOption('Hash', this.options.hashSize || 512);
      await this.setOption('MultiPV', this.options.multiPv || 1);

      await this.sendCommand('isready');
      await this.waitForResponse('readyok');

      this.isInitialized = true;
      this.logger.log('Komodo Dragon initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Komodo', error);
      throw error;
    }
  }

  getInfo(): EngineInfo {
    return {
      name: 'Komodo Dragon 3',
      version: '3.0',
      author: 'Komodo Team',
      type: 'hybrid',
      strength: 3400, // Approximate ELO
      supportedFeatures: {
        multiPv: true,
        analysis: true,
        skillLevel: true,
        limitedStrength: true,
      },
    };
  }

  async getBestMove(fen: string, options?: EngineOptions): Promise<AnalysisResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const depth = options?.depth || this.options.depth || 20;
    const multiPv = options?.multiPv || 1;

    return new Promise((resolve, reject) => {
      this.currentAnalysis = { resolve, reject };

      const timeout = setTimeout(() => {
        this.stop();
        reject(new Error('Komodo analysis timeout'));
      }, 60000); // 60 second timeout

      this.sendCommand(`position fen ${fen}`);
      this.sendCommand(`setoption name MultiPV value ${multiPv}`);
      this.sendCommand(`go depth ${depth}`);

      // Will resolve in handleBestMove
      this.once('bestmove', () => {
        clearTimeout(timeout);
      });
    });
  }

  async analyzePosition(fen: string, options?: EngineOptions): Promise<AnalysisResult> {
    return this.getBestMove(fen, options);
  }

  async quickEval(fen: string): Promise<number> {
    const result = await this.getBestMove(fen, { depth: 10 });
    return result.evaluation;
  }

  async setOption(name: string, value: string | number): Promise<void> {
    await this.sendCommand(`setoption name ${name} value ${value}`);
  }

  stop(): void {
    if (this.process) {
      this.sendCommand('stop');
    }
  }

  quit(): void {
    if (this.process) {
      this.sendCommand('quit');
      this.process.kill();
      this.process = null;
      this.isInitialized = false;
    }
  }

  onModuleDestroy(): void {
    this.quit();
  }

  // Private helper methods

  private async sendCommand(command: string): Promise<void> {
    if (!this.process?.stdin) {
      throw new Error('Komodo process not initialized');
    }

    this.logger.debug(`Komodo > ${command}`);
    this.process.stdin.write(`${command}\n`);
  }

  private handleOutput(line: string): void {
    this.logger.debug(`Komodo < ${line}`);
    this.outputBuffer.push(line);

    if (line.startsWith('bestmove')) {
      this.handleBestMove(line);
    }
  }

  private handleBestMove(line: string): void {
    // Parse: "bestmove e2e4 ponder e7e5"
    const parts = line.split(' ');
    const bestMove = parts[1];
    const ponder = parts[3];

    // Get last analysis info
    const analysisInfo = this.getLastAnalysis();

    const result: AnalysisResult = {
      bestMove,
      ponder,
      evaluation: analysisInfo.evaluation || 0,
      depth: analysisInfo.depth || 0,
      nodes: analysisInfo.nodes || 0,
      nps: analysisInfo.nps || 0,
      time: analysisInfo.time || 0,
      pv: analysisInfo.pv || [],
      mate: analysisInfo.mate,
    };

    this.emit('bestmove', result);

    if (this.currentAnalysis) {
      this.currentAnalysis.resolve(result);
      this.currentAnalysis = null;
    }
  }

  private getLastAnalysis(): Partial<AnalysisResult> {
    // Parse info lines from output buffer
    const infoLines = this.outputBuffer.filter((l) => l.startsWith('info'));
    if (infoLines.length === 0) return {};

    const lastInfo = infoLines[infoLines.length - 1];
    const result: Partial<AnalysisResult> = {};

    // Parse score
    const scoreMatch = lastInfo.match(/score cp (-?\d+)/);
    if (scoreMatch) {
      result.evaluation = parseInt(scoreMatch[1]);
    }

    // Parse mate
    const mateMatch = lastInfo.match(/score mate (-?\d+)/);
    if (mateMatch) {
      result.mate = parseInt(mateMatch[1]);
      result.evaluation = result.mate > 0 ? 10000 : -10000;
    }

    // Parse depth
    const depthMatch = lastInfo.match(/depth (\d+)/);
    if (depthMatch) {
      result.depth = parseInt(depthMatch[1]);
    }

    // Parse nodes
    const nodesMatch = lastInfo.match(/nodes (\d+)/);
    if (nodesMatch) {
      result.nodes = parseInt(nodesMatch[1]);
    }

    // Parse nps
    const npsMatch = lastInfo.match(/nps (\d+)/);
    if (npsMatch) {
      result.nps = parseInt(npsMatch[1]);
    }

    // Parse time
    const timeMatch = lastInfo.match(/time (\d+)/);
    if (timeMatch) {
      result.time = parseInt(timeMatch[1]);
    }

    // Parse PV
    const pvMatch = lastInfo.match(/pv (.+)$/);
    if (pvMatch) {
      result.pv = pvMatch[1].split(' ');
    }

    return result;
  }

  private waitForResponse(expected: string): Promise<void> {
    return new Promise((resolve) => {
      const checkBuffer = () => {
        if (this.outputBuffer.some((line) => line.includes(expected))) {
          resolve();
        } else {
          setTimeout(checkBuffer, 100);
        }
      };
      checkBuffer();
    });
  }
}
