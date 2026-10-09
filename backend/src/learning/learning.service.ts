import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateSubjectDto, CreateTopicDto, CreateLessonDto, SubmitLessonDto } from './dto/learning.dto';
import { GamificationService } from '../gamification/gamification.service';
import { StoreService } from '../store/store.service';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class LearningService {
    constructor(
        private prisma: PrismaService,
        private gamificationService: GamificationService,
        private storeService: StoreService,
        private uploadService: UploadService,
    ) { }

    async createSubject(dto: CreateSubjectDto, user?: any) {
        try {
            const isApproved = user?.role === 'TUTOR' ? false : true;
            return await this.prisma.subject.create({
                data: {
                    ...dto,
                    isApproved,
                }
            });
        } catch (error) {
            if (error.code === 'P2002') {
                throw new ConflictException(`A subject with the name "${dto.name}" already exists.`);
            }
            throw error;
        }
    }

    async deleteSubject(id: string) {
        const subject = await this.prisma.subject.findUnique({ where: { id } });
        if (!subject) throw new NotFoundException('Subject not found');

        return this.prisma.$transaction(async (tx) => {
            await tx.topic.deleteMany({ where: { subjectId: id } });
            return tx.subject.delete({ where: { id } });
        });
    }

    async createTopic(dto: CreateTopicDto, user?: any) {
        try {
            const isApproved = user?.role === 'TUTOR' ? false : true;
            return await this.prisma.topic.create({
                data: {
                    ...dto,
                    isApproved,
                }
            });
        } catch (error) {
            if (error.code === 'P2002') {
                throw new ConflictException(`A topic with the name "${dto.name}" already exists in this subject.`);
            }
            throw error;
        }
    }

    async updateTopic(id: string, data: any, user?: any) {
        try {
            const isApproved = user?.role === 'TUTOR' ? false : true;
            return await this.prisma.topic.update({
                where: { id },
                data: {
                    ...data,
                    isApproved,
                }
            });
        } catch (error) {
            if (error.code === 'P2002') {
                throw new ConflictException(`A topic with the name "${data.name}" already exists in this subject.`);
            }
            throw error;
        }
    }

    async deleteTopic(id: string) {
        const topic = await this.prisma.topic.findUnique({ where: { id } });
        if (!topic) throw new NotFoundException('Topic not found');
        return this.prisma.topic.delete({ where: { id } });
    }

    async createLesson(dto: CreateLessonDto, user?: any) {
        try {
            const isApproved = user?.role === 'TUTOR' ? false : true;
            // If order not provided, set to next available order within the topic
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
        } catch (error) {
            if (error.code === 'P2002') {
                throw new ConflictException(`A lesson with the name "${dto.name}" already exists in this topic.`);
            }
            throw error;
        }
    }

    async updateLesson(id: string, dto: Partial<CreateLessonDto>, user?: any) {
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

    async getSubjects(role?: string) {
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

    async getSubjectPathway(id: string, userId: string, role?: string) {
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

        if (!subject) throw new NotFoundException('Subject not found');
        if (!isStaff && !subject.isApproved) throw new NotFoundException('Subject not found');

        let globalFoundCurrent = false;
        
        const annotatedTopics = subject.topics.map((topic) => {
            const annotatedLessons = topic.lessons.map((lesson) => {
                const isCompleted = lesson.userProgress && lesson.userProgress.length > 0;
                
                let status = 'LOCKED';
                if (isCompleted) {
                    status = 'COMPLETED';
                } else if (!globalFoundCurrent) {
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

    async getLesson(id: string, role?: string, userId?: string) {
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
                    throw new BadRequestException('Free tier is limited to 5 lessons per day. Upgrade to continue learning!');
                }
            }
        }

        const lesson = await this.prisma.lesson.findUnique({
            where: { id },
            include: { 
                questions: { select: { id: true, text: true, options: true, correctOption: true } },
                topic: { include: { subject: true } }
            },
        }) as any;
        if (!lesson) throw new NotFoundException('Lesson not found');

        const isStaff = role === 'ADMIN' || role === 'TUTOR';
        if (!isStaff && (!lesson.isApproved || !lesson.topic.isApproved || !lesson.topic.subject.isApproved)) {
            throw new NotFoundException('Lesson not found');
        }

        if (lesson.videoUrl) {
            // If the stored videoUrl is an external link (e.g., YouTube), leave it as-is.
            if (typeof lesson.videoUrl === 'string' && lesson.videoUrl.startsWith('http')) {
                // external URL - no presigned URL needed
            } else {
                lesson.videoUrl = await this.uploadService.getPresignedUrl(lesson.videoUrl, 3600);
            }
        }

        const { topic, ...lessonData } = lesson;
        return lessonData;
    }

    async updateLessonWithVideo(id: string, dto: any, user?: any, video?: Express.Multer.File) {
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
                            create: dto.questions.map((q: any) => ({
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

    async submitLesson(userId: string, dto: SubmitLessonDto) {
        const lesson = await this.prisma.lesson.findUnique({
            where: { id: dto.lessonId },
            include: {
                questions: true,
                topic: { include: { subject: true } }
            },
        });

        if (!lesson) throw new NotFoundException('Lesson not found');

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
                throw new BadRequestException('Free tier is limited to 5 completed lessons per day. Upgrade to continue learning!');
            }
        }

        let score = 0;
        const breakdown: any[] = [];

        lesson.questions.forEach((q, index) => {
            const isCorrect = q.correctOption === dto.answers[index];
            if (isCorrect) score += 1;
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
                if (hasBoost) pointsEarned *= 2;

                await this.gamificationService.awardPoints(
                    userId,
                    pointsEarned,
                    hasBoost ? 'Lesson Completion (2x Boost)' : 'Lesson Completion',
                    lesson.topic.subjectId
                );
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

    async searchSubjects(query: string) {
        // Deep search across Subject, Topic, and Lesson names
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

    // ─── Approval Operations (Admin Only) ───────────────────────────────────

    async approveSubject(id: string) {
        return this.prisma.subject.update({
            where: { id },
            data: { isApproved: true }
        });
    }

    async approveTopic(id: string) {
        return this.prisma.topic.update({
            where: { id },
            data: { isApproved: true }
        });
    }

    async approveLesson(id: string) {
        return this.prisma.lesson.update({
            where: { id },
            data: { isApproved: true }
        });
    }

    async recordVideoPlay(userId: string, lessonId: string) {
        // Ensure lesson exists
        const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
        if (!lesson) throw new NotFoundException('Lesson not found');

        // Dedupe: avoid recording multiple plays in quick succession
        const thresholdSeconds = 30; // ignore plays within 30s
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

        // update lastActiveAt on user
        await this.prisma.user.update({ where: { id: userId }, data: { lastActiveAt: new Date() } });

        return { success: true, deduped: false, playId: created.id };
    }
}
