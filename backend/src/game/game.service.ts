import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGameDto } from './dto/create-game.dto';
import { MakeMoveDto } from './dto/make-move.dto';
import { Chess } from 'chess.js';

@Injectable()
export class GameService {
  constructor(private prisma: PrismaService) {}

  async create(createGameDto: CreateGameDto) {
    return this.prisma.game.create({
      data: createGameDto,
      include: {
        whitePlayer: true,
        blackPlayer: true,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.game.findUnique({
      where: { id },
      include: {
        whitePlayer: true,
        blackPlayer: true,
        moves: {
          orderBy: { moveNumber: 'asc' },
        },
      },
    });
  }

  async findWaitingGame() {
    return this.prisma.game.findFirst({
      where: { status: 'WAITING' },
      include: {
        whitePlayer: true,
        blackPlayer: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async joinWaitingGame(gameId: string, blackPlayerId: string) {
    return this.prisma.game.update({
      where: { id: gameId },
      data: {
        blackPlayerId,
        status: 'ACTIVE',
      },
      include: {
        whitePlayer: true,
        blackPlayer: true,
      },
    });
  }

  async makeMove(gameId: string, makeMoveDto: MakeMoveDto) {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: { moves: true },
    });

    if (!game) {
      throw new Error('Game not found');
    }

    const chess = new Chess(game.fen);
    
    try {
      const move = chess.move({
        from: makeMoveDto.from,
        to: makeMoveDto.to,
        promotion: makeMoveDto.promotion as any,
      });

      if (!move) {
        throw new Error('Invalid move');
      }

      // Create move record
      const moveRecord = await this.prisma.move.create({
        data: {
          gameId,
          userId: makeMoveDto.userId,
          moveNumber: game.moveNumber + 1,
          uci: makeMoveDto.from + makeMoveDto.to + (makeMoveDto.promotion || ''),
          from: makeMoveDto.from,
          to: makeMoveDto.to,
          piece: move.piece,
          captured: move.captured,
          promotion: move.promotion,
          san: move.san,
          fen: chess.fen(),
        },
      });

      // Update game
      const isGameOver = chess.isGameOver();
      let winner = null;
      if (isGameOver) {
        if (chess.isCheckmate()) {
          winner = chess.turn() === 'w' ? 'BLACK' : 'WHITE';
        } else if (chess.isDraw()) {
          winner = 'DRAW';
        }
      }

      const updatedGame = await this.prisma.game.update({
        where: { id: gameId },
        data: {
          fen: chess.fen(),
          moveNumber: game.moveNumber + 1,
          status: isGameOver ? 'FINISHED' : 'ACTIVE',
          winner: winner as any,
        },
        include: {
          whitePlayer: true,
          blackPlayer: true,
          moves: {
            orderBy: { moveNumber: 'asc' },
          },
        },
      });

      return { game: updatedGame, move: moveRecord };
    } catch (error) {
      throw new Error(`Invalid move: ${(error as Error).message}`);
    }
  }

  async resign(gameId: string, userId: string) {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      throw new Error('Game not found');
    }

    const winner = game.whitePlayerId === userId ? 'BLACK' : 'WHITE';

    return this.prisma.game.update({
      where: { id: gameId },
      data: {
        status: 'FINISHED',
        winner: winner as any,
      },
      include: {
        whitePlayer: true,
        blackPlayer: true,
      },
    });
  }

  async draw(gameId: string) {
    return this.prisma.game.update({
      where: { id: gameId },
      data: {
        status: 'FINISHED',
        winner: 'DRAW',
      },
      include: {
        whitePlayer: true,
        blackPlayer: true,
      },
    });
  }
}
