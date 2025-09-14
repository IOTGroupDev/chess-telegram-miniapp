import { useState, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';

interface StockfishMove {
  from: string;
  to: string;
  promotion?: string;
  san: string;
}

export function useStockfish() {
  const [isThinking, setIsThinking] = useState(false);
  const [bestMove, setBestMove] = useState<StockfishMove | null>(null);
  const [evaluation, setEvaluation] = useState<number | null>(null);
  const stockfishRef = useRef<any>(null);

  const initializeStockfish = useCallback(async () => {
    try {
      // Dynamic import to avoid SSR issues
      const { default: Stockfish } = await import('stockfish.js');
      
      if (!stockfishRef.current) {
        stockfishRef.current = new Stockfish();
        
        stockfishRef.current.onmessage = (event: MessageEvent) => {
          const message = event.data;
          
          if (message.startsWith('bestmove')) {
            const parts = message.split(' ');
            if (parts.length >= 2) {
              const move = parts[1];
              if (move && move !== 'none') {
                // Convert UCI move to chess.js format
                const from = move.substring(0, 2);
                const to = move.substring(2, 4);
                const promotion = move.length > 4 ? move.substring(4) : undefined;
                
                // Create a temporary chess instance to get SAN notation
                const tempChess = new Chess();
                tempChess.load(stockfishRef.current.position || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
                
                try {
                  const moveObj = tempChess.move({ from, to, promotion: promotion as any });
                  if (moveObj) {
                    setBestMove({
                      from,
                      to,
                      promotion,
                      san: moveObj.san,
                    });
                  }
                } catch (error) {
                  console.error('Error converting move:', error);
                }
              }
            }
            setIsThinking(false);
          } else if (message.startsWith('info') && message.includes('score cp')) {
            // Extract evaluation score
            const scoreMatch = message.match(/score cp (-?\d+)/);
            if (scoreMatch) {
              setEvaluation(parseInt(scoreMatch[1]) / 100); // Convert centipawns to pawns
            }
          }
        };
      }
    } catch (error) {
      console.error('Failed to initialize Stockfish:', error);
      throw error;
    }
  }, []);

  const getBestMove = useCallback(async (fen: string, depth: number = 15) => {
    if (!stockfishRef.current) {
      await initializeStockfish();
    }

    return new Promise<StockfishMove>((resolve, reject) => {
      try {
        setIsThinking(true);
        setBestMove(null);
        setEvaluation(null);

        // Set position
        stockfishRef.current.postMessage(`position fen ${fen}`);
        
        // Start analysis
        stockfishRef.current.postMessage(`go depth ${depth}`);

        // Set up timeout
        const timeout = setTimeout(() => {
          setIsThinking(false);
          reject(new Error('Stockfish timeout'));
        }, 10000); // 10 second timeout

        // Override the message handler temporarily
        const originalHandler = stockfishRef.current.onmessage;
        stockfishRef.current.onmessage = (event: MessageEvent) => {
          const message = event.data;
          
          if (message.startsWith('bestmove')) {
            clearTimeout(timeout);
            stockfishRef.current.onmessage = originalHandler;
            
            const parts = message.split(' ');
            if (parts.length >= 2) {
              const move = parts[1];
              if (move && move !== 'none') {
                const from = move.substring(0, 2);
                const to = move.substring(2, 4);
                const promotion = move.length > 4 ? move.substring(4) : undefined;
                
                // Create a temporary chess instance to get SAN notation
                const tempChess = new Chess();
                tempChess.load(fen);
                
                try {
                  const moveObj = tempChess.move({ from, to, promotion: promotion as any });
                  if (moveObj) {
                    const stockfishMove: StockfishMove = {
                      from,
                      to,
                      promotion,
                      san: moveObj.san,
                    };
                    setBestMove(stockfishMove);
                    resolve(stockfishMove);
                  } else {
                    reject(new Error('Invalid move from Stockfish'));
                  }
                } catch (error) {
                  reject(error);
                }
              } else {
                reject(new Error('No move available'));
              }
            } else {
              reject(new Error('Invalid response from Stockfish'));
            }
          } else if (message.startsWith('info') && message.includes('score cp')) {
            const scoreMatch = message.match(/score cp (-?\d+)/);
            if (scoreMatch) {
              setEvaluation(parseInt(scoreMatch[1]) / 100);
            }
          }
        };
      } catch (error) {
        setIsThinking(false);
        reject(error);
      }
    });
  }, [initializeStockfish]);

  const stopAnalysis = useCallback(() => {
    if (stockfishRef.current) {
      stockfishRef.current.postMessage('stop');
      setIsThinking(false);
    }
  }, []);

  const destroy = useCallback(() => {
    if (stockfishRef.current) {
      stockfishRef.current.postMessage('quit');
      stockfishRef.current = null;
    }
  }, []);

  return {
    isThinking,
    bestMove,
    evaluation,
    getBestMove,
    stopAnalysis,
    destroy,
    initializeStockfish,
  };
}