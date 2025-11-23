import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TournamentController } from './tournament.controller';
import { TournamentService } from './tournament.service';

/**
 * Tournament Module
 * Handles tournament creation, management, and pairing
 */
@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(), // For cron jobs (auto-start tournaments)
  ],
  controllers: [TournamentController],
  providers: [TournamentService],
  exports: [TournamentService],
})
export class TournamentModule {}
