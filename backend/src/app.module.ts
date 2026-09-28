import { Module } from '@nestjs/common';
import { join } from 'path';
// ServeStaticModule removed — static assets served by WebController
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { HealthModule } from './health/health.module';
import { LearningModule } from './learning/learning.module';
import { WalletModule } from './wallet/wallet.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { EligibilityModule } from './eligibility/eligibility.module';
import { AdminModule } from './admin/admin.module';
import { PayoutsModule } from './payouts/payouts.module';
import { PricingModule } from './pricing/pricing.module';
import { MockExamsModule } from './mock-exams/mock-exams.module';
import { StoreModule } from './store/store.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { SupportController } from './support/support.controller';
import { PublicController } from './public/public.controller';
import { PrismaService } from './prisma.service';
import { BackupModule } from './backup/backup.module';

@Module({
  imports: [
    ...(process.env.DISABLE_BULL === 'true' ? [] : [
      BullModule.forRootAsync({
        useFactory: () => {
          const redisUrl = process.env.REDIS_PRIVATE_URL || process.env.REDIS_URL;
          if (redisUrl) {
            const url = new URL(redisUrl);
            return {
              connection: {
                host: url.hostname,
                port: parseInt(url.port || '6379'),
                username: url.username || undefined,
                password: url.password || undefined,
                tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
              }
            };
          }
          return {
            connection: { host: 'localhost', port: 6379 }
          };
        }
      })
    ]),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        const redisUrl = process.env.REDIS_PRIVATE_URL || process.env.REDIS_URL;
        return {
          store: await redisStore({
            url: redisUrl || 'redis://localhost:6379',
            ttl: 600000, // 10 minutes in milliseconds
            pingInterval: 30000,
            socket: redisUrl?.startsWith('rediss://') ? {
              tls: true,
              rejectUnauthorized: false
            } : undefined
          }),
        };
      },
    }),
    ScheduleModule.forRoot(),
    // Serve the static landing site from the workspace `web/` folder
    // Static assets are served by WebController to avoid path-to-regexp issues
    AuthModule,
    UsersModule,
    HealthModule,
    LearningModule,
    WalletModule,
    SubscriptionsModule,
    EligibilityModule,
    AdminModule,
    PayoutsModule,
    PricingModule,
    MockExamsModule,
    StoreModule,
    NotificationsModule,
    BackupModule,
  ],
  controllers: [AppController, SupportController, PublicController],
  providers: [AppService, PrismaService],
})
export class AppModule { }
