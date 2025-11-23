/**
 * Analysis Module
 * AI-powered game analysis
 */

import { Module } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { AnalysisController } from './analysis.controller';
import { EngineModule } from '../engine/engine.module';

@Module({
  imports: [EngineModule],
  providers: [AnalysisService],
  controllers: [AnalysisController],
  exports: [AnalysisService],
})
export class AnalysisModule {}
