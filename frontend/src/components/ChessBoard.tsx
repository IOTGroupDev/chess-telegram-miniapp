import React from 'react';
import type { Square } from 'chess.js';
import type { GameState } from '../types';

interface ChessBoardProps {
  position: string;
  onSquareClick: (square: Square) => void;
  onPieceDrop: (sourceSquare: Square, targetSquare: Square) => boolean;
  gameState: GameState;
  boardWidth?: number;
}

export const ChessBoard: React.FC<ChessBoardProps> = ({
  position,
  onSquareClick,
  onPieceDrop: _onPieceDrop,
  gameState,
  boardWidth = 400,
}) => {
  // Parse FEN position to get piece positions
  const parseFEN = (fen: string) => {
    const [board] = fen.split(' ');
    const rows = board.split('/');
    const pieces: { [key: string]: string } = {};
    
    rows.forEach((row, rankIndex) => {
      let fileIndex = 0;
      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (isNaN(parseInt(char))) {
          const square = String.fromCharCode(97 + fileIndex) + (8 - rankIndex);
          pieces[square] = char;
          fileIndex++;
        } else {
          fileIndex += parseInt(char);
        }
      }
    });
    
    return pieces;
  };

  const pieces = parseFEN(position);
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  const getSquareStyles = (square: Square) => {
    const styles: React.CSSProperties = {};

    if (gameState.selectedSquare === square) {
      styles.backgroundColor = '#4ade80';
      styles.opacity = 0.8;
    } else if (gameState.possibleMoves.includes(square)) {
      styles.backgroundColor = '#ffff00';
      styles.opacity = 0.8;
    }

    return styles;
  };

  const getPieceSymbol = (piece: string): string => {
    const pieces: { [key: string]: string } = {
      'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
      'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
    };
    return pieces[piece] || '';
  };

  const squares = [];
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const square = `${files[file]}${ranks[rank]}` as Square;
      const isLight = (rank + file) % 2 === 0;
      const piece = pieces[square];
      
      const squareStyle: React.CSSProperties = {
        width: `${boardWidth / 8}px`,
        height: `${boardWidth / 8}px`,
        backgroundColor: isLight ? '#f0d9b5' : '#b58863',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        position: 'relative',
        ...getSquareStyles(square),
      };

      squares.push(
        <div
          key={square}
          style={squareStyle}
          onClick={() => onSquareClick(square)}
        >
          {piece && (
            <span 
              style={{ 
                fontSize: `${boardWidth / 12}px`,
                userSelect: 'none',
                pointerEvents: 'none'
              }}
            >
              {getPieceSymbol(piece)}
            </span>
          )}
        </div>
      );
    }
  }

  return (
    <div className="flex justify-center">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 1fr)',
          width: boardWidth,
          height: boardWidth,
          border: '2px solid #333',
          borderRadius: '4px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}
      >
        {squares}
      </div>
    </div>
  );
};