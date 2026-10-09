import { PrismaService } from '../prisma.service';
import { CreateSubjectDto, CreateTopicDto, CreateLessonDto, SubmitLessonDto } from './dto/learning.dto';
import { GamificationService } from '../gamification/gamification.service';
import { StoreService } from '../store/store.service';
import { UploadService } from '../upload/upload.service';
export declare class LearningService {
    private prisma;
    private gamificationService;
    private storeService;
    private uploadService;
    constructor(prisma: PrismaService, gamificationService: GamificationService, storeService: StoreService, uploadService: UploadService);
    createSubject(dto: CreateSubjectDto, user?: any): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        isApproved: boolean;
    }>;
    deleteSubject(id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        isApproved: boolean;
    }>;
    createTopic(dto: CreateTopicDto, user?: any): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        isApproved: boolean;
        description: string | null;
        order: number;
        subjectId: string;
    }>;
    updateTopic(id: string, data: any, user?: any): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        isApproved: boolean;
        description: string | null;
        order: number;
        subjectId: string;
    }>;
    deleteTopic(id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        isApproved: boolean;
        description: string | null;
        order: number;
        subjectId: string;
    }>;
    createLesson(dto: CreateLessonDto, user?: any): Promise<{
        questions: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            mockExamId: string | null;
            lessonId: string | null;
            options: import("@prisma/client/runtime/client").JsonValue;
            text: string;
            correctOption: number;
            explanation: string | null;
        }[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        isApproved: boolean;
        order: number;
        content: string | null;
        videoUrl: string | null;
        rewardPoints: number;
        topicId: string;
    }>;
    updateLesson(id: string, dto: Partial<CreateLessonDto>, user?: any): Promise<{
        questions: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            mockExamId: string | null;
            lessonId: string | null;
            options: import("@prisma/client/runtime/client").JsonValue;
            text: string;
            correctOption: number;
            explanation: string | null;
        }[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        isApproved: boolean;
        order: number;
        content: string | null;
        videoUrl: string | null;
        rewardPoints: number;
        topicId: string;
    }>;
    getSubjects(role?: string): Promise<({
        topics: ({
            lessons: {
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                isApproved: boolean;
                order: number;
                content: string | null;
                videoUrl: string | null;
                rewardPoints: number;
                topicId: string;
            }[];
        } & {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            isApproved: boolean;
            description: string | null;
            order: number;
            subjectId: string;
        })[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        isApproved: boolean;
    })[]>;
    getSubjectPathway(id: string, userId: string, role?: string): Promise<{
        topics: {
            lessons: {
                status: string;
                score: number | null;
                _count: {
                    questions: number;
                };
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                isApproved: boolean;
                order: number;
                content: string | null;
                videoUrl: string | null;
                rewardPoints: number;
                topicId: string;
            }[];
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            isApproved: boolean;
            description: string | null;
            order: number;
            subjectId: string;
        }[];
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        isApproved: boolean;
    }>;
    getLesson(id: string, role?: string, userId?: string): Promise<any>;
    updateLessonWithVideo(id: string, dto: any, user?: any, video?: Express.Multer.File): Promise<{
        questions: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            mockExamId: string | null;
            lessonId: string | null;
            options: import("@prisma/client/runtime/client").JsonValue;
            text: string;
            correctOption: number;
            explanation: string | null;
        }[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        isApproved: boolean;
        order: number;
        content: string | null;
        videoUrl: string | null;
        rewardPoints: number;
        topicId: string;
    }>;
    submitLesson(userId: string, dto: SubmitLessonDto): Promise<{
        score: number;
        total: number;
        breakdown: any[];
        pointsEarned: number;
        passed: boolean;
        isFirstCompletion: boolean;
    }>;
    searchSubjects(query: string): Promise<({
        topics: {
            name: string;
            lessons: {
                name: string;
            }[];
        }[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        isApproved: boolean;
    })[]>;
    approveSubject(id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        isApproved: boolean;
    }>;
    approveTopic(id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        isApproved: boolean;
        description: string | null;
        order: number;
        subjectId: string;
    }>;
    approveLesson(id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        isApproved: boolean;
        order: number;
        content: string | null;
        videoUrl: string | null;
        rewardPoints: number;
        topicId: string;
    }>;
    recordVideoPlay(userId: string, lessonId: string): Promise<{
        success: boolean;
        deduped: boolean;
        lastPlayAt: Date;
        playId?: undefined;
    } | {
        success: boolean;
        deduped: boolean;
        playId: string;
        lastPlayAt?: undefined;
    }>;
}
