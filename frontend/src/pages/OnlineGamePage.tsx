import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Square } from 'chess.js';
import { ChessBoard } from '../components/ChessBoardModern';
import { useSupabaseGame } from '../hooks/useSupabaseGame';
import { useAppStore } from '../store/useAppStore';
import { useTelegramBackButton } from '../hooks/useTelegramBackButton';
import { telegramService } from '../services/telegramService';
import { useWallet } from '../hooks/useWallet';
import { useGameBet } from '../hooks/useGameBet';
import { BetConfirmationPopup } from '../components/BetConfirmationPopup';
import { DepositWaitingPopup } from '../components/DepositWaitingPopup';
import type { GameState } from '../types';

export const OnlineGamePage: React.FC = () => {
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();
  const { user } = useAppStore();
  const [showDrawOffer, setShowDrawOffer] = useState(false);

  // Click-to-move state
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<Square[]>([]);

  // Use Telegram native BackButton
  useTelegramBackButton(() => navigate('/main'));

  // Use Supabase real-time hook
  const {
    game,
    chess,
    moves,
    isLoading,
    error,
    makeMove: makeSupabaseMove,
    resign: resignGame,
    offerDraw: offerDrawGame,
  } = useSupabaseGame(gameId || '', String(user?.id || ''));

  // Betting hooks
  const { wallet } = useWallet(user?.id || null);
  const { bet, acceptBet, depositBet } = useGameBet(gameId || null, user?.id || null);

  // Derived state
  const isWaiting = game?.status === 'waiting';
  const gameStatus = game?.status || 'waiting';
  const winner = game?.winner;
  const isMyTurn =
    game?.status === 'active' &&
    ((game.move_number % 2 === 0 && game.white_player_id === String(user?.id)) ||
     (game.move_number % 2 === 1 && game.black_player_id === String(user?.id)));

  // Betting state
  const amIWhite = game?.white_player_id === String(user?.id);
  const isWhitePlayer = amIWhite;
  const showBetConfirmation =
    game?.status === 'pending_bet_acceptance' && !isWhitePlayer && bet;
  const showDepositWaiting = game?.status === 'pending_deposits' && bet;

  // Bet handlers
  const handleAcceptBet = async () => {
    try {
      await acceptBet();
      telegramService.notificationOccurred('success');
    } catch (error) {
      console.error('Failed to accept bet:', error);
      telegramService.notificationOccurred('error');
      telegramService.showAlert('Failed to accept bet terms');
    }
  };

  const handleDeclineBet = async () => {
    const confirmed = await telegramService.showConfirm(
      'Are you sure you want to decline this bet?'
    );
    if (confirmed) {
      navigate('/main');
    }
  };

  const handleDepositBet = async () => {
    try {
      const result = await depositBet();
      if (result.success) {
        telegramService.notificationOccurred('success');
        if (result.bothDeposited) {
          telegramService.showAlert('Game starting!');
        }
      } else {
        telegramService.notificationOccurred('error');
        telegramService.showAlert(result.error || 'Failed to deposit bet');
      }
    } catch (error) {
      console.error('Failed to deposit bet:', error);
      telegramService.notificationOccurred('error');
      telegramService.showAlert('Failed to deposit bet');
    }
  };

  const handleCancelBet = async () => {
    const confirmed = await telegramService.showConfirm(
      'Are you sure you want to cancel the bet?'
    );
    if (confirmed) {
      navigate('/main');
    }
  };

  // Create gameState for ChessBoard
  const gameStateForBoard = useMemo((): GameState => ({
    game: game as any, // GameWithPlayers from Supabase has different structure
    isPlayerTurn: isMyTurn,
    selectedSquare: selectedSquare,
    possibleMoves: possibleMoves,
    isGameOver: gameStatus === 'finished',
    winner: winner as 'white' | 'black' | 'draw' | null,
    fen: chess?.fen() || '',
    moves: moves as any, // Supabase moves have different structure
    status: gameStatus as 'active' | 'finished' | 'waiting',
  }), [game, isMyTurn, selectedSquare, possibleMoves, gameStatus, winner, chess, moves]);

  /**
   * Handle square click (click-to-move)
   */
  const handleSquareClick = (square: Square) => {
    if (!chess || !isMyTurn || gameStatus === 'finished') {
      return;
    }

    const piece = chess.get(square);
    const amIWhite = game?.white_player_id === String(user?.id);
    const myColorCode = amIWhite ? 'w' : 'b';

    // If no piece selected yet
    if (!selectedSquare) {
      // Select piece if it's player's piece
      if (piece && piece.color === myColorCode) {
        setSelectedSquare(square);
        const moves = chess.moves({ square, verbose: true });
        setPossibleMoves(moves.map(m => m.to));
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
    if (piece && piece.color === myColorCode) {
      setSelectedSquare(square);
      const moves = chess.moves({ square, verbose: true });
      setPossibleMoves(moves.map(m => m.to));
      telegramService.impactOccurred('light');
      return;
    }
  };

  const handlePieceDrop = (sourceSquare: string, targetSquare: string): boolean => {
    if (!chess || !isMyTurn || gameStatus === 'finished') {
      telegramService.notificationOccurred('error');
      return false;
    }

    // Fire and forget async move
    makeSupabaseMove(sourceSquare, targetSquare).then(success => {
      if (success) {
        // Clear selection after successful move
        setSelectedSquare(null);
        setPossibleMoves([]);
        telegramService.notificationOccurred('success');
      } else {
        telegramService.notificationOccurred('error');
      }
    });

    return true; // Return true immediately to allow the move visually
  };

  const handleResign = async () => {
    const confirmed = await telegramService.showConfirm('Вы уверены, что хотите сдаться?');
    if (confirmed) {
      await resignGame();
      telegramService.notificationOccurred('success');
    }
  };

  const handleOfferDraw = async () => {
    await offerDrawGame();
    setShowDrawOffer(false);
    telegramService.notificationOccurred('success');
  };

  // Get Telegram theme colors
  const bgColor = '#1e293b';
  const textColor = window.Telegram?.WebApp?.themeParams?.text_color || '#ffffff';

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
            onClick={() => navigate('/main')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all active:scale-95"
          >
            Назад
          </button>
        </div>
      </div>
    );
  }

  // Determine player colors and names
  const amIWhite = game?.white_player_id === String(user?.id);
  const myColor = amIWhite ? 'white' : 'black';
  const opponentColor = amIWhite ? 'black' : 'white';

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
          {/* Opponent */}
          <div className="flex items-center justify-between mb-3 bg-slate-800/50 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${opponentColor === 'white' ? 'from-slate-300 to-slate-500' : 'from-slate-700 to-slate-900'} flex items-center justify-center font-bold shadow-lg border-2 ${opponentColor === 'white' ? 'border-white' : 'border-slate-600'}`}>
                {opponentColor === 'white' ? '♔' : '♚'}
              </div>
              <div>
                <h3 className="text-base font-bold text-white leading-tight">Opponent</h3>
                <p className="text-xs text-slate-400">Online Player</p>
              </div>
            </div>
            {!isMyTurn && gameStatus === 'active' && (
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 rounded-full border border-blue-500/30">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                <span className="text-xs text-blue-300 font-medium">Thinking...</span>
              </div>
            )}
            {isWaiting && (
              <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/20 rounded-full border border-yellow-500/30">
                <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></div>
                <span className="text-xs text-yellow-300 font-medium">Waiting...</span>
              </div>
            )}
          </div>

          {/* You */}
          <div className="flex items-center justify-between bg-slate-800/50 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${myColor === 'white' ? 'from-slate-300 to-slate-500' : 'from-slate-700 to-slate-900'} flex items-center justify-center font-bold shadow-lg border-2 ${myColor === 'white' ? 'border-white' : 'border-slate-600'}`}>
                {myColor === 'white' ? '♔' : '♚'}
              </div>
              <div>
                <h3 className="text-base font-bold text-white leading-tight">You</h3>
                <p className="text-xs text-slate-400">{user?.username || 'Player'}</p>
              </div>
            </div>
            {isMyTurn && gameStatus === 'active' && (
              <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 rounded-full border border-green-500/30">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                <span className="text-xs text-green-300 font-medium">Your turn</span>
              </div>
            )}
          </div>
        </div>

        {/* Chess Board Container */}
        <div className="relative mb-4">
          <div className="relative rounded-2xl overflow-hidden shadow-xl">
            <ChessBoard
              position={chess?.fen() || 'start'}
              onSquareClick={handleSquareClick}
              onPieceDrop={handlePieceDrop}
              gameState={gameStateForBoard}
              boardWidth={Math.min(window.innerWidth - 32, 500)}
            />
          </div>

          {/* Game Over Overlay */}
          {gameStatus === 'finished' && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
              <div className="text-center px-6">
                <div className="text-6xl mb-3">
                  {winner === 'draw' ? '🤝' : winner === myColor ? '🎉' : '😔'}
                </div>
                <h3 className="text-3xl font-black mb-4 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                  {winner === 'draw' ? 'Draw!' : winner === myColor ? 'You Won!' : 'You Lost!'}
                </h3>
                <p className="text-slate-300 mb-6">
                  {winner === 'draw'
                    ? 'Well played by both sides!'
                    : winner === myColor
                    ? 'Excellent game! You defeated your opponent!'
                    : 'Good game! Better luck next time!'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Game Controls */}
        {gameStatus === 'active' && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => setShowDrawOffer(true)}
              className="bg-slate-700/50 hover:bg-slate-700 text-white font-bold py-4 rounded-xl backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>Offer Draw</span>
            </button>
            <button
              onClick={handleResign}
              className="bg-red-600/50 hover:bg-red-600 text-white font-bold py-4 rounded-xl backdrop-blur-sm border border-red-500/20 hover:border-red-500/40 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
              </svg>
              <span>Resign</span>
            </button>
          </div>
        )}

        {/* Move History */}
        <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <span className="text-xl">📜</span>
            <span>Move History</span>
          </h3>
          <div className="max-h-48 overflow-y-auto">
            {moves.length === 0 ? (
              <p className="text-slate-400 text-center text-sm py-4">No moves yet</p>
            ) : (
              <div className="space-y-1">
                {moves.map((move, index) => (
                  <div key={move.id} className="flex items-center gap-3 text-sm py-1.5 px-2 rounded hover:bg-slate-700/30">
                    <span className="font-bold text-slate-400 min-w-[2.5rem]">
                      {Math.floor(index / 2) + 1}.
                    </span>
                    <span className="font-mono text-white font-medium flex-1">{move.san}</span>
                    <span className="text-xs text-slate-500">
                      {new Date(move.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Draw Offer Modal */}
        {showDrawOffer && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl p-6 max-w-sm w-full border border-white/10 shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-3">Offer Draw</h3>
              <p className="text-slate-300 mb-6">
                Do you want to offer a draw to your opponent?
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleOfferDraw}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all active:scale-95"
                >
                  Yes
                </button>
                <button
                  onClick={() => setShowDrawOffer(false)}
                  className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-xl transition-all active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Betting Flow Popups */}
        {showBetConfirmation && bet && (
          <BetConfirmationPopup
            show={true}
            bet={bet}
            onAccept={handleAcceptBet}
            onDecline={handleDeclineBet}
            isProposer={false}
          />
        )}

        {showDepositWaiting && bet && (
          <DepositWaitingPopup
            show={true}
            bet={bet}
            isWhitePlayer={isWhitePlayer}
            onDeposit={handleDepositBet}
            onCancel={handleCancelBet}
          />
        )}
      </div>
    </div>
  );
};

