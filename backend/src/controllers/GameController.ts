import { Request, Response } from 'express';
import { ChessService } from '../services/ChessService';
import { StockfishService } from '../services/StockfishService';
import { AppDataSource } from '../config/database';
import { User } from '../models/User';

export class GameController {
  private chessService = new ChessService();
  private stockfishService = new StockfishService();
  private userRepository = AppDataSource.getRepository(User);

  async createGame(req: Request, res: Response): Promise<void> {
    try {
      const { mode, telegramId } = req.body;

      if (!telegramId) {
        res.status(400).json({ error: 'Telegram ID is required' });
        return;
      }

      // Find or create user
      let user = await this.userRepository.findOne({
        where: { telegramId }
      });

      if (!user) {
        user = new User();
        user.telegramId = telegramId;
        user.username = `user_${telegramId}`;
        user.firstName = 'Player';
        user.rating = 1200;
        await this.userRepository.save(user);
      }

      if (mode === 'ai') {
        // Create AI game (user vs AI)
        const aiUser = await this.userRepository.findOne({
          where: { telegramId: -1 }
        }) || await this.createAIUser();

        const game = await this.chessService.createGame(user.id, aiUser.id);
        
        res.json({
          id: game.id,
          whitePlayer: user,
          blackPlayer: aiUser,
          status: game.status,
          fen: game.fen,
          moves: game.moves,
          createdAt: game.createdAt
        });
      } else {
        // Create online game (for now, just return error)
        res.status(400).json({ error: 'Online mode not implemented yet' });
      }
    } catch (error) {
      console.error('Error creating game:', error);
      res.status(500).json({ error: 'Failed to create game' });
    }
  }

  async getGame(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const game = await this.chessService.getGameState(id);

      if (!game) {
        res.status(404).json({ error: 'Game not found' });
        return;
      }

      res.json(game);
    } catch (error) {
      console.error('Error getting game:', error);
      res.status(500).json({ error: 'Failed to get game' });
    }
  }

  async makeMove(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { from, to, promotion } = req.body;

      if (!from || !to) {
        res.status(400).json({ error: 'From and to squares are required' });
        return;
      }

      const move = await this.chessService.makeMove(id, from, to, promotion);
      res.json(move);
    } catch (error) {
      console.error('Error making move:', error);
      res.status(400).json({ error: (error as Error).message || 'Failed to make move' });
    }
  }

  async getAiMove(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const game = await this.chessService.getGameState(id);

      if (!game) {
        res.status(404).json({ error: 'Game not found' });
        return;
      }

      const bestMove = await this.stockfishService.getBestMove(game.fen);
      const [from, to] = [bestMove.slice(0, 2), bestMove.slice(2, 4)];

      const move = await this.chessService.makeMove(id, from, to);
      res.json(move);
    } catch (error) {
      console.error('Error getting AI move:', error);
      res.status(500).json({ error: 'Failed to get AI move' });
    }
  }

  private async createAIUser(): Promise<User> {
    const aiUser = new User();
    aiUser.telegramId = -1;
    aiUser.username = 'chess_ai';
    aiUser.firstName = 'Chess AI';
    aiUser.rating = 2000;
    return await this.userRepository.save(aiUser);
  }
}
