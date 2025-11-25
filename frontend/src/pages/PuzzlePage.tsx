import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { usePuzzle } from '../hooks/usePuzzle';
import { useTelegramBackButton } from '../hooks/useTelegramBackButton';
import { useTheme } from '../hooks/useTheme';
import { useAchievements } from '../hooks/useAchievements';
import { AchievementNotification } from '../components/AchievementNotification';
import { telegramService } from '../services/telegramService';

const PuzzlePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentPuzzle, loading, error, fetchNextPuzzle, submitAttempt } = usePuzzle();
  const { currentTheme } = useTheme();
  const { recordPuzzleSolved, recordPuzzleFailed, recentlyUnlocked } = useAchievements();

  // Use Telegram native BackButton
  useTelegramBackButton(() => navigate('/main'));

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
      // Incorrect move - don't undo manually, return false and let react-chessboard handle it
      setStatus('incorrect');
      telegramService.notificationOccurred('error');

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
      recordPuzzleSolved();
      telegramService.notificationOccurred('success');
    } else {
      recordPuzzleFailed();
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white" style={{ paddingTop: 'max(env(safe-area-inset-top), 60px)' }}>
      <div className="max-w-2xl mx-auto p-3 sm:p-4">
        {/* Compact Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-lg shadow-lg">
              {currentPuzzle.rating}
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">Tactical Puzzle</h2>
              <p className="text-xs text-slate-400">
                {currentPuzzle.themes[0]?.replace('_', ' ')}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl leading-none mb-1">
              {playerColor === 'white' ? '♔' : '♚'}
            </div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wide">
              {playerColor} to move
            </div>
          </div>
        </div>

        {/* Status Messages - Floating */}
        {status === 'correct' && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-slide-down">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-bold">Brilliant!</span>
          </div>
        )}

        {status === 'incorrect' && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-gradient-to-r from-red-500 to-rose-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-shake">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="font-bold">Not quite!</span>
          </div>
        )}

        {/* Chess Board Container with modern styling */}
        <div className="relative mb-4">
          {/* Board wrapper with glow effect */}
          <div className="relative rounded-2xl overflow-hidden shadow-2xl ring-4 ring-white/10">
            {/* Glow effect */}
            <div className={`absolute -inset-1 bg-gradient-to-r ${currentTheme.glowColor} rounded-2xl blur opacity-20`}></div>

            {/* Actual board */}
            <div className="relative">
              <Chessboard
                {...{
                  position: game.fen(),
                  onPieceDrop: onDrop,
                  boardOrientation: playerColor,
                  customBoardStyle: {
                    borderRadius: '0',
                  },
                  customDarkSquareStyle: {
                    backgroundColor: currentTheme.darkSquare,
                  },
                  customLightSquareStyle: {
                    backgroundColor: currentTheme.lightSquare,
                  },
                  customDropSquareStyle: {
                    boxShadow: 'inset 0 0 1px 6px rgba(255,255,0,0.6)',
                  },
                  arePiecesDraggable: status === 'playing',
                  animationDuration: 200,
                } as any}
              />
            </div>
          </div>

          {/* Overlay for complete state */}
          {status === 'complete' && result && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
              <div className="text-center px-6">
                <div className="text-6xl mb-3">
                  {result.solved ? '🎉' : '😔'}
                </div>
                <h3 className="text-3xl font-black mb-4 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                  {result.solved ? 'Puzzle Solved!' : 'Puzzle Failed'}
                </h3>
                <div className="flex gap-6 justify-center mb-6">
                  <div>
                    <div className="text-slate-400 text-sm mb-1">Rating Change</div>
                    <div className={`text-3xl font-black ${result.rating_change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {result.rating_change > 0 ? '+' : ''}
                      {result.rating_change}
                    </div>
                  </div>
                  <div className="w-px bg-white/20"></div>
                  <div>
                    <div className="text-slate-400 text-sm mb-1">New Rating</div>
                    <div className="text-3xl font-black text-blue-400">{result.new_user_rating}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stats Bar */}
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
              <span className="text-sm text-slate-400">Move <span className="text-white font-bold">{Math.floor(currentMoveIndex / 2) + 1}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-sm text-slate-400">Attempts <span className="text-white font-bold">{attempts}</span></span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {status === 'complete' ? (
            <button
              onClick={handleNext}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black py-4 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span>Next Puzzle</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <>
              {showHint && (
                <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 p-4 rounded-xl backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                    </svg>
                    <span className="text-yellow-400 font-bold text-sm">Hint</span>
                  </div>
                  <div className="text-white font-medium">
                    Move from <span className="font-black text-yellow-300">{solutionMoves[currentMoveIndex]?.substring(0, 2).toUpperCase()}</span> to <span className="font-black text-yellow-300">{solutionMoves[currentMoveIndex]?.substring(2, 4).toUpperCase()}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleShowHint}
                  disabled={showHint}
                  className="bg-slate-700/50 hover:bg-slate-700 disabled:bg-slate-800/50 disabled:text-slate-600 text-white font-bold py-4 rounded-xl backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                  </svg>
                  <span>Hint</span>
                </button>
                <button
                  onClick={handleSkip}
                  className="bg-slate-700/50 hover:bg-slate-700 text-white font-bold py-4 rounded-xl backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                  <span>Skip</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Achievement Notification */}
      <AchievementNotification
        achievement={recentlyUnlocked}
        onClose={() => {}}
      />
    </div>
  );
};

export default PuzzlePage;
