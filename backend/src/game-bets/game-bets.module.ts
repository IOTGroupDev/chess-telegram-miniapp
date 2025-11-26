/**
 * Game Bets Module
 * Manages betting on PvP games
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GameBetsService } from './game-bets.service';
import { GameBetsController } from './game-bets.controller';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [ConfigModule, WalletModule],
  controllers: [GameBetsController],
  providers: [GameBetsService],
  exports: [GameBetsService],
})
export class GameBetsModule {}
