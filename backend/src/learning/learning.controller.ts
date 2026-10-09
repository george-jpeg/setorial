import { Controller, Post, Get, Delete, Body, Param, Query, UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { LearningService } from './learning.service';
import { AiContentService } from './ai-content.service';
import { CreateSubjectDto, CreateTopicDto, CreateLessonDto, SubmitLessonDto, GenerateAiLevelsDto } from './dto/learning.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('learning')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LearningController {
    constructor(
        private readonly learningService: LearningService,
        private readonly aiContentService: AiContentService
    ) { }

    @Roles(Role.ADMIN, Role.TUTOR)
    @Post('ai/generate-levels')
    async generateAiLevels(@Body() dto: GenerateAiLevelsDto, @Request() req: any) {
        return this.aiContentService.generateLevelsForTopic(dto.subjectId, dto.topicName, dto.numLevels, req.user.role);
    }

    @Roles(Role.ADMIN, Role.TUTOR)
    @Post('ai/generate-full-subject')
    async generateFullSubject(@Body() dto: { subjectId: string, numTopics: number }, @Request() req: any) {
        return this.aiContentService.queueFullSyllabusGeneration(dto.subjectId, dto.numTopics, req.user.role);
    }

    @Roles(Role.ADMIN, Role.TUTOR, Role.STUDENT)
    @Post('ai/generate-mock')
    async generateAiMock(@Body() dto: { subjectId: string, title: string, numQuestions?: number, durationMinutes?: number, price?: number }, @Request() req: any) {
        if (req.user.role === Role.STUDENT && req.user.tier === 'FREE') {
            throw new BadRequestException('Custom AI Mocks are only available for paying users.');
        }
        return this.aiContentService.generateMockExam(dto.subjectId, dto.title, dto.numQuestions, dto.durationMinutes, req.user.role, dto.price);
    }

    @Roles(Role.ADMIN, Role.TUTOR)
    @Post('lessons/:id/regenerate')
    async regenerateLesson(@Param('id') id: string, @Request() req: any) {
        return this.aiContentService.regenerateLesson(id, req.user.role);
    }

    @Roles(Role.ADMIN, Role.TUTOR)
    @Post('subjects')
    async createSubject(@Body() dto: CreateSubjectDto, @Request() req: any) {
        return this.learningService.createSubject(dto, req.user);
    }

    @Roles(Role.ADMIN)
    @Delete('subjects/:id')
    async deleteSubject(@Param('id') id: string) {
        return this.learningService.deleteSubject(id);
    }

    @Roles(Role.ADMIN, Role.TUTOR)
    @Post('topics')
    async createTopic(@Body() dto: CreateTopicDto, @Request() req: any) {
        return this.learningService.createTopic(dto, req.user);
    }

    @Roles(Role.ADMIN)
    @Post('topics/:id')
    async updateTopic(@Param('id') id: string, @Body() dto: any) {
        return this.learningService.updateTopic(id, dto);
    }

    @Roles(Role.ADMIN)
    @Delete('topics/:id')
    async deleteTopic(@Param('id') id: string) {
        return this.learningService.deleteTopic(id);
    }

    @Get('search')
    async search(@Query('q') query: string) {
        return this.learningService.searchSubjects(query);
    }

    @Get('subjects')
    async getSubjects(@Request() req: any) {
        return this.learningService.getSubjects(req.user.role);
    }

    @Get('subjects/:id')
    async getSubject(@Param('id') id: string, @Request() req: any) {
        return this.learningService.getSubjectPathway(id, req.user.userId, req.user.role);
    }

    @Get('lessons/:id')
    async getLesson(@Param('id') id: string, @Request() req: any) {
        return this.learningService.getLesson(id, req.user?.role, req.user?.userId);
    }

    @Roles(Role.ADMIN, Role.TUTOR)
    @Post('lessons')
    async createLesson(@Body() dto: CreateLessonDto, @Request() req: any) {
        return this.learningService.createLesson(dto, req.user);
    }

    @Post('lessons/submit')
    async submitLesson(@Request() req: any, @Body() dto: SubmitLessonDto) {
        return this.learningService.submitLesson(req.user.userId, dto);
    }

    @Roles(Role.ADMIN)
    @Post('lessons/:id')
    @UseInterceptors(FileInterceptor('video'))
    async updateLesson(
        @Param('id') id: string,
        @Body() dto: any,
        @Request() req: any,
        @UploadedFile() video?: Express.Multer.File
    ) {
        const updateData = { ...dto };
        // If nested JSON strings come in from FormData, parse them
        if (typeof updateData.questions === 'string') {
            try {
                updateData.questions = JSON.parse(updateData.questions);
            } catch (e) {
                throw new BadRequestException('Invalid JSON format for questions');
            }
        }
        return this.learningService.updateLessonWithVideo(id, updateData, req.user, video);
    }

    // ─── Content Approvals (Admin Only) ──────────────────────────────────────

    @Roles(Role.ADMIN)
    @Post('subjects/:id/approve')
    async approveSubject(@Param('id') id: string) {
        return this.learningService.approveSubject(id);
    }

    @Roles(Role.ADMIN)
    @Post('topics/:id/approve')
    async approveTopic(@Param('id') id: string) {
        return this.learningService.approveTopic(id);
    }

    @Roles(Role.ADMIN)
    @Post('lessons/:id/approve')
    async approveLesson(@Param('id') id: string) {
        return this.learningService.approveLesson(id);
    }

    @Post('lessons/:id/play')
    async recordPlay(@Param('id') id: string, @Request() req: any) {
        return this.learningService.recordVideoPlay(req.user.userId, id);
    }
}
