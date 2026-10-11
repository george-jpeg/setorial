"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsModule = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const notifications_service_1 = require("./notifications.service");
const bullmq_1 = require("@nestjs/bullmq");
const engagement_cron_1 = require("./engagement.cron");
const engagement_processor_1 = require("./engagement.processor");
let NotificationsModule = class NotificationsModule {
};
exports.NotificationsModule = NotificationsModule;
exports.NotificationsModule = NotificationsModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [
            axios_1.HttpModule,
            ...(process.env.DISABLE_BULL === 'true' ? [] : [
                bullmq_1.BullModule.registerQueue({
                    name: 'engagement-push',
                }),
            ]),
        ],
        providers: [
            notifications_service_1.NotificationsService,
            engagement_cron_1.EngagementCronService,
            engagement_processor_1.EngagementProcessor
        ],
        exports: [notifications_service_1.NotificationsService],
    })
], NotificationsModule);
//# sourceMappingURL=notifications.module.js.map