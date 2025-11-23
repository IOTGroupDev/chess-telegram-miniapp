import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PuzzleService } from './puzzle.service';
import {
  GetPuzzleDto,
  SubmitPuzzleAttemptDto,
  CreatePuzzleDto,
} from './dto/puzzle.dto';

interface UserRequest {
  user?: { id: string };
  headers: { [key: string]: string | string[] | undefined };
}

function getUserId(req: UserRequest): string {
  const headerUserId = req.headers['x-user-id'];
  return req.user?.id || (Array.isArray(headerUserId) ? headerUserId[0] : headerUserId) || '';
}

/**
 * Puzzle Controller
 * Handles tactical puzzle endpoints
 */
@Controller('puzzles')
export class PuzzleController {
  constructor(private readonly puzzleService: PuzzleService) {}

  /**
   * Get next puzzle for user (adaptive difficulty)
   * GET /puzzles/next
   */
  @Get('next')
  async getNextPuzzle(@Request() req: UserRequest, @Query() filters: GetPuzzleDto) {
    return this.puzzleService.getNextPuzzle(getUserId(req), filters);
  }

  /**
   * Get puzzle by ID
   * GET /puzzles/:id
   */
  @Get(':id')
  async getPuzzleById(@Param('id') puzzleId: string) {
    return this.puzzleService.getPuzzleById(puzzleId);
  }

  /**
   * Submit puzzle attempt
   * POST /puzzles/attempt
   */
  @Post('attempt')
  @HttpCode(HttpStatus.OK)
  async submitAttempt(@Request() req: UserRequest, @Body() dto: SubmitPuzzleAttemptDto) {
    return this.puzzleService.submitAttempt(getUserId(req), dto);
  }

  /**
   * Verify puzzle solution
   * POST /puzzles/:id/verify
   */
  @Post(':id/verify')
  async verifySolution(
    @Param('id') puzzleId: string,
    @Body() body: { moves: string[] },
  ) {
    const isCorrect = await this.puzzleService.verifySolution(
      puzzleId,
      body.moves,
    );
    return { correct: isCorrect };
  }

  /**
   * Get user puzzle statistics
   * GET /puzzles/stats/me
   */
  @Get('stats/me')
  async getMyStatistics(@Request() req: UserRequest) {
    return this.puzzleService.getUserStatistics(getUserId(req));
  }

  /**
   * Create puzzle (admin only)
   * POST /puzzles
   */
  @Post()
  async createPuzzle(@Body() dto: CreatePuzzleDto) {
    return this.puzzleService.createPuzzle(dto);
  }

  /**
   * Get daily puzzle challenge
   * GET /puzzles/daily
   */
  @Get('daily/challenge')
  async getDailyPuzzle(@Request() req: UserRequest) {
    // Get a puzzle with rating around 1800 (good for most users)
    return this.puzzleService.getNextPuzzle(getUserId(req), {
      min_rating: 1700,
      max_rating: 1900,
    });
  }
}
