import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { GameService } from './game.service';
import { CreateGameDto } from './dto/create-game.dto';
import { MakeMoveDto } from './dto/make-move.dto';

@Controller('games')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Post()
  create(@Body() createGameDto: CreateGameDto) {
    return this.gameService.create(createGameDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.gameService.findById(id);
  }

  @Get('waiting/list')
  findWaitingGames() {
    return this.gameService.findWaitingGame();
  }

  @Post(':id/join')
  joinGame(@Param('id') id: string, @Body('blackPlayerId') blackPlayerId: string) {
    return this.gameService.joinWaitingGame(id, blackPlayerId);
  }

  @Post(':id/move')
  makeMove(@Param('id') id: string, @Body() makeMoveDto: MakeMoveDto) {
    return this.gameService.makeMove(id, makeMoveDto);
  }

  @Post(':id/resign')
  resign(@Param('id') id: string, @Body('userId') userId: string) {
    return this.gameService.resign(id, userId);
  }

  @Post(':id/draw')
  draw(@Param('id') id: string) {
    return this.gameService.draw(id);
  }
}
