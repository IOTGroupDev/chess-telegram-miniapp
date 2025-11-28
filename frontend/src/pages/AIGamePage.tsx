import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Square } from 'chess.js';
import { ChessBoard } from '../components/ChessBoardModern';
import { useChess } from '../hooks/useChess';
import { useStockfish } from '../hooks/useStockfish';
import type { BestMoveOptions } from '../hooks/useStockfish';
import { useTelegramBackButton } from '../hooks/useTelegramBackButton';
import { useSound } from '../hooks/useSound';
import { useAchievements } from '../hooks/useAchievements';
import { useChallenges } from '../hooks/useChallenges';
import { AchievementNotification } from '../components/AchievementNotification';
import { telegramService } from '../services/telegramService';
import { wakeLockService } from '../services/wakeLockService';
import type { GameState } from '../types';

type AiLevelId = 1 | 2 | 3 | 4;

interface AiLevelConfig {
  id: AiLevelId;
  name: string;
  description: string;
  uciElo?: number;
  moveTime?: number; // ms
}

/**
 * 4 агрегированных уровня для пользователя:
 * - Новичок
 * - Средний
 * - Продвинутый
 * - Гроссмейстер
 *
 * Значения ELO / movetime подобраны на основе исходной сетки.
 */
const AI_LEVELS: AiLevelConfig[] = [
  // Beginner
  { id: 1, name: 'Новичок', description: 'Начальный уровень (до ~800 Elo)', uciElo: 800, moveTime: 300 },
  // Club player / Amateur
  { id: 2, name: 'Любитель', description: 'Клубный игрок (~800–1200 Elo)', uciElo: 1200, moveTime: 500 },
  // Candidate Master
  { id: 3, name: 'Кандидат в мастера', description: 'Сильный разрядник (~1200–1600 Elo)', uciElo: 1600, moveTime: 800 },
  // Grandmaster
  { id: 4, name: 'Гроссмейстер', description: 'Титулованный уровень (1600+ Elo)', uciElo: 2000, moveTime: 1200 },
];

