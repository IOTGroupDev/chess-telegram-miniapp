import {
  IsString,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsArray,
  Min,
  Max,
} from 'class-validator';

/**
 * DTO for getting next puzzle
 */
export class GetPuzzleDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  themes?: string[]; // Filter by themes

  @IsOptional()
  @IsNumber()
  @Min(800)
  @Max(3000)
  min_rating?: number;

  @IsOptional()
  @IsNumber()
  @Min(800)
  @Max(3000)
  max_rating?: number;
}

/**
 * DTO for submitting puzzle attempt
 */
export class SubmitPuzzleAttemptDto {
  @IsString()
  puzzle_id: string;

  @IsBoolean()
  solved: boolean;

  @IsNumber()
  @Min(0)
  time_spent: number; // milliseconds

  @IsNumber()
  @Min(1)
  attempts: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  moves_played?: string[]; // UCI moves the user made
}

/**
 * DTO for puzzle filters
 */
export class PuzzleFilterDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  themes?: string[];

  @IsOptional()
  @IsNumber()
  @Min(800)
  @Max(3000)
  rating_min?: number;

  @IsOptional()
  @IsNumber()
  @Min(800)
  @Max(3000)
  rating_max?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

/**
 * DTO for creating puzzle (admin only)
 */
export class CreatePuzzleDto {
  @IsString()
  fen: string;

  @IsString()
  moves: string; // Space-separated UCI moves

  @IsNumber()
  @Min(800)
  @Max(3000)
  rating: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  themes?: string[];

  @IsOptional()
  @IsString()
  game_url?: string;
}
