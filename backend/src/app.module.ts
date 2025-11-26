/**
 * Main Application Module
 *
 * Architecture: Hybrid (Supabase + NestJS)
 * - Frontend uses Supabase directly for database/realtime/auth
 * - Backend provides chess engine services, rating calculations, and AI analysis
 *
 * Database: Supabase PostgreSQL (frontend access via Supabase client)
 * Realtime: Supabase Realtime (replaces Socket.io)
 * Backend: NestJS for CPU-intensive operations only
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { EngineModule } from './engine/engine.module';
import { RatingModule } from './rating/rating.module';
import { AnalysisModule } from './analysis/analysis.module';
import { TournamentModule } from './tournament/tournament.module';
import { PuzzleModule } from './puzzle/puzzle.module';
import { WalletModule } from './wallet/wallet.module';
import { GameBetsModule } from './game-bets/game-bets.module';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.production'],
    }),

    // Telegram authentication with Supabase JWT
    AuthModule,

    // Chess engine services (Stockfish via UCI)
    EngineModule,

    // Glicko-2 rating calculations
    RatingModule,

    // AI-powered game analysis
    AnalysisModule,

    // Tournament management system
    TournamentModule,

    // Tactical puzzle system
    PuzzleModule,

    // User wallet management (coins, stars)
    WalletModule,

    // Game betting system
    GameBetsModule,

    // Telegram Stars payment integration
    PaymentModule,
  ],
})
export class AppModule {}
