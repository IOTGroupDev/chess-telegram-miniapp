import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PuzzleController } from './puzzle.controller';
import { PuzzleService } from './puzzle.service';

/**
 * Puzzle Module
 * Handles tactical puzzles with adaptive difficulty
 */
@Module({
  imports: [ConfigModule],
  controllers: [PuzzleController],
  providers: [PuzzleService],
  exports: [PuzzleService],
})
export class PuzzleModule {}
