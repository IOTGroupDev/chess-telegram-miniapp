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
import { EngineModule } from './engine/engine.module';
import { RatingModule } from './rating/rating.module';
import { AnalysisModule } from './analysis/analysis.module';
import { TournamentModule } from './tournament/tournament.module';
import { PuzzleModule } from './puzzle/puzzle.module';

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.production'],
    }),

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
  ],
})
export class AppModule {}
