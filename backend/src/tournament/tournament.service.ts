import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  CreateTournamentDto,
  UpdateTournamentDto,
  TournamentFilterDto,
} from './dto/tournament.dto';
import {
  Tournament,
  TournamentType,
  TournamentStatus,
  TournamentStanding,
  TournamentParticipant,
  TournamentRound,
  TournamentPairing,
  SwissPairingResult,
  RoundStatus,
} from './types/tournament.types';

@Injectable()
export class TournamentService {
  private readonly logger = new Logger(TournamentService.name);
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be configured');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Create a new tournament
   */
  async createTournament(
    userId: string,
    dto: CreateTournamentDto,
  ): Promise<Tournament> {
    this.logger.log(`Creating tournament: ${dto.name} by user ${userId}`);

    // Validate tournament type specific fields
    if (dto.type === TournamentType.ARENA && !dto.duration) {
      throw new BadRequestException('Arena tournaments must have a duration');
    }

    if (dto.type === TournamentType.SWISS && !dto.rounds) {
      throw new BadRequestException('Swiss tournaments must specify number of rounds');
    }

    const { data, error } = await this.supabase
      .from('tournaments')
      .insert({
        name: dto.name,
        description: dto.description,
        type: dto.type,
        time_control: dto.time_control,
        time_limit: dto.time_limit,
        time_increment: dto.time_increment,
        start_time: dto.start_time,
        duration: dto.duration,
        rounds: dto.rounds,
        pairing_method: dto.pairing_method || 'dutch',
        points_for_win: dto.points_for_win || 2,
        points_for_draw: dto.points_for_draw || 1,
        points_for_loss: dto.points_for_loss || 0,
        berserk_allowed: dto.berserk_allowed || false,
        min_rating: dto.min_rating,
        max_rating: dto.max_rating,
        max_players: dto.max_players,
        created_by: userId,
        status: TournamentStatus.UPCOMING,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create tournament: ${error.message}`);
      throw new BadRequestException('Failed to create tournament');
    }

    return data;
  }

  /**
   * Update tournament (only creator can update)
   */
  async updateTournament(
    tournamentId: string,
    userId: string,
    dto: UpdateTournamentDto,
  ): Promise<Tournament> {
    // Check ownership
    const { data: tournament } = await this.supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .eq('created_by', userId)
      .single();

    if (!tournament) {
      throw new NotFoundException('Tournament not found or access denied');
    }

    if (tournament.status !== TournamentStatus.UPCOMING) {
      throw new BadRequestException('Can only update upcoming tournaments');
    }

    const { data, error } = await this.supabase
      .from('tournaments')
      .update(dto)
      .eq('id', tournamentId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Failed to update tournament');
    }

    return data;
  }

  /**
   * Join tournament
   */
  async joinTournament(
    tournamentId: string,
    userId: string,
  ): Promise<TournamentParticipant> {
    this.logger.log(`User ${userId} joining tournament ${tournamentId}`);

    const { data, error } = await this.supabase
      .from('tournament_participants')
      .insert({
        tournament_id: tournamentId,
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        // Unique violation
        throw new BadRequestException('Already joined this tournament');
      }
      this.logger.error(`Failed to join tournament: ${error.message}`);
      throw new BadRequestException('Failed to join tournament');
    }

    return data;
  }

  /**
   * Leave tournament (only before it starts)
   */
  async leaveTournament(tournamentId: string, userId: string): Promise<void> {
    const { data: tournament } = await this.supabase
      .from('tournaments')
      .select('status')
      .eq('id', tournamentId)
      .single();

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    if (tournament.status !== TournamentStatus.UPCOMING) {
      throw new BadRequestException('Cannot leave tournament that has started');
    }

    const { error } = await this.supabase
      .from('tournament_participants')
      .delete()
      .eq('tournament_id', tournamentId)
      .eq('user_id', userId);

    if (error) {
      throw new BadRequestException('Failed to leave tournament');
    }
  }

  /**
   * Get tournament by ID
   */
  async getTournament(tournamentId: string): Promise<Tournament> {
    const { data, error } = await this.supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Tournament not found');
    }

    return data;
  }

  /**
   * List tournaments with filters
   */
  async listTournaments(filters: TournamentFilterDto): Promise<Tournament[]> {
    let query = this.supabase.from('tournaments').select('*');

    if (filters.type) {
      query = query.eq('type', filters.type);
    }

    if (filters.time_control) {
      query = query.eq('time_control', filters.time_control);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    query = query.order('start_time', { ascending: true });

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error(`Failed to list tournaments: ${error.message}`);
      throw new BadRequestException('Failed to list tournaments');
    }

    return data || [];
  }

  /**
   * Get tournament standings
   */
  async getStandings(tournamentId: string): Promise<TournamentStanding[]> {
    const { data, error } = await this.supabase
      .from('tournament_participants')
      .select(`
        user_id,
        score,
        games_played,
        wins,
        draws,
        losses,
        buchholz,
        performance_rating,
        users:user_id (
          username,
          blitz_rating
        )
      `)
      .eq('tournament_id', tournamentId)
      .order('score', { ascending: false })
      .order('buchholz', { ascending: false });

    if (error) {
      this.logger.error(`Failed to get standings: ${error.message}`);
      throw new BadRequestException('Failed to get standings');
    }

    // Format standings with rank
    const standings: TournamentStanding[] = (data || []).map((participant, index) => ({
      user_id: participant.user_id,
      username: participant.users?.username || 'Unknown',
      rating: participant.users?.blitz_rating || 1500,
      score: participant.score,
      games_played: participant.games_played,
      wins: participant.wins,
      draws: participant.draws,
      losses: participant.losses,
      buchholz: participant.buchholz,
      performance_rating: participant.performance_rating,
      rank: index + 1,
    }));

    return standings;
  }

  /**
   * Start tournament (automated via cron or manual)
   */
  async startTournament(tournamentId: string): Promise<void> {
    this.logger.log(`Starting tournament ${tournamentId}`);

    const tournament = await this.getTournament(tournamentId);

    if (tournament.status !== TournamentStatus.UPCOMING) {
      throw new BadRequestException('Tournament already started or finished');
    }

    // Update status to active
    await this.supabase
      .from('tournaments')
      .update({ status: TournamentStatus.ACTIVE })
      .eq('id', tournamentId);

    // For Swiss tournaments, create first round
    if (tournament.type === TournamentType.SWISS) {
      await this.startNextRound(tournamentId);
    }

    this.logger.log(`Tournament ${tournamentId} started successfully`);
  }

  /**
   * Start next round for Swiss tournament
   */
  async startNextRound(tournamentId: string): Promise<void> {
    const tournament = await this.getTournament(tournamentId);

    if (tournament.type !== TournamentType.SWISS) {
      throw new BadRequestException('Only Swiss tournaments have rounds');
    }

    const nextRoundNumber = (tournament.current_round || 0) + 1;

    if (nextRoundNumber > (tournament.rounds || 5)) {
      // Tournament finished
      await this.finishTournament(tournamentId);
      return;
    }

    this.logger.log(`Starting round ${nextRoundNumber} for tournament ${tournamentId}`);

    // Create round
    const { data: round, error: roundError } = await this.supabase
      .from('tournament_rounds')
      .insert({
        tournament_id: tournamentId,
        round_number: nextRoundNumber,
        status: RoundStatus.ACTIVE,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (roundError) {
      this.logger.error(`Failed to create round: ${roundError.message}`);
      throw new BadRequestException('Failed to create round');
    }

    // Generate pairings
    const pairings = await this.generateSwissPairings(tournamentId, nextRoundNumber);

    // Create pairing records and games
    for (const pairing of pairings) {
      // Create game
      const { data: game } = await this.supabase
        .from('games')
        .insert({
          white_player_id: pairing.white_id,
          black_player_id: pairing.black_id,
          time_control: tournament.time_control,
          time_limit: tournament.time_limit,
          time_increment: tournament.time_increment,
          status: 'waiting',
        })
        .select()
        .single();

      if (game) {
        // Link game to tournament
        await this.supabase.from('tournament_games').insert({
          tournament_id: tournamentId,
          game_id: game.id,
          round_number: nextRoundNumber,
          board_number: pairing.board_num,
        });

        // Create pairing record
        await this.supabase.from('tournament_pairings').insert({
          tournament_id: tournamentId,
          round_id: round.id,
          white_player_id: pairing.white_id,
          black_player_id: pairing.black_id,
          game_id: game.id,
          board_number: pairing.board_num,
        });
      }
    }

    // Update tournament current round
    await this.supabase
      .from('tournaments')
      .update({ current_round: nextRoundNumber })
      .eq('id', tournamentId);

    this.logger.log(`Round ${nextRoundNumber} started with ${pairings.length} pairings`);
  }

  /**
   * Generate Swiss pairings using database function
   */
  private async generateSwissPairings(
    tournamentId: string,
    roundNumber: number,
  ): Promise<SwissPairingResult[]> {
    const { data, error } = await this.supabase.rpc('generate_swiss_pairings', {
      p_tournament_id: tournamentId,
      p_round_number: roundNumber,
    });

    if (error) {
      this.logger.error(`Failed to generate pairings: ${error.message}`);
      throw new BadRequestException('Failed to generate pairings');
    }

    return data || [];
  }

  /**
   * Finish tournament
   */
  private async finishTournament(tournamentId: string): Promise<void> {
    this.logger.log(`Finishing tournament ${tournamentId}`);

    await this.supabase
      .from('tournaments')
      .update({ status: TournamentStatus.FINISHED })
      .eq('id', tournamentId);
  }

  /**
   * Cron job: Start tournaments that should be active
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkTournamentStarts(): Promise<void> {
    const now = new Date().toISOString();

    const { data: tournaments } = await this.supabase
      .from('tournaments')
      .select('id')
      .eq('status', TournamentStatus.UPCOMING)
      .lte('start_time', now);

    if (tournaments && tournaments.length > 0) {
      this.logger.log(`Starting ${tournaments.length} tournaments`);

      for (const tournament of tournaments) {
        try {
          await this.startTournament(tournament.id);
        } catch (error) {
          this.logger.error(`Failed to start tournament ${tournament.id}: ${error.message}`);
        }
      }
    }
  }
}
