import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Navigation } from '../components/Navigation';
import { Button } from '../components/Button';
import { ChessBoard } from '../components/ChessBoard';
import { GameInfo } from '../components/GameInfo';
import { useOnlineGame } from '../hooks/useOnlineGame';

export const OnlineGamePage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [showDrawOffer, setShowDrawOffer] = useState(false);
  const [chatMessage, setChatMessage] = useState('');

  const {
    chess,
    isConnected,
    isWaiting,
    isMyTurn,
    gameStatus,
    winner,
    error,
    moves,
    chatMessages,
    makeMove,
    resign,
    offerDraw,
    sendChatMessage,
  } = useOnlineGame();

  const handleSquareClick = (square: string) => {
    if (!chess || !isMyTurn || gameStatus === 'finished') return;

    if (selectedSquare) {
      // Try to make a move
      if (selectedSquare !== square) {
        const success = makeMove(selectedSquare, square);
        if (success) {
          setSelectedSquare(null);
        }
      } else {
        setSelectedSquare(null);
      }
    } else {
      // Select a piece
      const piece = chess.get(square as any);
      if (piece && piece.color === chess.turn()) {
        setSelectedSquare(square);
      }
    }
  };

  const handleResign = () => {
    if (window.confirm('Вы уверены, что хотите сдаться?')) {
      resign();
    }
  };

  const handleOfferDraw = () => {
    offerDraw();
    setShowDrawOffer(false);
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatMessage.trim()) {
      sendChatMessage(chatMessage);
      setChatMessage('');
    }
  };

  // const getSquareColor = (square: string) => {
  //   if (selectedSquare === square) {
  //     return 'bg-blue-400';
  //   }
  //   
  //   const availableMoves = getAvailableMoves(selectedSquare || '');
  //   const isAvailable = availableMoves.some((move: any) => move.to === square);
  //   
  //   if (isAvailable) {
  //     return 'bg-green-200';
  //   }
  //   
  //   return '';
  // };

  const getStatusMessage = () => {
    if (error) return error;
    if (!isConnected) return 'Подключение к серверу...';
    if (isWaiting) return 'Ожидание соперника...';
    if (gameStatus === 'finished') {
      if (winner === 'draw') return 'Ничья!';
      return `Игра окончена! Победитель: ${winner}`;
    }
    if (!isMyTurn) return 'Ход соперника';
    return 'Ваш ход';
  };

  const getStatusColor = () => {
    if (error) return 'bg-red-50 border-red-200 text-red-800';
    if (!isConnected || isWaiting) return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    if (gameStatus === 'finished') return 'bg-green-50 border-green-200 text-green-800';
    if (!isMyTurn) return 'bg-blue-50 border-blue-200 text-blue-800';
    return 'bg-green-50 border-green-200 text-green-800';
  };

  return (
    <div className="min-h-screen bg-telegram-bg">
      <Navigation 
        showBackButton 
        title={`Онлайн игра #${gameId}`} 
      />
      
      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-telegram-secondary-bg rounded-lg shadow-lg p-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Chess Board */}
            <div className="lg:col-span-2">
              <ChessBoard
                position={chess?.fen() || 'start'}
                onSquareClick={(square) => handleSquareClick(square)}
                onPieceDrop={() => false}
                gameState={{
                  game: null,
                  isPlayerTurn: isMyTurn,
                  selectedSquare: selectedSquare,
                  possibleMoves: [],
                  isGameOver: gameStatus === 'finished',
                  winner: winner,
                  fen: chess?.fen() || 'start',
                  moves: moves,
                  status: gameStatus,
                }}
                boardWidth={400}
              />
            </div>
            
            {/* Game Info */}
            <div className="space-y-4">
              <GameInfo
                gameState={{
                  game: null,
                  isPlayerTurn: isMyTurn,
                  selectedSquare: selectedSquare,
                  possibleMoves: [],
                  isGameOver: gameStatus === 'finished',
                  winner: winner,
                  fen: chess?.fen() || 'start',
                  moves: moves,
                  status: gameStatus,
                }}
                isPlayerTurn={isMyTurn}
                isThinking={false}
              />
              
              {/* Status */}
              <div className={`border rounded-lg p-4 ${getStatusColor()}`}>
                <p className="text-center font-medium">
                  {getStatusMessage()}
                </p>
              </div>

              {/* Game Controls */}
              {gameStatus === 'active' && (
                <div className="space-y-2">
                  <Button
                    onClick={handleResign}
                    variant="danger"
                    className="w-full"
                  >
                    Сдаться
                  </Button>
                  
                  <Button
                    onClick={() => setShowDrawOffer(true)}
                    variant="secondary"
                    className="w-full"
                  >
                    Предложить ничью
                  </Button>
                </div>
              )}

              {/* Draw Offer Modal */}
              {showDrawOffer && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
                    <h3 className="text-lg font-semibold mb-4">Предложить ничью</h3>
                    <p className="text-gray-600 mb-4">
                      Вы хотите предложить ничью сопернику?
                    </p>
                    <div className="flex space-x-2">
                      <Button
                        onClick={handleOfferDraw}
                        variant="primary"
                        className="flex-1"
                      >
                        Да
                      </Button>
                      <Button
                        onClick={() => setShowDrawOffer(false)}
                        variant="secondary"
                        className="flex-1"
                      >
                        Отмена
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chat */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-telegram-text">Чат</h3>
              
              <div className="bg-telegram-bg rounded-lg p-4 h-64 overflow-y-auto">
                {chatMessages.length === 0 ? (
                  <p className="text-telegram-hint text-center">Нет сообщений</p>
                ) : (
                  <div className="space-y-2">
                    {chatMessages.map((msg, index) => (
                      <div key={index} className="text-sm">
                        <span className="font-medium text-telegram-link">
                          {msg.from}:
                        </span>
                        <span className="ml-2 text-telegram-text">{msg.message}</span>
                        <div className="text-xs text-telegram-hint">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <form onSubmit={handleChatSubmit} className="flex space-x-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Введите сообщение..."
                  className="flex-1 px-3 py-2 border border-telegram-hint rounded-md focus:outline-none focus:ring-2 focus:ring-telegram-button text-telegram-text bg-telegram-bg"
                  disabled={gameStatus === 'finished'}
                />
                <Button
                  variant="primary"
                  disabled={!chatMessage.trim() || gameStatus === 'finished'}
                >
                  Отправить
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

