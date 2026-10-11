"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LearningModule = void 0;
const common_1 = require("@nestjs/common");
const learning_service_1 = require("./learning.service");
const learning_controller_1 = require("./learning.controller");
const tutor_controller_1 = require("./tutor.controller");
const gamification_module_1 = require("../gamification/gamification.module");
const store_module_1 = require("../store/store.module");
const ai_content_service_1 = require("./ai-content.service");
const upload_module_1 = require("../upload/upload.module");
const bullmq_1 = require("@nestjs/bullmq");
const ai_content_processor_1 = require("./ai-content.processor");
let LearningModule = class LearningModule {
};
exports.LearningModule = LearningModule;
exports.LearningModule = LearningModule = __decorate([
    (0, common_1.Module)({
        imports: [
            gamification_module_1.GamificationModule,
            store_module_1.StoreModule,
            upload_module_1.UploadModule,
            ...(process.env.DISABLE_BULL === 'true' ? [] : [
                bullmq_1.BullModule.registerQueue({ name: 'ai-content' })
            ])
        ],
        providers: [learning_service_1.LearningService, ai_content_service_1.AiContentService, ai_content_processor_1.AiContentProcessor],
        controllers: [learning_controller_1.LearningController, tutor_controller_1.TutorController],
        exports: [learning_service_1.LearningService, ai_content_service_1.AiContentService],
    })
], LearningModule);
//# sourceMappingURL=learning.module.js.map