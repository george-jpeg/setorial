import { Module } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { PricingController } from './pricing.controller';
import { PrismaService } from '../prisma.service';

@Module({
    controllers: [PricingController],
    providers: [PricingService],
    exports: [PricingService],
})
export class PricingModule { }
