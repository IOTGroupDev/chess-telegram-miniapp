/**
 * Stockfish Hook - Backend API Version
 * Calls NestJS backend API instead of running Stockfish in browser
 * Much more efficient for mobile devices
 */

import { useState, useCallback } from 'react';

const BACKEND_URL = import.meta.env.VITE_ENGINE_API_URL || 'http://localhost:3000';

interface EngineResponse {
  success: boolean;
  data: {
    bestMove: string;
    ponder?: string;
    evaluation?: number;
    depth?: number;
    mate?: number;
  };
}

/**
 * Options for best-move requests.
 * depth  – fallback when movetime is not used
 * uciElo – approximate engine strength (used with UCI_LimitStrength)
 * moveTime – time per move in milliseconds
 */
export interface BestMoveOptions {
  depth?: number;
  uciElo?: number;
  moveTime?: number;
}

export function useStockfish() {
  const [isThinking, setIsThinking] = useState(false);
  const [evaluation, setEvaluation] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get best move from backend Stockfish
   */
  const getBestMove = useCallback(
    async (fen: string, options: BestMoveOptions = { depth: 15 }): Promise<string | null> => {
      try {
        setIsThinking(true);
        setError(null);

        const payload: any = { fen };

        if (options.depth !== undefined) {
          payload.depth = options.depth;
        }
        if (options.uciElo !== undefined) {
          payload.uciElo = options.uciElo;
        }
        if (options.moveTime !== undefined) {
          payload.moveTime = options.moveTime;
        }

        const response = await fetch(`${BACKEND_URL}/api/engine/best-move`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => response.statusText);
          console.error('[Stockfish] API Error Response:', errorText);
          throw new Error(`Engine API error (${response.status}): ${errorText || response.statusText}`);
        }

        const data: EngineResponse = await response.json();

        if (data.success && data.data.bestMove) {
          // Update evaluation if available
          if (data.data.evaluation !== undefined) {
            setEvaluation(data.data.evaluation / 100); // Convert centipawns to pawns
          }

          return data.data.bestMove;
        }

        throw new Error('No best move returned from engine');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to get best move';
        setError(errorMessage);
        console.error('Stockfish API error:', err);
        return null;
      } finally {
        setIsThinking(false);
      }
    },
    [],
  );

  /**
   * Get quick evaluation (lower depth for faster response)
   */
  const quickEval = useCallback(async (fen: string): Promise<number | null> => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/engine/quick-eval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fen }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        console.error('[Stockfish] API Error Response:', errorText);
        throw new Error(`Engine API error (${response.status}): ${errorText || response.statusText}`);
      }

      const data: EngineResponse = await response.json();

      if (data.success && data.data.evaluation !== undefined) {
        const evalScore = data.data.evaluation / 100;
        setEvaluation(evalScore);
        return evalScore;
      }

      return null;
    } catch (err) {
      console.error('Quick eval error:', err);
      return null;
    }
  }, []);

  /**
   * Get full position analysis
   */
  const analyzePosition = useCallback(async (
    fen: string,
    depth: number = 20,
    multiPv: number = 1
  ): Promise<any | null> => {
    try {
      setIsThinking(true);
      setError(null);

      const response = await fetch(`${BACKEND_URL}/api/engine/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fen, depth, multiPv }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        console.error('[Stockfish] API Error Response:', errorText);
        throw new Error(`Engine API error (${response.status}): ${errorText || response.statusText}`);
      }

      const data: EngineResponse = await response.json();

      if (data.success) {
        if (data.data.evaluation !== undefined) {
          setEvaluation(data.data.evaluation / 100);
        }
        return data.data;
      }

      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
      setError(errorMessage);
      console.error('Analysis error:', err);
      return null;
    } finally {
      setIsThinking(false);
    }
  }, []);

  return {
    isThinking,
    evaluation,
    error,
    getBestMove,
    quickEval,
    analyzePosition,
  };
}
