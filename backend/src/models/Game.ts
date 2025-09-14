import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './User';
import { Move } from './Move';

export type GameStatus = 'waiting' | 'active' | 'finished';
export type GameWinner = 'white' | 'black' | 'draw';

@Entity('games')
export class Game {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  whitePlayerId!: string;

  @ManyToOne(() => User, user => user.whiteGames)
  @JoinColumn({ name: 'whitePlayerId' })
  whitePlayer!: User;

  @Column()
  blackPlayerId!: string;

  @ManyToOne(() => User, user => user.blackGames)
  @JoinColumn({ name: 'blackPlayerId' })
  blackPlayer!: User;

  @Column({
    type: 'enum',
    enum: ['waiting', 'active', 'finished'],
    default: 'waiting'
  })
  status!: GameStatus;

  @Column({
    type: 'enum',
    enum: ['white', 'black', 'draw'],
    nullable: true
  })
  winner?: GameWinner;

  @Column({ default: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' })
  fen!: string;

  @Column({ type: 'json', default: '[]' })
  moves!: any[];

  @Column({ default: 0 })
  moveNumber!: number;

  @OneToMany(() => Move, move => move.game)
  moveHistory!: Move[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
