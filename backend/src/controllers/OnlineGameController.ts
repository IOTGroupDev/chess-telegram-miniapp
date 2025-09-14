import { Request, Response } from 'express';
import { GameService } from '../services/GameService';
import { AppDataSource } from '../config/database';
import { User } from '../models/User';

export class OnlineGameController {
  private gameService = new GameService();
  private userRepository = AppDataSource.getRepository(User);

  async createGame(req: Request, res: Response): Promise<void> {
    try {
      const { telegramId, mode } = req.body;

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

      if (mode === 'waiting') {
        // Create waiting game for matchmaking
        const game = await this.gameService.createWaitingGame(user.id);
        
        res.json({
          id: game.id,
          status: 'waiting',
          message: 'Waiting for opponent...'
        });
      } else if (mode === 'join') {
        // Try to find waiting game
        const waitingGame = await this.gameService.findWaitingGame();
        
        if (waitingGame) {
          // Join existing waiting game
          const game = await this.gameService.joinWaitingGame(waitingGame.id, user.id);
          
          res.json({
            id: game.id,
            whitePlayer: { id: game.whitePlayerId },
            blackPlayer: { id: game.blackPlayerId },
            status: game.status,
            fen: game.fen,
            moves: game.moves,
            createdAt: game.createdAt
          });
        } else {
          // Create new waiting game
          const game = await this.gameService.createWaitingGame(user.id);
          
          res.json({
            id: game.id,
            status: 'waiting',
            message: 'Waiting for opponent...'
          });
        }
      } else {
        res.status(400).json({ error: 'Invalid mode. Use "waiting" or "join"' });
      }
    } catch (error) {
      console.error('Error creating game:', error);
      res.status(500).json({ error: 'Failed to create game' });
    }
  }

  async getGame(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const game = await this.gameService.getGame(id);

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

  async getUserHistory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const games = await this.gameService.getUserHistory(id, limit);
      res.json(games);
    } catch (error) {
      console.error('Error getting user history:', error);
      res.status(500).json({ error: 'Failed to get user history' });
    }
  }

  async getWaitingGames(req: Request, res: Response): Promise<void> {
    try {
      const waitingGame = await this.gameService.findWaitingGame();
      
      if (waitingGame) {
        res.json({
          id: waitingGame.id,
          whitePlayer: { id: waitingGame.whitePlayerId },
          createdAt: waitingGame.createdAt
        });
      } else {
        res.json(null);
      }
    } catch (error) {
      console.error('Error getting waiting games:', error);
      res.status(500).json({ error: 'Failed to get waiting games' });
    }
  }
}
