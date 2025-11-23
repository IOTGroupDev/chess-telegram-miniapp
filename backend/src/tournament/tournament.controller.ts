import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TournamentService } from './tournament.service';
import {
  CreateTournamentDto,
  UpdateTournamentDto,
  TournamentFilterDto,
} from './dto/tournament.dto';

interface UserRequest {
  user?: { id: string };
  headers: { [key: string]: string | string[] | undefined };
}

function getUserId(req: UserRequest): string {
  const headerUserId = req.headers['x-user-id'];
  return req.user?.id || (Array.isArray(headerUserId) ? headerUserId[0] : headerUserId) || '';
}

/**
 * Tournament Controller
 * Handles all tournament-related endpoints
 */
@Controller('tournaments')
export class TournamentController {
  constructor(private readonly tournamentService: TournamentService) {}

  /**
   * Create a new tournament
   * POST /tournaments
   */
  @Post()
  async createTournament(@Request() req: UserRequest, @Body() dto: CreateTournamentDto) {
    return this.tournamentService.createTournament(getUserId(req), dto);
  }

  /**
   * List tournaments with filters
   * GET /tournaments
   */
  @Get()
  async listTournaments(@Query() filters: TournamentFilterDto) {
    return this.tournamentService.listTournaments(filters);
  }

  /**
   * Get tournament by ID
   * GET /tournaments/:id
   */
  @Get(':id')
  async getTournament(@Param('id') tournamentId: string) {
    return this.tournamentService.getTournament(tournamentId);
  }

  /**
   * Update tournament (creator only)
   * PUT /tournaments/:id
   */
  @Put(':id')
  async updateTournament(
    @Param('id') tournamentId: string,
    @Request() req: UserRequest,
    @Body() dto: UpdateTournamentDto,
  ) {
    return this.tournamentService.updateTournament(tournamentId, getUserId(req), dto);
  }

  /**
   * Delete tournament (creator only, upcoming only)
   * DELETE /tournaments/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTournament(@Param('id') tournamentId: string, @Request() req: UserRequest) {
    // Implement delete logic in service if needed
    return { message: 'Delete not implemented yet' };
  }

  /**
   * Join a tournament
   * POST /tournaments/:id/join
   */
  @Post(':id/join')
  async joinTournament(@Param('id') tournamentId: string, @Request() req: UserRequest) {
    return this.tournamentService.joinTournament(tournamentId, getUserId(req));
  }

  /**
   * Leave a tournament
   * POST /tournaments/:id/leave
   */
  @Post(':id/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  async leaveTournament(@Param('id') tournamentId: string, @Request() req: UserRequest) {
    await this.tournamentService.leaveTournament(tournamentId, getUserId(req));
  }

  /**
   * Get tournament standings
   * GET /tournaments/:id/standings
   */
  @Get(':id/standings')
  async getStandings(@Param('id') tournamentId: string) {
    return this.tournamentService.getStandings(tournamentId);
  }

  /**
   * Start tournament manually (admin only)
   * POST /tournaments/:id/start
   */
  @Post(':id/start')
  async startTournament(@Param('id') tournamentId: string) {
    await this.tournamentService.startTournament(tournamentId);
    return { message: 'Tournament started successfully' };
  }

  /**
   * Start next round (Swiss tournaments, admin only)
   * POST /tournaments/:id/next-round
   */
  @Post(':id/next-round')
  async startNextRound(@Param('id') tournamentId: string) {
    await this.tournamentService.startNextRound(tournamentId);
    return { message: 'Next round started successfully' };
  }

  /**
   * Get tournament participants
   * GET /tournaments/:id/participants
   */
  @Get(':id/participants')
  async getParticipants(@Param('id') tournamentId: string) {
    // TODO: Implement in service
    return { message: 'Not implemented yet' };
  }

  /**
   * Get tournament rounds (Swiss)
   * GET /tournaments/:id/rounds
   */
  @Get(':id/rounds')
  async getRounds(@Param('id') tournamentId: string) {
    // TODO: Implement in service
    return { message: 'Not implemented yet' };
  }

  /**
   * Get pairings for a specific round
   * GET /tournaments/:id/rounds/:roundNumber/pairings
   */
  @Get(':id/rounds/:roundNumber/pairings')
  async getRoundPairings(
    @Param('id') tournamentId: string,
    @Param('roundNumber') roundNumber: number,
  ) {
    // TODO: Implement in service
    return { message: 'Not implemented yet' };
  }
}
