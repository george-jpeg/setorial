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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LearningService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const gamification_service_1 = require("../gamification/gamification.service");
const store_service_1 = require("../store/store.service");
const upload_service_1 = require("../upload/upload.service");
let LearningService = class LearningService {
    prisma;
    gamificationService;
    storeService;
    uploadService;
    constructor(prisma, gamificationService, storeService, uploadService) {
        this.prisma = prisma;
        this.gamificationService = gamificationService;
        this.storeService = storeService;
        this.uploadService = uploadService;
    }
    async createSubject(dto, user) {
        try {
            const isApproved = user?.role === 'TUTOR' ? false : true;
            return await this.prisma.subject.create({
                data: {
                    ...dto,
                    isApproved,
                }
            });
        }
        catch (error) {
            if (error.code === 'P2002') {
                throw new common_1.ConflictException(`A subject with the name "${dto.name}" already exists.`);
            }
            throw error;
        }
    }
    async deleteSubject(id) {
        const subject = await this.prisma.subject.findUnique({ where: { id } });
        if (!subject)
            throw new common_1.NotFoundException('Subject not found');
        return this.prisma.$transaction(async (tx) => {
            await tx.topic.deleteMany({ where: { subjectId: id } });
            return tx.subject.delete({ where: { id } });
        });
    }
    async createTopic(dto, user) {
        try {
            const isApproved = user?.role === 'TUTOR' ? false : true;
            return await this.prisma.topic.create({
                data: {
                    ...dto,
                    isApproved,
                }
            });
        }
        catch (error) {
            if (error.code === 'P2002') {
                throw new common_1.ConflictException(`A topic with the name "${dto.name}" already exists in this subject.`);
            }
            throw error;
        }
    }
    async updateTopic(id, data, user) {
        try {
            const isApproved = user?.role === 'TUTOR' ? false : true;
            return await this.prisma.topic.update({
                where: { id },
                data: {
                    ...data,
                    isApproved,
                }
            });
        }
        catch (error) {
            if (error.code === 'P2002') {
                throw new common_1.ConflictException(`A topic with the name "${data.name}" already exists in this subject.`);
            }
            throw error;
        }
    }
    async deleteTopic(id) {
        const topic = await this.prisma.topic.findUnique({ where: { id } });
        if (!topic)
            throw new common_1.NotFoundException('Topic not found');
        return this.prisma.topic.delete({ where: { id } });
    }
    async createLesson(dto, user) {
        try {
            const isApproved = user?.role === 'TUTOR' ? false : true;
            let order = dto.order;
            if (order === undefined || order === null) {
                const agg = await this.prisma.lesson.aggregate({ where: { topicId: dto.topicId }, _max: { order: true } });
                const maxOrder = agg._max.order ?? 0;
                order = maxOrder + 1;
            }
            return await this.prisma.lesson.create({
                data: {
                    name: dto.name,
                    topicId: dto.topicId,
                    content: dto.content,
                    videoUrl: dto.videoUrl,
                    order,
                    rewardPoints: dto.rewardPoints ?? 10,
                    isApproved,
                    questions: {
                        create: dto.questions.map(q => ({
                            text: q.text,
                            options: q.options,
                            correctOption: q.correctOption,
                        })),
                    }
                },
                include: { questions: true }
            });
        }
        catch (error) {
            if (error.code === 'P2002') {
                throw new common_1.ConflictException(`A lesson with the name "${dto.name}" already exists in this topic.`);
            }
            throw error;
        }
    }
    async updateLesson(id, dto, user) {
        return this.prisma.$transaction(async (tx) => {
            if (dto.questions) {
                await tx.question.deleteMany({ where: { lessonId: id } });
            }
            const isApproved = user?.role === 'TUTOR' ? false : true;
            return tx.lesson.update({
                where: { id },
                data: {
                    ...(dto.name && { name: dto.name }),
                    ...(dto.content && { content: dto.content }),
                    ...(dto.rewardPoints && { rewardPoints: dto.rewardPoints }),
                    isApproved,
                    ...(dto.questions && {
                        questions: {
                            create: dto.questions.map(q => ({
                                text: q.text,
                                options: q.options,
                                correctOption: q.correctOption,
                            }))
                        }
                    })
                },
                include: { questions: true }
            });
        });
    }
    async getSubjects(role) {
        const isStaff = role === 'ADMIN' || role === 'TUTOR';
        const filter = isStaff ? {} : { isApproved: true };
        return this.prisma.subject.findMany({
            where: filter,
            include: {
                topics: {
                    where: filter,
                    include: {
                        lessons: {
                            where: filter,
                            orderBy: { order: 'asc' }
                        }
                    }
                }
            }
        });
    }
    async getSubjectPathway(id, userId, role) {
        const isStaff = role === 'ADMIN' || role === 'TUTOR';
        const filter = isStaff ? {} : { isApproved: true };
        const subject = await this.prisma.subject.findUnique({
            where: { id },
            include: {
                topics: {
                    where: filter,
                    include: {
                        lessons: {
                            where: filter,
                            orderBy: { order: 'asc' },
                            include: {
                                _count: { select: { questions: true } },
                                userProgress: {
                                    where: { userId }
                                }
                            }
                        }
                    }
                }
            }
        });
        if (!subject)
            throw new common_1.NotFoundException('Subject not found');
        if (!isStaff && !subject.isApproved)
            throw new common_1.NotFoundException('Subject not found');
        let globalFoundCurrent = false;
        const annotatedTopics = subject.topics.map((topic) => {
            const annotatedLessons = topic.lessons.map((lesson) => {
                const isCompleted = lesson.userProgress && lesson.userProgress.length > 0;
                let status = 'LOCKED';
                if (isCompleted) {
                    status = 'COMPLETED';
                }
                else if (!globalFoundCurrent) {
                    status = 'CURRENT';
                    globalFoundCurrent = true;
                }
                const { userProgress, ...rest } = lesson;
                return { ...rest, status, score: isCompleted ? userProgress[0].score : null };
            });
            return { ...topic, lessons: annotatedLessons };
        });
        return { ...subject, topics: annotatedTopics };
    }
    async getLesson(id, role, userId) {
        if (userId && (!role || role === 'STUDENT')) {
            const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { tier: true, role: true } });
            if (user && user.role === 'STUDENT' && (!user.tier || user.tier === 'FREE')) {
                const startOfToday = new Date();
                startOfToday.setHours(0, 0, 0, 0);
                const completedToday = await this.prisma.userProgress.count({
                    where: {
                        userId,
                        completedAt: { gte: startOfToday }
                    }
                });
                if (completedToday >= 5) {
                    throw new common_1.BadRequestException('Free tier is limited to 5 lessons per day. Upgrade to continue learning!');
                }
            }
        }
        const lesson = await this.prisma.lesson.findUnique({
            where: { id },
            include: {
                questions: { select: { id: true, text: true, options: true, correctOption: true } },
                topic: { include: { subject: true } }
            },
        });
        if (!lesson)
            throw new common_1.NotFoundException('Lesson not found');
        const isStaff = role === 'ADMIN' || role === 'TUTOR';
        if (!isStaff && (!lesson.isApproved || !lesson.topic.isApproved || !lesson.topic.subject.isApproved)) {
            throw new common_1.NotFoundException('Lesson not found');
        }
        if (lesson.videoUrl) {
            if (typeof lesson.videoUrl === 'string' && lesson.videoUrl.startsWith('http')) {
            }
            else {
                lesson.videoUrl = await this.uploadService.getPresignedUrl(lesson.videoUrl, 3600);
            }
        }
        const { topic, ...lessonData } = lesson;
        return lessonData;
    }
    async updateLessonWithVideo(id, dto, user, video) {
        return this.prisma.$transaction(async (tx) => {
            let videoUrl = dto.videoUrl;
            if (video) {
                videoUrl = await this.uploadService.uploadFile(video, 'videos');
            }
            if (dto.questions) {
                await tx.question.deleteMany({ where: { lessonId: id } });
            }
            const isApproved = user?.role === 'TUTOR' ? false : true;
            return tx.lesson.update({
                where: { id },
                data: {
                    ...(dto.name && { name: dto.name }),
                    ...(dto.content && { content: dto.content }),
                    ...(dto.rewardPoints && { rewardPoints: Number(dto.rewardPoints) }),
                    videoUrl,
                    isApproved,
                    ...(dto.questions && {
                        questions: {
                            create: dto.questions.map((q) => ({
                                text: q.text,
                                options: q.options,
                                correctOption: Number(q.correctOption),
                            }))
                        }
                    })
                },
                include: { questions: true }
            });
        });
    }
    async submitLesson(userId, dto) {
        const lesson = await this.prisma.lesson.findUnique({
            where: { id: dto.lessonId },
            include: {
                questions: true,
                topic: { include: { subject: true } }
            },
        });
        if (!lesson)
            throw new common_1.NotFoundException('Lesson not found');
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { tier: true, role: true }
        });
        if (user && user.role === 'STUDENT' && (!user.tier || user.tier === 'FREE')) {
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);
            const completedToday = await this.prisma.userProgress.count({
                where: {
                    userId,
                    completedAt: { gte: startOfToday }
                }
            });
            if (completedToday >= 5) {
                throw new common_1.BadRequestException('Free tier is limited to 5 completed lessons per day. Upgrade to continue learning!');
            }
        }
        let score = 0;
        const breakdown = [];
        lesson.questions.forEach((q, index) => {
            const isCorrect = q.correctOption === dto.answers[index];
            if (isCorrect)
                score += 1;
            breakdown.push({ questionId: q.id, isCorrect, correctOption: q.correctOption });
        });
        const passThreshold = Math.ceil(lesson.questions.length * 0.6);
        const passed = score >= passThreshold || lesson.questions.length === 0;
        let pointsEarned = 0;
        let isFirstCompletion = false;
        if (passed) {
            const existingProgress = await this.prisma.userProgress.findUnique({
                where: { userId_lessonId: { userId, lessonId: lesson.id } }
            });
            if (!existingProgress) {
                isFirstCompletion = true;
                await this.prisma.userProgress.create({
                    data: {
                        userId,
                        lessonId: lesson.id,
                        score: score
                    }
                });
                pointsEarned = lesson.rewardPoints;
                const hasBoost = await this.storeService.hasActiveBoost(userId);
                if (hasBoost)
                    pointsEarned *= 2;
                await this.gamificationService.awardPoints(userId, pointsEarned, hasBoost ? 'Lesson Completion (2x Boost)' : 'Lesson Completion', lesson.topic.subjectId);
            }
        }
        const currentStreak = await this.gamificationService.incrementStreak(userId);
        await this.gamificationService.checkAndAwardBadges(userId, {
            streak: currentStreak,
            score: score,
            total: lesson.questions.length
        });
        await this.prisma.user.update({
            where: { id: userId },
            data: { lastActiveAt: new Date() }
        });
        return { score, total: lesson.questions.length, breakdown, pointsEarned, passed, isFirstCompletion };
    }
    async searchSubjects(query) {
        return this.prisma.subject.findMany({
            where: {
                isApproved: true,
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { topics: { some: { isApproved: true, name: { contains: query, mode: 'insensitive' } } } },
                    { topics: { some: { isApproved: true, lessons: { some: { isApproved: true, name: { contains: query, mode: 'insensitive' } } } } } }
                ]
            },
            include: {
                topics: {
                    select: {
                        name: true,
                        lessons: {
                            where: { isApproved: true, name: { contains: query, mode: 'insensitive' } },
                            select: { name: true }
                        }
                    },
                    where: {
                        isApproved: true,
                        OR: [
                            { name: { contains: query, mode: 'insensitive' } },
                            { lessons: { some: { isApproved: true, name: { contains: query, mode: 'insensitive' } } } }
                        ]
                    }
                }
            }
        });
    }
    async approveSubject(id) {
        return this.prisma.subject.update({
            where: { id },
            data: { isApproved: true }
        });
    }
    async approveTopic(id) {
        return this.prisma.topic.update({
            where: { id },
            data: { isApproved: true }
        });
    }
    async approveLesson(id) {
        return this.prisma.lesson.update({
            where: { id },
            data: { isApproved: true }
        });
    }
    async recordVideoPlay(userId, lessonId) {
        const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
        if (!lesson)
            throw new common_1.NotFoundException('Lesson not found');
        const thresholdSeconds = 30;
        const recent = await this.prisma.videoPlay.findFirst({
            where: { userId, lessonId },
            orderBy: { createdAt: 'desc' },
        });
        if (recent) {
            const ageMs = Date.now() - recent.createdAt.getTime();
            if (ageMs < thresholdSeconds * 1000) {
                return { success: true, deduped: true, lastPlayAt: recent.createdAt };
            }
        }
        const created = await this.prisma.videoPlay.create({
            data: {
                userId,
                lessonId,
            }
        });
        await this.prisma.user.update({ where: { id: userId }, data: { lastActiveAt: new Date() } });
        return { success: true, deduped: false, playId: created.id };
    }
};
exports.LearningService = LearningService;
exports.LearningService = LearningService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        gamification_service_1.GamificationService,
        store_service_1.StoreService,
        upload_service_1.UploadService])
], LearningService);
//# sourceMappingURL=learning.service.js.map