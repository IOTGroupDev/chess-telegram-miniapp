/**
 * Rating Module
 * Glicko-2 rating system for chess players
 */

import { Module } from '@nestjs/common';
import { Glicko2Service } from './glicko2.service';
import { RatingController } from './rating.controller';

@Module({
  providers: [Glicko2Service],
  controllers: [RatingController],
  exports: [Glicko2Service],
})
export class RatingModule {}
