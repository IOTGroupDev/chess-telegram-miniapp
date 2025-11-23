import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { usePuzzle } from '../hooks/usePuzzle';
import { telegramService } from '../services/telegramService';

const PuzzlePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentPuzzle, loading, error, fetchNextPuzzle, submitAttempt } = usePuzzle();

  const [game, setGame] = useState<Chess | null>(null);
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [solutionMoves, setSolutionMoves] = useState<string[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [status, setStatus] = useState<'playing' | 'correct' | 'incorrect' | 'complete'>('playing');
  const [attempts, setAttempts] = useState(0);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [showHint, setShowHint] = useState(false);
  const [result, setResult] = useState<any>(null);

  /**
   * Load initial puzzle
   */
  useEffect(() => {
    fetchNextPuzzle();
  }, [fetchNextPuzzle]);

  /**
   * Initialize puzzle when loaded
   */
  useEffect(() => {
    if (currentPuzzle) {
      const chess = new Chess(currentPuzzle.fen);
      setGame(chess);

      // Determine player color (opposite of the side to move in FEN)
      const sideToMove = chess.turn();
      setPlayerColor(sideToMove === 'w' ? 'white' : 'black');

      // Parse solution moves
      const moves = currentPuzzle.moves.split(' ');
      setSolutionMoves(moves);
      setCurrentMoveIndex(0);
      setMoveHistory([]);
      setStatus('playing');
      setAttempts(0);
      setStartTime(Date.now());
      setShowHint(false);
      setResult(null);

      // Make opponent's first move if needed
      if (sideToMove === chess.turn()) {
        setTimeout(() => makeOpponentMove(chess, moves, 0), 500);
      }
    }
  }, [currentPuzzle]);

  /**
   * Make opponent move (from solution)
   */
  const makeOpponentMove = (chess: Chess, moves: string[], index: number) => {
    if (index >= moves.length) return;

    const moveUci = moves[index];
    const from = moveUci.substring(0, 2);
    const to = moveUci.substring(2, 4);
    const promotion = moveUci.length > 4 ? moveUci[4] : undefined;

    try {
      chess.move({ from, to, promotion });
      setGame(new Chess(chess.fen()));
      setCurrentMoveIndex(index + 1);
    } catch (error) {
      console.error('Invalid opponent move:', error);
    }
  };

  /**
   * Handle player move
   */
  const onDrop = (sourceSquare: string, targetSquare: string, piece: string) => {
    if (!game || status !== 'playing') return false;

    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    // Check if it's player's turn
    const playerTurn = game.turn() === (playerColor === 'white' ? 'w' : 'b');
    if (!playerTurn) return false;

    // Try to make the move
    let move;
    try {
      // Check for promotion
      const promotion =
        piece[1].toLowerCase() === 'p' &&
        ((targetSquare[1] === '8' && playerColor === 'white') ||
          (targetSquare[1] === '1' && playerColor === 'black'))
          ? 'q'
          : undefined;

      move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion,
      });
    } catch (error) {
      setStatus('incorrect');
      telegramService.notificationOccurred('error');

      setTimeout(() => {
        setStatus('playing');
      }, 1000);

      return false;
    }

    if (!move) return false;

    const moveUci = move.from + move.to + (move.promotion || '');
    setMoveHistory([...moveHistory, moveUci]);

    // Check if move is correct
    const expectedMove = solutionMoves[currentMoveIndex];
    if (moveUci !== expectedMove) {
      // Incorrect move
      setStatus('incorrect');
      telegramService.notificationOccurred('error');

      // Undo the move
      game.undo();
      setGame(new Chess(game.fen()));

      setTimeout(() => {
        setStatus('playing');
      }, 1000);

      return false;
    }

    // Correct move!
    setStatus('correct');
    telegramService.notificationOccurred('success');
    setGame(new Chess(game.fen()));

    // Check if puzzle is complete
    if (currentMoveIndex + 1 >= solutionMoves.length) {
      // Puzzle solved!
      handlePuzzleComplete(true, newAttempts);
    } else {
      // Make opponent's next move
      setTimeout(() => {
        makeOpponentMove(game, solutionMoves, currentMoveIndex + 1);
        setStatus('playing');
      }, 500);
    }

    return true;
  };

  /**
   * Handle puzzle completion
   */
  const handlePuzzleComplete = async (solved: boolean, finalAttempts: number) => {
    if (!currentPuzzle) return;

    setStatus('complete');
    const timeSpent = Date.now() - startTime;

    const puzzleResult = await submitAttempt(
      currentPuzzle.id,
      solved,
      timeSpent,
      finalAttempts
    );

    setResult(puzzleResult);

    if (solved) {
      telegramService.notificationOccurred('success');
    }
  };

  /**
   * Show hint
   */
  const handleShowHint = () => {
    setShowHint(true);
    telegramService.impactOccurred();
  };

  /**
   * Skip puzzle
   */
  const handleSkip = () => {
    if (currentPuzzle) {
      handlePuzzleComplete(false, attempts);
    }
  };

  /**
   * Next puzzle
   */
  const handleNext = () => {
    fetchNextPuzzle();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading puzzle...</div>
      </div>
    );
  }

  if (error || !currentPuzzle || !game) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">
            {error || 'No puzzles available'}
          </div>
          <button
            onClick={() => navigate('/main')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg"
          >
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-4">
        <button onClick={() => navigate('/main')} className="text-blue-400 mb-2">
          ← Back
        </button>

        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">Tactical Puzzle</h2>
              <p className="text-gray-400 text-sm">
                Rating: {currentPuzzle.rating} • {currentPuzzle.themes.join(', ')}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-400">
                {playerColor === 'white' ? '♔' : '♚'}
              </div>
              <div className="text-sm text-gray-400">
                {playerColor === 'white' ? 'White to move' : 'Black to move'}
              </div>
            </div>
          </div>
        </div>

        {/* Status Message */}
        {status === 'correct' && (
          <div className="bg-green-600 text-white p-3 rounded-lg mb-4 animate-fade-in">
            ✓ Correct move!
          </div>
        )}

        {status === 'incorrect' && (
          <div className="bg-red-600 text-white p-3 rounded-lg mb-4 animate-fade-in">
            ✗ Try again!
          </div>
        )}

        {status === 'complete' && result && (
          <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-4 rounded-lg mb-4">
            <h3 className="text-xl font-bold mb-2">
              {result.solved ? '🎉 Puzzle Solved!' : '❌ Puzzle Failed'}
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-200">Rating Change</div>
                <div className="text-2xl font-bold">
                  {result.rating_change > 0 ? '+' : ''}
                  {result.rating_change}
                </div>
              </div>
              <div>
                <div className="text-gray-200">New Rating</div>
                <div className="text-2xl font-bold">{result.new_user_rating}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chess Board */}
      <div className="max-w-2xl mx-auto mb-4">
        <Chessboard
          {...{
            position: game.fen(),
            onPieceDrop: onDrop,
            boardOrientation: playerColor,
            customBoardStyle: {
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
            },
            arePiecesDraggable: status === 'playing'
          } as any}
        />
      </div>

      {/* Actions */}
      <div className="max-w-2xl mx-auto space-y-3">
        {status === 'complete' ? (
          <button
            onClick={handleNext}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg"
          >
            Next Puzzle →
          </button>
        ) : (
          <>
            {showHint && (
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="text-sm text-gray-400 mb-1">Hint:</div>
                <div className="text-white">
                  Move from {solutionMoves[currentMoveIndex]?.substring(0, 2)} to{' '}
                  {solutionMoves[currentMoveIndex]?.substring(2, 4)}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleShowHint}
                disabled={showHint}
                className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white font-bold py-3 rounded-lg"
              >
                💡 Hint
              </button>
              <button
                onClick={handleSkip}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg"
              >
                ⏭️ Skip
              </button>
            </div>
          </>
        )}

        <div className="text-center text-gray-400 text-sm">
          Attempts: {attempts} • Move: {Math.floor(currentMoveIndex / 2) + 1}
        </div>
      </div>
    </div>
  );
};

export default PuzzlePage;
