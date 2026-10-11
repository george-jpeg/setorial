import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaService } from '../prisma.service';
import { GamificationModule } from '../gamification/gamification.module';
import { HttpModule } from '@nestjs/axios';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [GamificationModule, HttpModule, UploadModule],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule { }
