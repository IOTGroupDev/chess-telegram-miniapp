/**
 * Engine Module
 * Provides chess engine services (Stockfish, analysis, etc.)
 */

import { Module } from '@nestjs/common';
import { StockfishService } from './stockfish.service';
import { EngineManagerService } from './engine-manager.service';
import { EngineController } from './engine.controller';

@Module({
  controllers: [EngineController],
  providers: [StockfishService, EngineManagerService],
  exports: [EngineManagerService],
})
export class EngineModule {}
