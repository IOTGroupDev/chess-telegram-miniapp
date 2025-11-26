import { Chess } from 'chess.js';

/**
 * Heuristic Move Analysis Service
 * Provides local explanations for chess moves without requiring AI API
 */

export interface MoveAnalysis {
  quality: 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
  explanation: string;
  suggestion: string;
  evalLoss: number;
}

class MoveAnalysisService {
  /**
   * Analyze a move and provide explanation
   */
  analyzeMoveHeuristic(
    playerMove: string,
    bestMove: string,
    fenBefore: string,
    fenAfter: string,
    evalBefore: number,
    evalAfter: number
  ): MoveAnalysis {
    const evalLoss = -(evalAfter - evalBefore);

    // Determine quality
    let quality: MoveAnalysis['quality'];
    if (playerMove === bestMove) {
      quality = 'best';
    } else if (evalLoss < 0.3) {
      quality = 'good';
    } else if (evalLoss < 1.0) {
      quality = 'inaccuracy';
    } else if (evalLoss < 3.0) {
      quality = 'mistake';
    } else {
      quality = 'blunder';
    }

    // Generate explanation and suggestion
    const explanation = this.generateExplanation(
      playerMove,
      bestMove,
      fenBefore,
      fenAfter,
      evalLoss,
      quality
    );

    const suggestion = this.generateSuggestion(
      bestMove,
      fenBefore,
      evalLoss,
      quality
    );

    return {
      quality,
      explanation,
      suggestion,
      evalLoss
    };
  }

  /**
   * Generate human-readable explanation
   */
  private generateExplanation(
    playerMove: string,
    bestMove: string,
    fenBefore: string,
    fenAfter: string,
    evalLoss: number,
    quality: MoveAnalysis['quality']
  ): string {
    if (quality === 'best') {
      return '🎯 Вы нашли лучший ход в этой позиции! Отличная игра!';
    }

    const chessBefore = new Chess(fenBefore);
    const chessAfter = new Chess(fenAfter);

    // Check for material loss
    const materialLoss = this.checkMaterialLoss(chessBefore, chessAfter);
    if (materialLoss) {
      return materialLoss;
    }

    // Check for tactical mistakes
    const tacticalMistake = this.checkTacticalMistakes(chessBefore, chessAfter, playerMove);
    if (tacticalMistake) {
      return tacticalMistake;
    }

    // Generic explanation based on eval loss
    if (evalLoss < 0.3) {
      return `✅ Неплохой ход. Позиция практически не изменилась (−${evalLoss.toFixed(2)}).`;
    } else if (evalLoss < 1.0) {
      return `⚠️ Небольшая неточность. Позиция ухудшилась на ${evalLoss.toFixed(2)} пешки.`;
    } else if (evalLoss < 3.0) {
      return `❌ Это ошибка. Вы потеряли ${evalLoss.toFixed(2)} пешек преимущества.`;
    } else {
      return `💥 Грубая ошибка! Позиция резко ухудшилась (−${evalLoss.toFixed(1)} пешек).`;
    }
  }

  /**
   * Generate suggestion for improvement
   */
  private generateSuggestion(
    bestMove: string,
    fenBefore: string,
    evalLoss: number,
    quality: MoveAnalysis['quality']
  ): string {
    if (quality === 'best') {
      return 'Продолжайте в том же духе!';
    }

    const from = bestMove.substring(0, 2).toUpperCase();
    const to = bestMove.substring(2, 4).toUpperCase();

    const chess = new Chess(fenBefore);
    const piece = chess.get(bestMove.substring(0, 2) as any);
    const pieceName = this.getPieceNameRussian(piece?.type || 'p');

    if (evalLoss < 1.0) {
      return `💡 Лучше было ${from}→${to} (${pieceName})`;
    } else {
      return `💡 Правильный ход: ${from}→${to} (${pieceName}). Это улучшило бы позицию.`;
    }
  }

  /**
   * Check if player lost material
   */
  private checkMaterialLoss(chessBefore: Chess, chessAfter: Chess): string | null {
    const materialBefore = this.calculateMaterial(chessBefore, 'w');
    const materialAfter = this.calculateMaterial(chessAfter, 'w');
    const loss = materialBefore - materialAfter;

    if (loss >= 9) {
      return '💥 Вы потеряли ферзя! Фигура осталась под боем.';
    } else if (loss >= 5) {
      return '❌ Вы потеряли ладью. Нужно было защитить фигуру.';
    } else if (loss >= 3) {
      return '❌ Вы потеряли легкую фигуру (слона или коня).';
    } else if (loss >= 1) {
      return '⚠️ Вы потеряли пешку без компенсации.';
    }

    return null;
  }

  /**
   * Check for tactical mistakes
   */
  private checkTacticalMistakes(chessBefore: Chess, chessAfter: Chess, playerMove: string): string | null {
    // Check if piece moved to attacked square
    const to = playerMove.substring(2, 4);
    const piece = chessAfter.get(to as any);

    if (piece && piece.color === 'w') {
      const attackers = this.getAttackers(chessAfter, to, 'b');
      const defenders = this.getAttackers(chessAfter, to, 'w');

      if (attackers.length > defenders.length) {
        const pieceName = this.getPieceNameRussian(piece.type);
        return `❌ ${pieceName} на ${to.toUpperCase()} под атакой и недостаточно защищена.`;
      }
    }

    return null;
  }

  /**
   * Calculate material value for a color
   */
  private calculateMaterial(chess: Chess, color: 'w' | 'b'): number {
    const board = chess.board();
    let material = 0;

    const pieceValues: Record<string, number> = {
      'p': 1,
      'n': 3,
      'b': 3,
      'r': 5,
      'q': 9,
      'k': 0
    };

    board.forEach(row => {
      row.forEach(square => {
        if (square && square.color === color) {
          material += pieceValues[square.type] || 0;
        }
      });
    });

    return material;
  }

  /**
   * Get pieces attacking a square
   */
  private getAttackers(chess: Chess, square: string, color: 'w' | 'b'): string[] {
    const attackers: string[] = [];
    const board = chess.board();

    // Simple implementation - check all pieces of the color
    board.forEach((row, rowIndex) => {
      row.forEach((piece, colIndex) => {
        if (piece && piece.color === color) {
          const from = String.fromCharCode(97 + colIndex) + (8 - rowIndex);
          const moves = chess.moves({ square: from as any, verbose: true });
          if (moves.some(m => m.to === square)) {
            attackers.push(from);
          }
        }
      });
    });

    return attackers;
  }

  /**
   * Get Russian name for piece
   */
  private getPieceNameRussian(type: string): string {
    const names: Record<string, string> = {
      'p': 'Пешка',
      'n': 'Конь',
      'b': 'Слон',
      'r': 'Ладья',
      'q': 'Ферзь',
      'k': 'Король'
    };
    return names[type] || 'Фигура';
  }
}

export const moveAnalysisService = new MoveAnalysisService();
