import { Module } from '@nestjs/common';
import { MockExamsService } from './mock-exams.service';
import { MockExamsController } from './mock-exams.controller';
import { PrismaService } from '../prisma.service';
import { WalletModule } from '../wallet/wallet.module';
import { GamificationModule } from '../gamification/gamification.module';
import { LearningModule } from '../learning/learning.module';

@Module({
    imports: [WalletModule, GamificationModule, LearningModule],
    providers: [MockExamsService],
    controllers: [MockExamsController],
    exports: [MockExamsService],
})
export class MockExamsModule { }
