/**
 * Modern Chess Board Component
 * Beautiful, clean design inspired by Chess.com and Lichess
 * Uses proper chess piece rendering instead of Unicode symbols
 */

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

// Beautiful modern chess piece SVG paths (simplified for performance)
const chessPieceSVG = {
  // White pieces
  'K': `<svg viewBox="0 0 45 45"><g fill="#fff" stroke="#000" stroke-width="1.5"><path d="M 22.5,11.63 L 22.5,6"/><path d="M 20,8 L 25,8"/><path d="M 22.5,25 C 22.5,25 27,17.5 25.5,14.5 C 25.5,14.5 24.5,12 22.5,12 C 20.5,12 19.5,14.5 19.5,14.5 C 18,17.5 22.5,25 22.5,25"/><path d="M 12.5,37 C 18,40.5 27,40.5 32.5,37 L 32.5,30 C 32.5,30 41.5,25.5 38.5,19.5 C 34.5,13 25,16 22.5,23.5 L 22.5,27 L 22.5,23.5 C 20,16 10.5,13 6.5,19.5 C 3.5,25.5 12.5,30 12.5,30 L 12.5,37"/></g></svg>`,
  'Q': `<svg viewBox="0 0 45 45"><g fill="#fff" stroke="#000" stroke-width="1.5"><circle cx="6" cy="12" r="2.75"/><circle cx="14" cy="9" r="2.75"/><circle cx="22.5" cy="8" r="2.75"/><circle cx="31" cy="9" r="2.75"/><circle cx="39" cy="12" r="2.75"/><path d="M 9,26 C 17.5,24.5 30,24.5 36,26 L 38.5,13.5 L 31,25 L 30.7,10.9 L 25.5,24.5 L 22.5,10 L 19.5,24.5 L 14.3,10.9 L 14,25 L 6.5,13.5 L 9,26 z"/><path d="M 9,26 C 9,28 10.5,28 11.5,30 C 12.5,31.5 12.5,31 12,33.5 C 10.5,34.5 11,36 11,36 C 9.5,37.5 11,38.5 11,38.5 C 17.5,39.5 27.5,39.5 34,38.5 C 34,38.5 35.5,37.5 34,36 C 34,36 34.5,34.5 33,33.5 C 32.5,31 32.5,31.5 33.5,30 C 34.5,28 36,28 36,26 C 30,24.5 15,24.5 9,26 z"/></g></svg>`,
  'R': `<svg viewBox="0 0 45 45"><g fill="#fff" stroke="#000" stroke-width="1.5"><path d="M 9,39 L 36,39 L 36,36 L 9,36 L 9,39 z"/><path d="M 12,36 L 12,32 L 33,32 L 33,36 L 12,36 z"/><path d="M 11,14 L 11,9 L 15,9 L 15,11 L 20,11 L 20,9 L 25,9 L 25,11 L 30,11 L 30,9 L 34,9 L 34,14"/><path d="M 34,14 L 31,17 L 14,17 L 11,14"/><path d="M 31,17 L 31,29.5 L 14,29.5 L 14,17"/><path d="M 31,29.5 L 32.5,32 L 12.5,32 L 14,29.5"/></g></svg>`,
  'B': `<svg viewBox="0 0 45 45"><g fill="#fff" stroke="#000" stroke-width="1.5"><path d="M 9,36 C 12.39,35.03 19.11,36.43 22.5,34 C 25.89,36.43 32.61,35.03 36,36 C 36,36 37.65,36.54 39,38 C 38.32,38.97 37.35,38.99 36,38.5 C 32.61,37.53 25.89,38.96 22.5,37.5 C 19.11,38.96 12.39,37.53 9,38.5 C 7.65,38.99 6.68,38.97 6,38 C 7.35,36.54 9,36 9,36 z"/><path d="M 15,32 C 17.5,34.5 27.5,34.5 30,32 C 30.5,30.5 30,30 30,30 C 30,27.5 27.5,26 27.5,26 C 33,24.5 33.5,14.5 22.5,10.5 C 11.5,14.5 12,24.5 17.5,26 C 17.5,26 15,27.5 15,30 C 15,30 14.5,30.5 15,32 z"/><path d="M 25,8 A 2.5,2.5 0 1 1 20,8 A 2.5,2.5 0 1 1 25,8 z"/></g></svg>`,
  'N': `<svg viewBox="0 0 45 45"><g fill="#fff" stroke="#000" stroke-width="1.5"><path d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18"/><path d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,9.506 13.5,8.5 13.5,7.5 C 14.5,6.5 16.5,10 16.5,10 L 18.5,10 C 18.5,10 19.28,8.008 21,7 C 22,7 22,10 22,10"/></g></svg>`,
  'P': `<svg viewBox="0 0 45 45"><g fill="#fff" stroke="#000" stroke-width="1.5"><path d="M 22.5,9 C 19.5,9 17,11.5 17,14.5 C 17,17 18,18 18,18 C 18,18 15,19.5 15,24 C 15,29 17.5,30 17.5,30 L 27.5,30 C 27.5,30 30,29 30,24 C 30,19.5 27,18 27,18 C 27,18 28,17 28,14.5 C 28,11.5 25.5,9 22.5,9 z"/></g></svg>`,
  // Black pieces
  'k': `<svg viewBox="0 0 45 45"><g fill="#000" stroke="#000" stroke-width="1.5"><path d="M 22.5,11.63 L 22.5,6"/><path d="M 20,8 L 25,8"/><path d="M 22.5,25 C 22.5,25 27,17.5 25.5,14.5 C 25.5,14.5 24.5,12 22.5,12 C 20.5,12 19.5,14.5 19.5,14.5 C 18,17.5 22.5,25 22.5,25"/><path d="M 12.5,37 C 18,40.5 27,40.5 32.5,37 L 32.5,30 C 32.5,30 41.5,25.5 38.5,19.5 C 34.5,13 25,16 22.5,23.5 L 22.5,27 L 22.5,23.5 C 20,16 10.5,13 6.5,19.5 C 3.5,25.5 12.5,30 12.5,30 L 12.5,37"/></g></svg>`,
  'q': `<svg viewBox="0 0 45 45"><g fill="#000" stroke="#000" stroke-width="1.5"><circle cx="6" cy="12" r="2.75"/><circle cx="14" cy="9" r="2.75"/><circle cx="22.5" cy="8" r="2.75"/><circle cx="31" cy="9" r="2.75"/><circle cx="39" cy="12" r="2.75"/><path d="M 9,26 C 17.5,24.5 30,24.5 36,26 L 38.5,13.5 L 31,25 L 30.7,10.9 L 25.5,24.5 L 22.5,10 L 19.5,24.5 L 14.3,10.9 L 14,25 L 6.5,13.5 L 9,26 z"/><path d="M 9,26 C 9,28 10.5,28 11.5,30 C 12.5,31.5 12.5,31 12,33.5 C 10.5,34.5 11,36 11,36 C 9.5,37.5 11,38.5 11,38.5 C 17.5,39.5 27.5,39.5 34,38.5 C 34,38.5 35.5,37.5 34,36 C 34,36 34.5,34.5 33,33.5 C 32.5,31 32.5,31.5 33.5,30 C 34.5,28 36,28 36,26 C 30,24.5 15,24.5 9,26 z"/></g></svg>`,
  'r': `<svg viewBox="0 0 45 45"><g fill="#000" stroke="#000" stroke-width="1.5"><path d="M 9,39 L 36,39 L 36,36 L 9,36 L 9,39 z"/><path d="M 12,36 L 12,32 L 33,32 L 33,36 L 12,36 z"/><path d="M 11,14 L 11,9 L 15,9 L 15,11 L 20,11 L 20,9 L 25,9 L 25,11 L 30,11 L 30,9 L 34,9 L 34,14"/><path d="M 34,14 L 31,17 L 14,17 L 11,14"/><path d="M 31,17 L 31,29.5 L 14,29.5 L 14,17"/><path d="M 31,29.5 L 32.5,32 L 12.5,32 L 14,29.5"/></g></svg>`,
  'b': `<svg viewBox="0 0 45 45"><g fill="#000" stroke="#000" stroke-width="1.5"><path d="M 9,36 C 12.39,35.03 19.11,36.43 22.5,34 C 25.89,36.43 32.61,35.03 36,36 C 36,36 37.65,36.54 39,38 C 38.32,38.97 37.35,38.99 36,38.5 C 32.61,37.53 25.89,38.96 22.5,37.5 C 19.11,38.96 12.39,37.53 9,38.5 C 7.65,38.99 6.68,38.97 6,38 C 7.35,36.54 9,36 9,36 z"/><path d="M 15,32 C 17.5,34.5 27.5,34.5 30,32 C 30.5,30.5 30,30 30,30 C 30,27.5 27.5,26 27.5,26 C 33,24.5 33.5,14.5 22.5,10.5 C 11.5,14.5 12,24.5 17.5,26 C 17.5,26 15,27.5 15,30 C 15,30 14.5,30.5 15,32 z"/><path d="M 25,8 A 2.5,2.5 0 1 1 20,8 A 2.5,2.5 0 1 1 25,8 z"/></g></svg>`,
  'n': `<svg viewBox="0 0 45 45"><g fill="#000" stroke="#000" stroke-width="1.5"><path d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18"/><path d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,9.506 13.5,8.5 13.5,7.5 C 14.5,6.5 16.5,10 16.5,10 L 18.5,10 C 18.5,10 19.28,8.008 21,7 C 22,7 22,10 22,10"/></g></svg>`,
  'p': `<svg viewBox="0 0 45 45"><g fill="#000" stroke="#000" stroke-width="1.5"><path d="M 22.5,9 C 19.5,9 17,11.5 17,14.5 C 17,17 18,18 18,18 C 18,18 15,19.5 15,24 C 15,29 17.5,30 17.5,30 L 27.5,30 C 27.5,30 30,29 30,24 C 30,19.5 27,18 27,18 C 27,18 28,17 28,14.5 C 28,11.5 25.5,9 22.5,9 z"/></g></svg>`,
};