export const AIGamePage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, forceUpdate] = useState({});
  const [gameProcessed, setGameProcessed] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<Square[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<AiLevelConfig | null>(null);
  const [showLevelPopup, setShowLevelPopup] = useState(true);

  const chess = useChess();
  const stockfish = useStockfish();

  const getAiOptions = useCallback((): BestMoveOptions => {
    // Если уровень не выбран, используем самый сложный (Гроссмейстер)
    const lvl = selectedLevel ?? AI_LEVELS[AI_LEVELS.length - 1];

    const opts: BestMoveOptions = {};
    if (lvl.uciElo) {
      opts.uciElo = lvl.uciElo;
    }
    if (lvl.moveTime) {
      opts.moveTime = lvl.moveTime;
    } else {
      // Для максимального уровня — ограничиваемся глубиной
      opts.depth = 20;
    }

    return opts;
  }, [selectedLevel]);
  const { playSound } = useSound();
  const { recordWin, recordLoss, recordDraw, recentlyUnlocked } = useAchievements();
  const { trackWin, trackLoss, trackDraw } = useChallenges();

  // Create gameState object for ChessBoard component
  const gameStateForBoard = useMemo((): GameState => ({
    game: null, // AI game doesn't use Game object
    isPlayerTurn: chess.gameState.isPlayerTurn,
    selectedSquare: selectedSquare,
    possibleMoves: possibleMoves,
    isGameOver: chess.gameState.isGameOver,
    winner: chess.gameState.winner,
    fen: chess.getFen(),
    moves: [],
    status: chess.gameState.isGameOver ? 'finished' : 'active',
  }), [chess.gameState, selectedSquare, possibleMoves, chess]);

  const initializeGame = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setGameProcessed(false);

      // Initialize AI game
      chess.resetGame();
      telegramService.notificationOccurred('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize game');
      telegramService.showAlert('Ошибка инициализации игры');
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Process game end for achievements and challenges
  useEffect(() => {
    if (chess.gameState.isGameOver && !gameProcessed) {
      setGameProcessed(true);

      const moveCount = Math.ceil(chess.history().length / 2); // Full moves (pairs)

      if (chess.gameState.winner === 'white') {
        // Player won
        recordWin(true, moveCount); // isAI = true (for achievements)
        trackWin(true, moveCount);  // isAI = true (for challenges)
      } else if (chess.gameState.winner === 'black') {
        // AI won
        recordLoss();
        trackLoss();
      } else if (chess.gameState.winner === 'draw') {
        // Draw
        recordDraw();
        trackDraw();
      }
    }
  }, [chess.gameState.isGameOver, chess.gameState.winner, gameProcessed, recordWin, recordLoss, recordDraw, trackWin, trackLoss, trackDraw, chess]);

  // Handle square click (click-to-move instead of drag-and-drop)
  const handleSquareClick = useCallback((square: Square) => {
    console.log('[AIGame] handleSquareClick called, square:', square);

    // Can't play if game is over, not player's turn, or AI is thinking
    if (chess.gameState.isGameOver || !chess.gameState.isPlayerTurn || stockfish.isThinking) {
      console.log('[AIGame] Click blocked:', {
        isGameOver: chess.gameState.isGameOver,
        isPlayerTurn: chess.gameState.isPlayerTurn,
        isThinking: stockfish.isThinking
      });
      return;
    }

    const piece = chess.game.get(square);
    console.log('[AIGame] Piece at square:', piece);

    // If no piece selected yet
    if (!selectedSquare) {
      // Select piece if it's player's piece (white)
      if (piece && piece.color === 'w') {
        setSelectedSquare(square);
        const moves = chess.getPossibleMoves(square);
        setPossibleMoves(moves as Square[]);
        telegramService.impactOccurred('light');
      }
      return;
    }

    // If clicking on the same square, deselect
    if (square === selectedSquare) {
      setSelectedSquare(null);
      setPossibleMoves([]);
      return;
    }

    // If clicking on another player's piece, switch selection
    if (piece && piece.color === 'w') {
      setSelectedSquare(square);
      const moves = chess.getPossibleMoves(square);
      setPossibleMoves(moves as Square[]);
      telegramService.impactOccurred('light');
      return;
    }

    // Try to make the move
    const targetPiece = chess.game.get(square);
    const isCapture = targetPiece !== null && targetPiece !== undefined;

    const success = chess.makeMove(selectedSquare, square);

    if (success) {
      // Clear selection
      setSelectedSquare(null);
      setPossibleMoves([]);

      // Play appropriate sound
      playSound(isCapture ? 'capture' : 'move');
      telegramService.notificationOccurred('success');

      // Check for game over
      if (chess.gameState.isGameOver) {
        setTimeout(() => playSound('gameEnd'), 300);
      }

      // Get AI move after player move
      if (!chess.gameState.isGameOver) {
        setTimeout(async () => {
          try {
            const aiMove = await stockfish.getBestMove(chess.getFen(), getAiOptions());
            if (aiMove && aiMove.length >= 4) {
              const from = aiMove.slice(0, 2) as Square;
              const to = aiMove.slice(2, 4) as Square;

              const aiTargetPiece = chess.game.get(to);
              const isAICapture = aiTargetPiece !== null && aiTargetPiece !== undefined;

              const aiMoveSuccess = chess.makeMove(from, to);
              if (aiMoveSuccess) {
                playSound(isAICapture ? 'capture' : 'move');

                if (chess.gameState.isGameOver) {
                  setTimeout(() => playSound('gameEnd'), 300);
                }

                forceUpdate({});
                telegramService.notificationOccurred('success');
              }
            }
          } catch (err) {
            console.error('AI move failed:', err);
            telegramService.notificationOccurred('error');
          }
        }, 500);
      }
    } else {
      // Invalid move, play error sound
      telegramService.notificationOccurred('error');
    }
  }, [chess, stockfish, forceUpdate, playSound, selectedSquare]);

  // Keep drag-and-drop as fallback for desktop
  const handlePieceDrop = useCallback((sourceSquare: string, targetSquare: string) => {
    if (chess.gameState.isGameOver || !chess.gameState.isPlayerTurn || stockfish.isThinking) {
      return false;
    }

    // Check if it's a capture before making the move
    const targetPiece = chess.game.get(targetSquare as Square);
    const isCapture = targetPiece !== null && targetPiece !== undefined;

    const success = chess.makeMove(sourceSquare as Square, targetSquare as Square);

    if (success) {
      // Clear selection after successful move
      setSelectedSquare(null);
      setPossibleMoves([]);

      // Play appropriate sound
      playSound(isCapture ? 'capture' : 'move');
      telegramService.notificationOccurred('success');

      // Check for game over (checkmate)
      if (chess.gameState.isGameOver) {
        setTimeout(() => playSound('gameEnd'), 300);
      }

      // Get AI move after player move
      if (!chess.gameState.isGameOver) {
        setTimeout(async () => {
          try {
            const aiMove = await stockfish.getBestMove(chess.getFen(), getAiOptions());
            if (aiMove && aiMove.length >= 4) {
              const from = aiMove.slice(0, 2) as Square;
              const to = aiMove.slice(2, 4) as Square;

              // Check if AI move is a capture
              const aiTargetPiece = chess.game.get(to);
              const isAICapture = aiTargetPiece !== null && aiTargetPiece !== undefined;

              const aiMoveSuccess = chess.makeMove(from, to);
              if (aiMoveSuccess) {
                // Play sound for AI move
                playSound(isAICapture ? 'capture' : 'move');

                // Check for game over after AI move
                if (chess.gameState.isGameOver) {
                  setTimeout(() => playSound('gameEnd'), 300);
                }

                forceUpdate({}); // Force re-render after AI move
                telegramService.notificationOccurred('success');
              }
            }
          } catch (err) {
            console.error('AI move failed:', err);
            telegramService.notificationOccurred('error');
          }
        }, 500);
      }
    } else {
      telegramService.notificationOccurred('error');
    }

    return success;
  }, [chess, stockfish, forceUpdate, playSound]);

  const handleNewGame = useCallback(() => {
    chess.resetGame();
    setGameProcessed(false);
    setSelectedSquare(null);
    setPossibleMoves([]);
    telegramService.notificationOccurred('success');
  }, [chess]);

  const handleSurrender = useCallback(async () => {
    const confirmed = await telegramService.showConfirm('Вы уверены, что хотите сдаться?');
    if (confirmed) {
      chess.resetGame();
      navigate('/');
    }
  }, [chess, navigate]);

  const handleBack = useCallback(async () => {
    if (chess.gameState.selectedSquare || chess.history().length > 0) {
      const confirmed = await telegramService.showConfirm('Вы уверены, что хотите покинуть игру?');
      if (confirmed) {
        navigate('/main');
      }
    } else {
      navigate('/main');
    }
  }, [chess, navigate]);

  // Use Telegram native BackButton
  useTelegramBackButton(handleBack);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  // Keep screen awake while AI is thinking (critical for Telegram Mini Apps)
  useEffect(() => {
    if (stockfish.isThinking) {
      // AI started thinking - prevent screen from sleeping
      wakeLockService.acquire().then(success => {
        if (success) {
          console.log('[AIGame] Screen wake lock acquired - screen will stay on while AI thinks');
        }
      });
    } else {
      // AI finished - allow screen to sleep again
      wakeLockService.release().then(() => {
        console.log('[AIGame] Screen wake lock released - screen can sleep now');
      });
    }

    // Cleanup: release wake lock when component unmounts
    return () => {
      wakeLockService.release();
    };
  }, [stockfish.isThinking]);

  // Get Telegram theme colors
  const bgColor = '#1e293b';
  const textColor = window.Telegram?.WebApp?.themeParams?.text_color || '#000000';
  const secondaryBgColor = window.Telegram?.WebApp?.themeParams?.secondary_bg_color || '#f4f4f5';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: bgColor }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p style={{ color: textColor }}>Загрузка игры...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: bgColor }}>
        <div className="text-center p-6">
          <h1 className="text-2xl font-bold mb-4" style={{ color: textColor }}>Ошибка</h1>
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={initializeGame}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all active:scale-95"
          >
            Повторить
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: bgColor,
        color: textColor,
        paddingTop: 'max(env(safe-area-inset-top), 16px)',
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
    >
      <div className="max-w-2xl mx-auto p-3 sm:p-4">
        {/* Header with Players */}
        <div className="mb-4">
          {/* AI Player */}
          <div
            className="flex items-center justify-between mb-3 rounded-xl p-3 border shadow-sm"
            style={{
              backgroundColor: secondaryBgColor,
              borderColor: window.Telegram?.WebApp?.themeParams?.hint_color || '#a8a8a8'
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center text-2xl shadow-lg">
                🤖
              </div>
              <div>
                <h3 className="text-base font-bold leading-tight" style={{ color: textColor }}>Stockfish AI</h3>
                <p className="text-xs opacity-60" style={{ color: textColor }}>
                  {selectedLevel
                    ? `Уровень: ${selectedLevel.name} (${selectedLevel.description})`
                    : 'Уровень: Гроссмейстер (Максимальная сила ИИ)'}
                </p>
              </div>
            </div>
            {stockfish.isThinking && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 rounded-full border border-blue-500/30">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                <span className="text-xs text-blue-600 font-medium">Thinking...</span>
              </div>
            )}
          </div>

          {/* Human Player */}
          <div
            className="flex items-center justify-between rounded-xl p-3 border shadow-sm"
            style={{
              backgroundColor: secondaryBgColor,
              borderColor: window.Telegram?.WebApp?.themeParams?.hint_color || '#a8a8a8'
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-2xl shadow-lg">
                👤
              </div>
              <div>
                <h3 className="text-base font-bold leading-tight" style={{ color: textColor }}>You</h3>
                <p className="text-xs opacity-60" style={{ color: textColor }}>Rating: 1500</p>
              </div>
            </div>
            {chess.gameState.isPlayerTurn && !chess.gameState.isGameOver && !stockfish.isThinking && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 rounded-full border border-green-500/30">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                <span className="text-xs text-green-600 font-medium">Your turn</span>
              </div>
            )}
          </div>
        </div>

        {/* Chess Board Container */}
        <div className="relative mb-4">
          <div className="relative rounded-2xl overflow-hidden shadow-xl">
            {/* Actual board */}
            <div className="relative">
              <ChessBoard
                position={chess.getFen()}
                onSquareClick={handleSquareClick}
                onPieceDrop={handlePieceDrop}
                gameState={gameStateForBoard}
                boardWidth={Math.min(window.innerWidth - 32, 500)}
              />
            </div>
          </div>

          {/* Game Over Overlay */}
          {chess.gameState.isGameOver && (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-md rounded-2xl flex items-center justify-center z-10">
              <div className="text-center px-6">
                <div className="text-7xl mb-4">
                  {chess.gameState.winner === 'draw'
                    ? '🤝'
                    : chess.gameState.winner === 'white'
                    ? '🏆'
                    : '😔'}
                </div>
                <h3 className="text-4xl font-black mb-3 text-white">
                  {chess.gameState.winner === 'draw'
                    ? 'Draw!'
                    : chess.gameState.winner === 'white'
                    ? 'You Won!'
                    : 'AI Won!'}
                </h3>
                <p className="text-gray-300 text-lg mb-6">
                  {chess.gameState.winner === 'draw'
                    ? 'Well played by both sides!'
                    : chess.gameState.winner === 'white'
                    ? 'Excellent game! You defeated the AI!'
                    : 'Better luck next time! Keep practicing!'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Game Controls */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleNewGame}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>New Game</span>
          </button>
          <button
            onClick={handleSurrender}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
            </svg>
            <span>Resign</span>
          </button>
        </div>
      </div>

      {/* AI Level Selection Popup */}
      {showLevelPopup && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-slate-900 rounded-2xl p-4 max-w-sm w-full border border-white/10">
            <h2 className="text-white text-lg font-bold mb-2">Выберите уровень ИИ</h2>
            <p className="text-slate-300 text-xs mb-3">
              От новичка до гроссмейстера. Чем выше уровень — тем сильнее и дольше думает движок.
            </p>
            <div className="max-h-80 overflow-y-auto space-y-2">
              {AI_LEVELS.map((lvl) => (
                <button
                  key={lvl.id}
                  onClick={() => {
                    setSelectedLevel(lvl);
                    setShowLevelPopup(false);
                    telegramService.impactOccurred('light');
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 hover:border-blue-400 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white text-sm font-semibold">
                        {lvl.name}
                      </div>
                      <div className="text-slate-400 text-xs">
                        {lvl.description}
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-300">
                      {lvl.uciElo ? `Elo ~${lvl.uciElo}` : 'Максимум'}
                      <br />
                      {lvl.moveTime ? `${lvl.moveTime} ms/ход` : 'по глубине'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Achievement Notification */}
      <AchievementNotification
        achievement={recentlyUnlocked}
        onClose={() => {}}
      />
    </div>
  );
};
