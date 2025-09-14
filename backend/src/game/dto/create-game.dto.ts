import { IsString, IsOptional } from 'class-validator';

export class CreateGameDto {
  @IsString()
  whitePlayerId!: string;

  @IsOptional()
  @IsString()
  blackPlayerId?: string;
}
