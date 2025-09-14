import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../models/User';
import { Game } from '../models/Game';

export class UserController {
  private userRepository = AppDataSource.getRepository(User);
  private gameRepository = AppDataSource.getRepository(Game);

  async getUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = await this.userRepository.findOne({
        where: { id }
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json(user);
    } catch (error) {
      console.error('Error getting user:', error);
      res.status(500).json({ error: 'Failed to get user' });
    }
  }

  async getUserHistory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const games = await this.gameRepository.find({
        where: [
          { whitePlayerId: id },
          { blackPlayerId: id }
        ],
        relations: ['whitePlayer', 'blackPlayer'],
        order: { createdAt: 'DESC' },
        take: 50
      });

      res.json(games);
    } catch (error) {
      console.error('Error getting user history:', error);
      res.status(500).json({ error: 'Failed to get user history' });
    }
  }

  async createOrUpdateUser(req: Request, res: Response): Promise<void> {
    try {
      const { telegramId, username, firstName, lastName } = req.body;

      if (!telegramId) {
        res.status(400).json({ error: 'Telegram ID is required' });
        return;
      }

      let user = await this.userRepository.findOne({
        where: { telegramId }
      });

      if (user) {
        // Update existing user
        user.username = username || user.username;
        user.firstName = firstName || user.firstName;
        user.lastName = lastName || user.lastName;
        await this.userRepository.save(user);
      } else {
        // Create new user
        user = new User();
        user.telegramId = telegramId;
        user.username = username || `user_${telegramId}`;
        user.firstName = firstName || 'Player';
        user.lastName = lastName;
        user.rating = 1200;
        await this.userRepository.save(user);
      }

      res.json(user);
    } catch (error) {
      console.error('Error creating/updating user:', error);
      res.status(500).json({ error: 'Failed to create/update user' });
    }
  }
}
