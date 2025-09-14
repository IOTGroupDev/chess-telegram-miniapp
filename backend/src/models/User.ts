import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Game } from './Game';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  telegramId!: number;

  @Column()
  username!: string;

  @Column()
  firstName!: string;

  @Column({ nullable: true })
  lastName?: string;

  @Column({ default: 1200 })
  rating!: number;

  @OneToMany(() => Game, game => game.whitePlayer)
  whiteGames!: Game[];

  @OneToMany(() => Game, game => game.blackPlayer)
  blackGames!: Game[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
