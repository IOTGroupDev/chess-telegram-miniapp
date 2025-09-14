import { useState, useCallback, useEffect } from 'react';
import { Chess } from 'chess.js';
import type { GameState } from '../types';

export const useChess = (initialFen?: string) => {
  const [game] = useState(() => new Chess(initialFen));
  const [gameState, setGameState] = useState<GameState>({
    game: null,
    isPlayerTurn: true,
    selectedSquare: null,
    possibleMoves: [],
    isGameOver: false,
    winner: null,
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    moves: [],
    status: 'active',
  });

  const updateGameState = useCallback(() => {
    const isGameOver = game.isGameOver();
    const winner = isGameOver 
      ? game.isCheckmate() 
        ? (game.turn() === 'w' ? 'black' : 'white')
        : 'draw'
      : null;

    setGameState(prev => ({
      ...prev,
      isGameOver,
      winner,
      isPlayerTurn: !isGameOver && game.turn() === 'w',
    }));
  }, [game]);

  const getPossibleMoves = useCallback((square: string): string[] => {
    const moves = game.moves({ square: square as any, verbose: true });
    return moves.map((move: any) => move.to);
  }, [game]);

  const selectSquare = useCallback((square: string) => {
    if (gameState.isGameOver) return;

    const piece = game.get(square as any);
    if (!piece || piece.color !== game.turn()) {
      setGameState(prev => ({ ...prev, selectedSquare: null, possibleMoves: [] }));
      return;
    }

    const possibleMoves = getPossibleMoves(square);
    setGameState(prev => ({
      ...prev,
      selectedSquare: square,
      possibleMoves,
    }));
  }, [game, gameState.isGameOver, getPossibleMoves]);

  const makeMove = useCallback((from: string, to: string, promotion?: string): boolean => {
    try {
      const move = game.move({
        from: from as any,
        to: to as any,
        promotion: promotion as any,
      });

      if (move) {
        updateGameState();
        setGameState(prev => ({
          ...prev,
          selectedSquare: null,
          possibleMoves: [],
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Invalid move:', error);
      return false;
    }
  }, [game, updateGameState]);

  const resetGame = useCallback(() => {
    game.reset();
    updateGameState();
    setGameState(prev => ({
      ...prev,
      selectedSquare: null,
      possibleMoves: [],
    }));
  }, [game, updateGameState]);

  const getFen = useCallback(() => {
    return game.fen();
  }, [game]);

  const getPgn = useCallback(() => {
    return game.pgn();
  }, [game]);

  const isCheck = useCallback(() => {
    return game.isCheck();
  }, [game]);

  const isCheckmate = useCallback(() => {
    return game.isCheckmate();
  }, [game]);

  const isStalemate = useCallback(() => {
    return game.isStalemate();
  }, [game]);

  const isDraw = useCallback(() => {
    return game.isDraw();
  }, [game]);

  const isGameOver = useCallback(() => {
    return game.isGameOver();
  }, [game]);

  const turn = useCallback(() => {
    return game.turn();
  }, [game]);

  const history = useCallback(() => {
    return game.history({ verbose: true });
  }, [game]);

  useEffect(() => {
    updateGameState();
  }, [updateGameState]);

  return {
    game,
    gameState,
    selectSquare,
    makeMove,
    resetGame,
    getFen,
    getPgn,
    isCheck,
    isCheckmate,
    isStalemate,
    isDraw,
    isGameOver,
    turn,
    history,
    getPossibleMoves,
  };
};