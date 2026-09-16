"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const health_module_1 = require("./health/health.module");
const learning_module_1 = require("./learning/learning.module");
const wallet_module_1 = require("./wallet/wallet.module");
const subscriptions_module_1 = require("./subscriptions/subscriptions.module");
const eligibility_module_1 = require("./eligibility/eligibility.module");
const admin_module_1 = require("./admin/admin.module");
const payouts_module_1 = require("./payouts/payouts.module");
const pricing_module_1 = require("./pricing/pricing.module");
const mock_exams_module_1 = require("./mock-exams/mock-exams.module");
const store_module_1 = require("./store/store.module");
const notifications_module_1 = require("./notifications/notifications.module");
const schedule_1 = require("@nestjs/schedule");
const bullmq_1 = require("@nestjs/bullmq");
const cache_manager_1 = require("@nestjs/cache-manager");
const cache_manager_redis_yet_1 = require("cache-manager-redis-yet");
const support_controller_1 = require("./support/support.controller");
const public_controller_1 = require("./public/public.controller");
const prisma_service_1 = require("./prisma.service");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            ...(process.env.DISABLE_BULL === 'true' ? [] : [
                bullmq_1.BullModule.forRootAsync({
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
            cache_manager_1.CacheModule.registerAsync({
                isGlobal: true,
                useFactory: async () => {
                    const redisUrl = process.env.REDIS_PRIVATE_URL || process.env.REDIS_URL;
                    return {
                        store: await (0, cache_manager_redis_yet_1.redisStore)({
                            url: redisUrl || 'redis://localhost:6379',
                            ttl: 600000,
                            pingInterval: 30000,
                            socket: redisUrl?.startsWith('rediss://') ? {
                                tls: true,
                                rejectUnauthorized: false
                            } : undefined
                        }),
                    };
                },
            }),
            schedule_1.ScheduleModule.forRoot(),
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            health_module_1.HealthModule,
            learning_module_1.LearningModule,
            wallet_module_1.WalletModule,
            subscriptions_module_1.SubscriptionsModule,
            eligibility_module_1.EligibilityModule,
            admin_module_1.AdminModule,
            payouts_module_1.PayoutsModule,
            pricing_module_1.PricingModule,
            mock_exams_module_1.MockExamsModule,
            store_module_1.StoreModule,
            notifications_module_1.NotificationsModule,
        ],
        controllers: [app_controller_1.AppController, support_controller_1.SupportController, public_controller_1.PublicController],
        providers: [app_service_1.AppService, prisma_service_1.PrismaService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map