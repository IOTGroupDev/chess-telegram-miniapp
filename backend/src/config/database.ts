import { DataSource } from 'typeorm';
import { User } from '../models/User';
import { Game } from '../models/Game';
import { Move } from '../models/Move';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'chess_db',
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development',
  entities: [User, Game, Move],
  migrations: ['src/migrations/*.ts'],
  subscribers: ['src/subscriber/*.ts'],
});

export const initializeDatabase = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();
    console.log('Database connection established successfully');
  } catch (error) {
    console.error('Error during Data Source initialization:', error);
    throw error;
  }
};
