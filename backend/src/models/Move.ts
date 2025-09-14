import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Game } from './Game';

@Entity('moves')
export class Move {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  gameId!: string;

  @ManyToOne(() => Game, game => game.moveHistory)
  @JoinColumn({ name: 'gameId' })
  game!: Game;

  @Column()
  moveNumber!: number;

  @Column()
  uci!: string;

  @Column()
  from!: string;

  @Column()
  to!: string;

  @Column()
  piece!: string;

  @Column({ nullable: true })
  captured?: string;

  @Column({ nullable: true })
  promotion?: string;

  @Column()
  san!: string;

  @Column()
  fen!: string;

  @CreateDateColumn()
  timestamp!: Date;
}