export const ChessBoard: React.FC<ChessBoardProps> = ({
  position,
  onSquareClick,
  onPieceDrop,
  gameState,
  boardWidth = 400,
}) => {
  // Parse FEN
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

  const handleClick = (square: Square) => {
    console.log('[ChessBoard] Square clicked:', square);

    if (gameState.selectedSquare && gameState.possibleMoves.includes(square)) {
      console.log('[ChessBoard] Making move:', gameState.selectedSquare, '->', square);
      onPieceDrop(gameState.selectedSquare as Square, square);
    } else {
      console.log('[ChessBoard] Selecting/deselecting square:', square);
      onSquareClick(square);
    }
  };

  // Modern color schemes (Chess.com inspired)
  const lightSquare = '#f0d9b5';
  const darkSquare = '#b58863';
  const selectedSquare = '#f7f769';
  const possibleMoveSquare = '#6BBF59';

  const squares = [];
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const square = `${files[file]}${ranks[rank]}` as Square;
      const isLight = (rank + file) % 2 === 0;
      const piece = pieces[square];
      const isSelected = gameState.selectedSquare === square;
      const isPossibleMove = gameState.possibleMoves.includes(square);

      let bgColor = isLight ? lightSquare : darkSquare;
      if (isSelected) bgColor = selectedSquare;

      squares.push(
        <div
          key={square}
          data-square={square}
          className="chess-square"
          style={{
            width: `${boardWidth / 8}px`,
            height: `${boardWidth / 8}px`,
            backgroundColor: bgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            position: 'relative',
            pointerEvents: 'auto',
            touchAction: 'manipulation',
            transition: 'all 0.15s ease',
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleClick(square);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleClick(square);
          }}
        >
          {/* Possible move indicator */}
          {isPossibleMove && (
            <div
              style={{
                position: 'absolute',
                width: piece ? '90%' : '30%',
                height: piece ? '90%' : '30%',
                borderRadius: piece ? '8px' : '50%',
                backgroundColor: piece ? 'rgba(107, 191, 89, 0.35)' : possibleMoveSquare,
                border: piece ? `3px solid ${possibleMoveSquare}` : 'none',
                zIndex: 1,
              }}
            />
          )}

          {/* Chess piece */}
          {piece && (
            <div
              style={{
                width: '85%',
                height: '85%',
                position: 'relative',
                zIndex: 2,
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
              }}
              dangerouslySetInnerHTML={{ __html: chessPieceSVG[piece as keyof typeof chessPieceSVG] || '' }}
            />
          )}
        </div>
      );
    }
  }

  const coordinateFontSize = Math.max(10, boardWidth / 30);
  const coordinatePadding = Math.max(4, boardWidth / 80);

  return (
    <div className="flex justify-center">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {/* Rank labels (1-8) on the left */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-around',
              height: boardWidth,
              marginRight: coordinatePadding,
            }}
          >
            {ranks.map((rank) => (
              <div
                key={rank}
                style={{
                  fontSize: `${coordinateFontSize}px`,
                  fontWeight: 'bold',
                  color: '#666',
                  userSelect: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  height: `${boardWidth / 8}px`,
                }}
              >
                {rank}
              </div>
            ))}
          </div>

          {/* Chess board */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(8, 1fr)',
              width: boardWidth,
              height: boardWidth,
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.1)',
            }}
          >
            {squares}
          </div>
        </div>

        {/* File labels (a-h) at the bottom */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            width: boardWidth,
            marginTop: coordinatePadding,
            marginLeft: `${coordinateFontSize + coordinatePadding * 2}px`,
          }}
        >
          {files.map((file) => (
            <div
              key={file}
              style={{
                fontSize: `${coordinateFontSize}px`,
                fontWeight: 'bold',
                color: '#666',
                userSelect: 'none',
                width: `${boardWidth / 8}px`,
                textAlign: 'center',
              }}
            >
              {file}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
