/**
 * Game Analysis Service
 * AI-powered chess game analysis using Deepseek/Claude/GPT
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Chess } from 'chess.js';
import { EngineManagerService } from '../engine/engine-manager.service';

export enum MoveClassification {
  BEST = 'best',
  EXCELLENT = 'excellent',
  GOOD = 'good',
  INACCURACY = 'inaccuracy',
  MISTAKE = 'mistake',
  BLUNDER = 'blunder',
}

export interface MoveAnalysis {
  moveNumber: number;
  move: string;
  san: string;
  fen: string;
  classification: MoveClassification;
  engineEval: number; // centipawns
  bestMove: string;
  evalDrop: number; // how much worse than best move
  comment?: string;
}

export interface GameAnalysis {
  whiteAccuracy: number;
  blackAccuracy: number;
  moves: MoveAnalysis[];
  keyMoments: MoveAnalysis[];
  openingName?: string;
  summary: string;
  whiteStats: {
    best: number;
    excellent: number;
    good: number;
    inaccuracy: number;
    mistake: number;
    blunder: number;
  };
  blackStats: {
    best: number;
    excellent: number;
    good: number;
    inaccuracy: number;
    mistake: number;
    blunder: number;
  };
}

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);
  private readonly aiProvider: string;
  private readonly aiApiKey: string | undefined;

  constructor(
    private readonly configService: ConfigService,
    private readonly engineManager: EngineManagerService,
  ) {
    this.aiProvider = this.configService.get('AI_PROVIDER', 'deepseek');
    this.aiApiKey = this.configService.get('AI_API_KEY');
  }

  /**
   * Analyze a completed game
   */
  async analyzeGame(pgn: string): Promise<GameAnalysis> {
    this.logger.log('Starting game analysis');

    const chess = new Chess();
    chess.loadPgn(pgn);

    const history = chess.history({ verbose: true });
    const moves: MoveAnalysis[] = [];

    let whiteTotal = 0;
    let blackTotal = 0;

    // Reset to start position
    chess.reset();

    // Analyze each move
    for (let i = 0; i < history.length; i++) {
      const move = history[i];
      const fen = chess.fen();

      // Get best move from engine
      const analysis = await this.engineManager.analyzePosition(fen, {
        depth: 18,
        multiPv: 3,
      });

      const bestMove = analysis.bestMove;
      const bestEval = analysis.evaluation || 0;

      // Make the actual move
      chess.move(move.san);
      const afterFen = chess.fen();

      // Get evaluation after the move
      const afterAnalysis = await this.engineManager.analyzePosition(
        afterFen,
        { depth: 18 },
      );
      const actualEval = afterAnalysis.evaluation || 0;

      // Calculate evaluation drop (from perspective of player to move)
      const evalDrop = Math.abs(bestEval - actualEval);

      // Classify the move
      const classification = this.classifyMove(
        evalDrop,
        move.san === bestMove,
      );

      const moveAnalysis: MoveAnalysis = {
        moveNumber: Math.floor(i / 2) + 1,
        move: `${move.from}${move.to}`,
        san: move.san,
        fen: afterFen,
        classification,
        engineEval: actualEval,
        bestMove,
        evalDrop,
      };

      moves.push(moveAnalysis);

      // Accumulate accuracy
      const accuracy = this.calculateMoveAccuracy(evalDrop);
      if (i % 2 === 0) {
        whiteTotal += accuracy;
      } else {
        blackTotal += accuracy;
      }
    }

    // Calculate statistics
    const whiteMoves = moves.filter((_, i) => i % 2 === 0);
    const blackMoves = moves.filter((_, i) => i % 2 === 1);

    const whiteStats = this.calculateStats(whiteMoves);
    const blackStats = this.calculateStats(blackMoves);

    const whiteAccuracy = whiteTotal / whiteMoves.length;
    const blackAccuracy = blackTotal / blackMoves.length;

    // Find key moments (moves with eval drop > 100cp)
    const keyMoments = moves.filter((m) => m.evalDrop > 100);

    // Generate AI summary
    const summary = await this.generateAISummary(
      moves,
      whiteAccuracy,
      blackAccuracy,
      keyMoments,
    );

    this.logger.log(
      `Analysis complete: White ${whiteAccuracy.toFixed(1)}%, Black ${blackAccuracy.toFixed(1)}%`,
    );

    return {
      whiteAccuracy: Math.round(whiteAccuracy * 10) / 10,
      blackAccuracy: Math.round(blackAccuracy * 10) / 10,
      moves,
      keyMoments,
      summary,
      whiteStats,
      blackStats,
    };
  }

  /**
   * Classify move based on evaluation drop
   */
  private classifyMove(
    evalDrop: number,
    isBestMove: boolean,
  ): MoveClassification {
    if (isBestMove || evalDrop < 10) return MoveClassification.BEST;
    if (evalDrop < 25) return MoveClassification.EXCELLENT;
    if (evalDrop < 50) return MoveClassification.GOOD;
    if (evalDrop < 100) return MoveClassification.INACCURACY;
    if (evalDrop < 300) return MoveClassification.MISTAKE;
    return MoveClassification.BLUNDER;
  }

  /**
   * Calculate accuracy for a single move
   */
  private calculateMoveAccuracy(evalDrop: number): number {
    // Accuracy formula used by Chess.com and Lichess
    // 100% for best move, decreasing with eval drop
    return 103.1668 * Math.exp(-0.04354 * evalDrop) - 3.1669;
  }

  /**
   * Calculate move statistics
   */
  private calculateStats(moves: MoveAnalysis[]) {
    return {
      best: moves.filter((m) => m.classification === MoveClassification.BEST)
        .length,
      excellent: moves.filter(
        (m) => m.classification === MoveClassification.EXCELLENT,
      ).length,
      good: moves.filter((m) => m.classification === MoveClassification.GOOD)
        .length,
      inaccuracy: moves.filter(
        (m) => m.classification === MoveClassification.INACCURACY,
      ).length,
      mistake: moves.filter(
        (m) => m.classification === MoveClassification.MISTAKE,
      ).length,
      blunder: moves.filter(
        (m) => m.classification === MoveClassification.BLUNDER,
      ).length,
    };
  }

  /**
   * Generate AI-powered game summary
   */
  private async generateAISummary(
    moves: MoveAnalysis[],
    whiteAccuracy: number,
    blackAccuracy: number,
    keyMoments: MoveAnalysis[],
  ): Promise<string> {
    try {
      const prompt = this.buildAnalysisPrompt(
        moves,
        whiteAccuracy,
        blackAccuracy,
        keyMoments,
      );

      const response = await this.callAI(prompt);
      return response;
    } catch (error) {
      this.logger.error('AI summary generation failed', error);
      return this.generateFallbackSummary(
        whiteAccuracy,
        blackAccuracy,
        keyMoments,
      );
    }
  }

  /**
   * Build prompt for AI analysis
   */
  private buildAnalysisPrompt(
    moves: MoveAnalysis[],
    whiteAccuracy: number,
    blackAccuracy: number,
    keyMoments: MoveAnalysis[],
  ): string {
    const keyMomentsText = keyMoments
      .map(
        (m) =>
          `Move ${m.moveNumber}: ${m.san} (${m.classification}, eval drop: ${m.evalDrop}cp)`,
      )
      .join('\n');

    return `Analyze this chess game and provide a brief summary (2-3 sentences).

White Accuracy: ${whiteAccuracy.toFixed(1)}%
Black Accuracy: ${blackAccuracy.toFixed(1)}%
Total Moves: ${moves.length}

Key Moments:
${keyMomentsText || 'No major mistakes'}

Focus on:
1. Overall game quality
2. Critical moments that decided the game
3. Brief advice for improvement

Keep it concise and helpful for a chess player reviewing their game.`;
  }

  /**
   * Call AI API (Deepseek/Claude/GPT)
   */
  private async callAI(prompt: string): Promise<string> {
    if (!this.aiApiKey) {
      throw new Error('AI API key not configured');
    }

    switch (this.aiProvider) {
      case 'deepseek':
        return this.callDeepseek(prompt);
      case 'claude':
        return this.callClaude(prompt);
      case 'openai':
      case 'gpt4o-mini':
        return this.callOpenAI(prompt);
      default:
        throw new Error(`Unsupported AI provider: ${this.aiProvider}`);
    }
  }

  /**
   * Call Deepseek API
   */
  private async callDeepseek(prompt: string): Promise<string> {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.aiApiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful chess coach analyzing games. Provide concise, actionable feedback.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      throw new Error(`Deepseek API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * Call Claude API
   */
  private async callClaude(prompt: string): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.aiApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(prompt: string): Promise<string> {
    const model =
      this.aiProvider === 'gpt4o-mini' ? 'gpt-4o-mini' : 'gpt-3.5-turbo';

    const response = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.aiApiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content:
                'You are a helpful chess coach analyzing games. Provide concise, actionable feedback.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 200,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * Generate fallback summary without AI
   */
  private generateFallbackSummary(
    whiteAccuracy: number,
    blackAccuracy: number,
    keyMoments: MoveAnalysis[],
  ): string {
    const winner = whiteAccuracy > blackAccuracy ? 'White' : 'Black';
    const loser = winner === 'White' ? 'Black' : 'White';

    if (keyMoments.length === 0) {
      return `A well-played game with no major mistakes. ${winner} maintained slightly better accuracy (${Math.max(whiteAccuracy, blackAccuracy).toFixed(1)}% vs ${Math.min(whiteAccuracy, blackAccuracy).toFixed(1)}%).`;
    }

    const biggestMistake = keyMoments[0];
    return `${winner} played more accurately overall. The critical moment was move ${biggestMistake.moveNumber} (${biggestMistake.san}), a ${biggestMistake.classification} that changed the evaluation significantly.`;
  }
}
