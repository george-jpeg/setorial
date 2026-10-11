import { Module } from '@nestjs/common';
import { LearningService } from './learning.service';
import { LearningController } from './learning.controller';
import { TutorController } from './tutor.controller';
import { PrismaService } from '../prisma.service';
import { GamificationModule } from '../gamification/gamification.module';
import { StoreModule } from '../store/store.module';
import { AiContentService } from './ai-content.service';
import { UploadModule } from '../upload/upload.module';
import { BullModule } from '@nestjs/bullmq';
import { AiContentProcessor } from './ai-content.processor';

@Module({
  imports: [
    GamificationModule,
    StoreModule,
    UploadModule,
    ...(process.env.DISABLE_BULL === 'true' ? [] : [
      BullModule.registerQueue({ name: 'ai-content' })
    ])
  ],
  providers: [LearningService, AiContentService, AiContentProcessor],
  controllers: [LearningController, TutorController],
  exports: [LearningService, AiContentService],
})
export class LearningModule { }
