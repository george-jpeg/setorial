"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LearningController = void 0;
const common_1 = require("@nestjs/common");
const learning_service_1 = require("./learning.service");
const ai_content_service_1 = require("./ai-content.service");
const learning_dto_1 = require("./dto/learning.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const client_1 = require("@prisma/client");
const platform_express_1 = require("@nestjs/platform-express");
let LearningController = class LearningController {
    learningService;
    aiContentService;
    constructor(learningService, aiContentService) {
        this.learningService = learningService;
        this.aiContentService = aiContentService;
    }
    async generateAiLevels(dto, req) {
        return this.aiContentService.generateLevelsForTopic(dto.subjectId, dto.topicName, dto.numLevels, req.user.role);
    }
    async generateFullSubject(dto, req) {
        return this.aiContentService.queueFullSyllabusGeneration(dto.subjectId, dto.numTopics, req.user.role);
    }
    async generateAiMock(dto, req) {
        if (req.user.role === client_1.Role.STUDENT && req.user.tier === 'FREE') {
            throw new common_1.BadRequestException('Custom AI Mocks are only available for paying users.');
        }
        return this.aiContentService.generateMockExam(dto.subjectId, dto.title, dto.numQuestions, dto.durationMinutes, req.user.role, dto.price);
    }
    async regenerateLesson(id, req) {
        return this.aiContentService.regenerateLesson(id, req.user.role);
    }
    async createSubject(dto, req) {
        return this.learningService.createSubject(dto, req.user);
    }
    async deleteSubject(id) {
        return this.learningService.deleteSubject(id);
    }
    async createTopic(dto, req) {
        return this.learningService.createTopic(dto, req.user);
    }
    async updateTopic(id, dto) {
        return this.learningService.updateTopic(id, dto);
    }
    async deleteTopic(id) {
        return this.learningService.deleteTopic(id);
    }
    async search(query) {
        return this.learningService.searchSubjects(query);
    }
    async getSubjects(req) {
        return this.learningService.getSubjects(req.user.role);
    }
    async getSubject(id, req) {
        return this.learningService.getSubjectPathway(id, req.user.userId, req.user.role);
    }
    async getLesson(id, req) {
        return this.learningService.getLesson(id, req.user?.role, req.user?.userId);
    }
    async createLesson(dto, req) {
        return this.learningService.createLesson(dto, req.user);
    }
    async submitLesson(req, dto) {
        return this.learningService.submitLesson(req.user.userId, dto);
    }
    async updateLesson(id, dto, req, video) {
        const updateData = { ...dto };
        if (typeof updateData.questions === 'string') {
            try {
                updateData.questions = JSON.parse(updateData.questions);
            }
            catch (e) {
                throw new common_1.BadRequestException('Invalid JSON format for questions');
            }
        }
        return this.learningService.updateLessonWithVideo(id, updateData, req.user, video);
    }
    async approveSubject(id) {
        return this.learningService.approveSubject(id);
    }
    async approveTopic(id) {
        return this.learningService.approveTopic(id);
    }
    async approveLesson(id) {
        return this.learningService.approveLesson(id);
    }
    async recordPlay(id, req) {
        return this.learningService.recordVideoPlay(req.user.userId, id);
    }
};
exports.LearningController = LearningController;
__decorate([
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.TUTOR),
    (0, common_1.Post)('ai/generate-levels'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [learning_dto_1.GenerateAiLevelsDto, Object]),
    __metadata("design:returntype", Promise)
], LearningController.prototype, "generateAiLevels", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.TUTOR),
    (0, common_1.Post)('ai/generate-full-subject'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], LearningController.prototype, "generateFullSubject", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.TUTOR, client_1.Role.STUDENT),
    (0, common_1.Post)('ai/generate-mock'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], LearningController.prototype, "generateAiMock", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.TUTOR),
    (0, common_1.Post)('lessons/:id/regenerate'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], LearningController.prototype, "regenerateLesson", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.TUTOR),
    (0, common_1.Post)('subjects'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [learning_dto_1.CreateSubjectDto, Object]),
    __metadata("design:returntype", Promise)
], LearningController.prototype, "createSubject", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    (0, common_1.Delete)('subjects/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LearningController.prototype, "deleteSubject", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.TUTOR),
    (0, common_1.Post)('topics'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [learning_dto_1.CreateTopicDto, Object]),
    __metadata("design:returntype", Promise)
], LearningController.prototype, "createTopic", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    (0, common_1.Post)('topics/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], LearningController.prototype, "updateTopic", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    (0, common_1.Delete)('topics/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LearningController.prototype, "deleteTopic", null);
__decorate([
    (0, common_1.Get)('search'),
    __param(0, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LearningController.prototype, "search", null);
__decorate([
    (0, common_1.Get)('subjects'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LearningController.prototype, "getSubjects", null);
__decorate([
    (0, common_1.Get)('subjects/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], LearningController.prototype, "getSubject", null);
__decorate([
    (0, common_1.Get)('lessons/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], LearningController.prototype, "getLesson", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.TUTOR),
    (0, common_1.Post)('lessons'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [learning_dto_1.CreateLessonDto, Object]),
    __metadata("design:returntype", Promise)
], LearningController.prototype, "createLesson", null);
__decorate([
    (0, common_1.Post)('lessons/submit'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, learning_dto_1.SubmitLessonDto]),
    __metadata("design:returntype", Promise)
], LearningController.prototype, "submitLesson", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    (0, common_1.Post)('lessons/:id'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('video')),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __param(3, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], LearningController.prototype, "updateLesson", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    (0, common_1.Post)('subjects/:id/approve'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LearningController.prototype, "approveSubject", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    (0, common_1.Post)('topics/:id/approve'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LearningController.prototype, "approveTopic", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    (0, common_1.Post)('lessons/:id/approve'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LearningController.prototype, "approveLesson", null);
__decorate([
    (0, common_1.Post)('lessons/:id/play'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], LearningController.prototype, "recordPlay", null);
exports.LearningController = LearningController = __decorate([
    (0, common_1.Controller)('learning'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [learning_service_1.LearningService,
        ai_content_service_1.AiContentService])
], LearningController);
//# sourceMappingURL=learning.controller.js.map