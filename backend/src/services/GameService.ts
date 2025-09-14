import { Chess } from 'chess.js';
import { AppDataSource } from '../config/database';
import { Game } from '../models/Game';
import { Move } from '../models/Move';
import { User } from '../models/User';

export class GameService {
  private gameRepository = AppDataSource.getRepository(Game);
  private moveRepository = AppDataSource.getRepository(Move);
  private userRepository = AppDataSource.getRepository(User);

  async createGame(whitePlayerId: string, blackPlayerId: string): Promise<Game> {
    const game = new Game();
    game.whitePlayerId = whitePlayerId;
    game.blackPlayerId = blackPlayerId;
    game.status = 'active';
    game.fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    game.moves = [];
    game.moveNumber = 0;

    return await this.gameRepository.save(game);
  }

  async getGame(gameId: string): Promise<Game | null> {
    return await this.gameRepository.findOne({
      where: { id: gameId },
      relations: ['whitePlayer', 'blackPlayer', 'moveHistory']
    });
  }

  async makeMove(gameId: string, from: string, to: string, promotion?: string): Promise<Game> {
    const game = await this.gameRepository.findOne({
      where: { id: gameId }
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
      moveRecord.moveNumber = game.moveNumber + 1;
      moveRecord.uci = from + to + (promotion || '');
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
      game.moveNumber = game.moveNumber + 1;
      
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
      return game;
    } catch (error) {
      throw new Error(`Invalid move: ${error}`);
    }
  }

  async resignGame(gameId: string, playerId: string): Promise<Game> {
    const game = await this.gameRepository.findOne({
      where: { id: gameId }
    });

    if (!game) {
      throw new Error('Game not found');
    }

    game.status = 'finished';
    game.winner = game.whitePlayerId === playerId ? 'black' : 'white';

    return await this.gameRepository.save(game);
  }

  async drawGame(gameId: string): Promise<Game> {
    const game = await this.gameRepository.findOne({
      where: { id: gameId }
    });

    if (!game) {
      throw new Error('Game not found');
    }

    game.status = 'finished';
    game.winner = 'draw';

    return await this.gameRepository.save(game);
  }

  async getUserHistory(userId: string, limit: number = 20): Promise<Game[]> {
    return await this.gameRepository.find({
      where: [
        { whitePlayerId: userId },
        { blackPlayerId: userId }
      ],
      relations: ['whitePlayer', 'blackPlayer'],
      order: { createdAt: 'DESC' },
      take: limit
    });
  }

  async findWaitingGame(): Promise<Game | null> {
    return await this.gameRepository.findOne({
      where: { status: 'waiting' },
      relations: ['whitePlayer', 'blackPlayer'],
      order: { createdAt: 'ASC' }
    });
  }

  async createWaitingGame(playerId: string): Promise<Game> {
    const game = new Game();
    game.whitePlayerId = playerId;
    game.blackPlayerId = ''; // Will be filled when another player joins
    game.status = 'waiting';
    game.fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    game.moves = [];
    game.moveNumber = 0;

    return await this.gameRepository.save(game);
  }

  async joinWaitingGame(gameId: string, playerId: string): Promise<Game> {
    const game = await this.gameRepository.findOne({
      where: { id: gameId, status: 'waiting' }
    });

    if (!game) {
      throw new Error('Waiting game not found');
    }

    game.blackPlayerId = playerId;
    game.status = 'active';

    return await this.gameRepository.save(game);
  }
}
