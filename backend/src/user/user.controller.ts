import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findById(id);
  }

  @Get('telegram/:telegramId')
  findByTelegramId(@Param('telegramId') telegramId: string) {
    return this.userService.findByTelegramId(parseInt(telegramId));
  }

  @Get(':id/history')
  getUserHistory(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    return this.userService.getUserHistory(id, limit ? parseInt(limit) : 20);
  }
}
