import { Module } from '@nestjs/common';
import { GamificationService } from './gamification.service';
import { GamificationController } from './gamification.controller';
import { PrismaService } from '../prisma.service';

@Module({
  providers: [GamificationService],
  controllers: [GamificationController],
  exports: [GamificationService]
})
export class GamificationModule { }
