/**
 * Engine Module
 * Provides chess engine services (Stockfish, Leela, Komodo, etc.)
 */

import { Module } from '@nestjs/common';
import { StockfishService } from './stockfish.service';
import { LeelaService } from './leela.service';
import { KomodoService } from './komodo.service';
import { EngineManagerService } from './engine-manager.service';
import { EngineFactory } from './engine.factory';
import { EngineController } from './engine.controller';

@Module({
  controllers: [EngineController],
  providers: [
    StockfishService,
    LeelaService,
    KomodoService,
    EngineManagerService,
    EngineFactory,
  ],
  exports: [EngineManagerService, EngineFactory],
})
export class EngineModule {}
