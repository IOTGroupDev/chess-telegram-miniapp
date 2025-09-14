import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GameModule } from './game/game.module';
import { UserModule } from './user/user.module';
import { WebSocketModule } from './websocket/websocket.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    GameModule,
    UserModule,
    WebSocketModule,
  ],
})
export class AppModule {}
