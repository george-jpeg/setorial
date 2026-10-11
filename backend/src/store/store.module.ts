import { Module } from '@nestjs/common';
import { StoreService } from './store.service';
import { StoreController } from './store.controller';
import { PrismaService } from '../prisma.service';
import { GamificationModule } from '../gamification/gamification.module';

@Module({
    imports: [GamificationModule],
    providers: [StoreService],
    controllers: [StoreController],
    exports: [StoreService],
})
export class StoreModule { }
