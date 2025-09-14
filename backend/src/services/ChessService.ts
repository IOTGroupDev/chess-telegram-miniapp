import { Chess } from 'chess.js';
import { Game } from '../models/Game';
import { Move } from '../models/Move';
import { AppDataSource } from '../config/database';

export class ChessService {
  private gameRepository = AppDataSource.getRepository(Game);
  private moveRepository = AppDataSource.getRepository(Move);

  async makeMove(gameId: string, from: string, to: string, promotion?: string): Promise<Move> {
    const game = await this.gameRepository.findOne({
      where: { id: gameId },
      relations: ['whitePlayer', 'blackPlayer']
    });

    if (!game) {
      throw new Error('Game not found');
    }

    if (game.status !== 'active') {
      throw new Error('Game is not active');
    }

    const chess = new Chess(game.fen);
    
    try {
      const move = chess.move({
        from,
        to,
        promotion: promotion as any,
      });

      if (!move) {
        throw new Error('Invalid move');
      }

      // Create move record
      const moveRecord = new Move();
      moveRecord.gameId = gameId;
      moveRecord.from = from;
      moveRecord.to = to;
      moveRecord.piece = move.piece;
      moveRecord.captured = move.captured;
      moveRecord.promotion = move.promotion;
      moveRecord.san = move.san;
      moveRecord.fen = chess.fen();
      moveRecord.timestamp = new Date();

      await this.moveRepository.save(moveRecord);

      // Update game
      game.fen = chess.fen();
      game.moves = chess.history({ verbose: true });
      
      // Check for game end
      if (chess.isGameOver()) {
        game.status = 'finished';
        if (chess.isCheckmate()) {
          game.winner = chess.turn() === 'w' ? 'black' : 'white';
        } else if (chess.isDraw()) {
          game.winner = 'draw';
        }
      }

      await this.gameRepository.save(game);

      return moveRecord;
    } catch (error) {
      throw new Error(`Invalid move: ${error}`);
    }
  }

  async getGameState(gameId: string): Promise<Game | null> {
    return await this.gameRepository.findOne({
      where: { id: gameId },
      relations: ['whitePlayer', 'blackPlayer', 'moveHistory']
    });
  }

  async createGame(whitePlayerId: string, blackPlayerId: string): Promise<Game> {
    const game = new Game();
    game.whitePlayerId = whitePlayerId;
    game.blackPlayerId = blackPlayerId;
    game.status = 'active';
    game.fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    game.moves = [];

    return await this.gameRepository.save(game);
  }

  async getValidMoves(gameId: string, square: string): Promise<string[]> {
    const game = await this.gameRepository.findOne({
      where: { id: gameId }
    });

    if (!game) {
      throw new Error('Game not found');
    }

    const chess = new Chess(game.fen);
    const moves = chess.moves({ square: square as any, verbose: true });
    
    return moves.map((move: any) => move.to);
  }
}
