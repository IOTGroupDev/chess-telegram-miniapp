import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsDateString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import {
  TournamentType,
  TimeControlType,
  PairingAlgorithm,
} from '../types/tournament.types';

/**
 * DTO for creating a tournament
 */
export class CreateTournamentDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsEnum(TournamentType)
  type!: TournamentType;

  @IsEnum(TimeControlType)
  time_control!: TimeControlType;

  @IsNumber()
  @Min(10)
  @Max(86400) // Max 24 hours
  time_limit!: number; // seconds

  @IsNumber()
  @Min(0)
  @Max(60)
  time_increment!: number; // seconds

  @IsDateString()
  start_time!: string;

  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(1440) // Max 24 hours
  duration?: number; // minutes (for arena)

  @IsOptional()
  @IsNumber()
  @Min(3)
  @Max(15)
  rounds?: number; // For Swiss

  @IsOptional()
  @IsEnum(PairingAlgorithm)
  pairing_method?: PairingAlgorithm;

  // Arena settings
  @IsOptional()
  @IsNumber()
  @Min(0)
  points_for_win?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  points_for_draw?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  points_for_loss?: number;

  @IsOptional()
  @IsBoolean()
  berserk_allowed?: boolean;

  // Entry requirements
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(3000)
  min_rating?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(3000)
  max_rating?: number;

  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(500)
  max_players?: number;
}

/**
 * DTO for updating a tournament
 */
export class UpdateTournamentDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsDateString()
  start_time?: string;

  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(1440)
  duration?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(3000)
  min_rating?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(3000)
  max_rating?: number;

  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(500)
  max_players?: number;
}

/**
 * DTO for joining a tournament
 */
export class JoinTournamentDto {
  @IsString()
  tournament_id!: string;
}

/**
 * DTO for starting next round (Swiss)
 */
export class StartNextRoundDto {
  @IsString()
  tournament_id!: string;
}

/**
 * DTO for tournament filters
 */
export class TournamentFilterDto {
  @IsOptional()
  @IsEnum(TournamentType)
  type?: TournamentType;

  @IsOptional()
  @IsEnum(TimeControlType)
  time_control?: TimeControlType;

  @IsOptional()
  @IsString()
  status?: string; // 'upcoming' | 'active' | 'finished'

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}
