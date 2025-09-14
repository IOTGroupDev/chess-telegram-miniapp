import { IsString, IsOptional } from 'class-validator';

export class MakeMoveDto {
  @IsString()
  userId!: string;

  @IsString()
  from!: string;

  @IsString()
  to!: string;

  @IsOptional()
  @IsString()
  promotion?: string;
}
