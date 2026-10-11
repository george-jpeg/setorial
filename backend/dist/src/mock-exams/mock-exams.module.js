"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockExamsModule = void 0;
const common_1 = require("@nestjs/common");
const mock_exams_service_1 = require("./mock-exams.service");
const mock_exams_controller_1 = require("./mock-exams.controller");
const wallet_module_1 = require("../wallet/wallet.module");
const gamification_module_1 = require("../gamification/gamification.module");
const learning_module_1 = require("../learning/learning.module");
let MockExamsModule = class MockExamsModule {
};
exports.MockExamsModule = MockExamsModule;
exports.MockExamsModule = MockExamsModule = __decorate([
    (0, common_1.Module)({
        imports: [wallet_module_1.WalletModule, gamification_module_1.GamificationModule, learning_module_1.LearningModule],
        providers: [mock_exams_service_1.MockExamsService],
        controllers: [mock_exams_controller_1.MockExamsController],
        exports: [mock_exams_service_1.MockExamsService],
    })
], MockExamsModule);
//# sourceMappingURL=mock-exams.module.js.map