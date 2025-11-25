import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Square } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { useChess } from '../hooks/useChess';
import { useStockfish } from '../hooks/useStockfish';
import { useTelegramBackButton } from '../hooks/useTelegramBackButton';
import { useTheme } from '../hooks/useTheme';
import { useSound } from '../hooks/useSound';
import { useAchievements } from '../hooks/useAchievements';
import { useChallenges } from '../hooks/useChallenges';
import { AchievementNotification } from '../components/AchievementNotification';
import { telegramService } from '../services/telegramService';

export const AIGamePage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, forceUpdate] = useState({});
  const [gameProcessed, setGameProcessed] = useState(false);

  const chess = useChess();
  const stockfish = useStockfish();
  const { currentTheme } = useTheme();
  const { playSound } = useSound();
  const { recordWin, recordLoss, recordDraw, recentlyUnlocked } = useAchievements();
  const { trackWin, trackLoss, trackDraw } = useChallenges();

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

  const handlePieceDrop = useCallback((sourceSquare: string, targetSquare: string) => {
    if (chess.gameState.isGameOver || !chess.gameState.isPlayerTurn || stockfish.isThinking) {
      return false;
    }

    // Check if it's a capture before making the move
    const targetPiece = chess.gameState.game?.get(targetSquare as Square);
    const isCapture = targetPiece !== null && targetPiece !== undefined;

    const success = chess.makeMove(sourceSquare as Square, targetSquare as Square);

    if (success) {
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
            const aiMove = await stockfish.getBestMove(chess.getFen());
            if (aiMove && aiMove.length >= 4) {
              const from = aiMove.slice(0, 2) as Square;
              const to = aiMove.slice(2, 4) as Square;

              // Check if AI move is a capture
              const aiTargetPiece = chess.gameState.game?.get(to);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white">Загрузка игры...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center p-6">
          <h1 className="text-2xl font-bold text-white mb-4">Ошибка</h1>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white" style={{ paddingTop: 'max(env(safe-area-inset-top), 60px)' }}>
      <div className="max-w-2xl mx-auto p-3 sm:p-4">
        {/* Header with Players */}
        <div className="mb-4">
          {/* AI Player */}
          <div className="flex items-center justify-between mb-3 bg-slate-800/50 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center font-bold shadow-lg">
                🤖
              </div>
              <div>
                <h3 className="text-base font-bold text-white leading-tight">Stockfish AI</h3>
                <p className="text-xs text-slate-400">Depth: 15</p>
              </div>
            </div>
            {stockfish.isThinking && (
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 rounded-full border border-blue-500/30">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                <span className="text-xs text-blue-300 font-medium">Thinking...</span>
              </div>
            )}
          </div>

          {/* Human Player */}
          <div className="flex items-center justify-between bg-slate-800/50 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center font-bold shadow-lg">
                👤
              </div>
              <div>
                <h3 className="text-base font-bold text-white leading-tight">You</h3>
                <p className="text-xs text-slate-400">Rating: 1500</p>
              </div>
            </div>
            {chess.gameState.isPlayerTurn && !chess.gameState.isGameOver && !stockfish.isThinking && (
              <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 rounded-full border border-green-500/30">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                <span className="text-xs text-green-300 font-medium">Your turn</span>
              </div>
            )}
          </div>
        </div>

        {/* Chess Board Container */}
        <div className="relative mb-4">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl ring-4 ring-white/10">
            {/* Glow effect */}
            <div className={`absolute -inset-1 bg-gradient-to-r ${currentTheme.glowColor} rounded-2xl blur opacity-20`}></div>

            {/* Actual board */}
            <div className="relative">
              <Chessboard
                {...{
                  position: chess.getFen(),
                  onPieceDrop: handlePieceDrop,
                  boardOrientation: 'white',
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
                  arePiecesDraggable: chess.gameState.isPlayerTurn && !chess.gameState.isGameOver && !stockfish.isThinking,
                  animationDuration: 200,
                } as any}
              />
            </div>
          </div>

          {/* Game Over Overlay */}
          {chess.gameState.isGameOver && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
              <div className="text-center px-6">
                <div className="text-6xl mb-3">
                  {chess.gameState.winner === 'draw'
                    ? '🤝'
                    : chess.gameState.winner === 'white'
                    ? '🎉'
                    : '😔'}
                </div>
                <h3 className="text-3xl font-black mb-4 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                  {chess.gameState.winner === 'draw'
                    ? 'Draw!'
                    : chess.gameState.winner === 'white'
                    ? 'You Won!'
                    : 'AI Won!'}
                </h3>
                <p className="text-slate-300 mb-6">
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
            className="bg-slate-700/50 hover:bg-slate-700 text-white font-bold py-4 rounded-xl backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>New Game</span>
          </button>
          <button
            onClick={handleSurrender}
            className="bg-red-600/50 hover:bg-red-600 text-white font-bold py-4 rounded-xl backdrop-blur-sm border border-red-500/20 hover:border-red-500/40 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
            </svg>
            <span>Resign</span>
          </button>
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
