import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsNumber()
  telegramId!: number;

  @IsOptional()
  @IsString()
  username?: string;

  @IsString()
  firstName!: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsNumber()
  rating?: number;
}
