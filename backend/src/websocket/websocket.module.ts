import { Module } from '@nestjs/common';
import { WebSocketGateway } from './websocket.gateway';
import { GameModule } from '../game/game.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [GameModule, UserModule],
  providers: [WebSocketGateway],
})
export class WebSocketModule {}
