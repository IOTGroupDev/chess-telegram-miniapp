import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GameModule } from './game/game.module';
import { UserModule } from './user/user.module';
import { WebSocketModule } from './websocket/websocket.module';
import { PrismaModule } from './prisma/prisma.module';
import { EngineModule } from './engine/engine.module';
import { RatingModule } from './rating/rating.module';
import { AnalysisModule } from './analysis/analysis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    GameModule,
    UserModule,
    WebSocketModule,
    // New modules for chess engine, rating, and AI analysis
    EngineModule,
    RatingModule,
    AnalysisModule,
  ],
})
export class AppModule {}
