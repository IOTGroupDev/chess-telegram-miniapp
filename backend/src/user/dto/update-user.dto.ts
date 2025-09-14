import { IsString, IsNumber, IsOptional } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsNumber()
  telegramId?: number;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsNumber()
  rating?: number;
}
