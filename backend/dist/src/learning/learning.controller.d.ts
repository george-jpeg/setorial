import { LearningService } from './learning.service';
import { AiContentService } from './ai-content.service';
import { CreateSubjectDto, CreateTopicDto, CreateLessonDto, SubmitLessonDto, GenerateAiLevelsDto } from './dto/learning.dto';
export declare class LearningController {
    private readonly learningService;
    private readonly aiContentService;
    constructor(learningService: LearningService, aiContentService: AiContentService);
    generateAiLevels(dto: GenerateAiLevelsDto, req: any): Promise<{
        topic: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            isApproved: boolean;
            description: string | null;
            order: number;
            subjectId: string;
        };
        levels: ({
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
        })[];
    }>;
    generateFullSubject(dto: {
        subjectId: string;
        numTopics: number;
    }, req: any): Promise<{
        message: string;
    }>;
    generateAiMock(dto: {
        subjectId: string;
        title: string;
        numQuestions?: number;
        durationMinutes?: number;
        price?: number;
    }, req: any): Promise<{
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
        createdAt: Date;
        updatedAt: Date;
        isApproved: boolean;
        description: string | null;
        isActive: boolean;
        title: string;
        durationMinutes: number;
        price: import("@prisma/client-runtime-utils").Decimal;
    }>;
    regenerateLesson(id: string, req: any): Promise<{
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
    createSubject(dto: CreateSubjectDto, req: any): Promise<{
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
    createTopic(dto: CreateTopicDto, req: any): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        isApproved: boolean;
        description: string | null;
        order: number;
        subjectId: string;
    }>;
    updateTopic(id: string, dto: any): Promise<{
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
    search(query: string): Promise<({
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
    getSubjects(req: any): Promise<({
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
    getSubject(id: string, req: any): Promise<{
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
    getLesson(id: string, req: any): Promise<any>;
    createLesson(dto: CreateLessonDto, req: any): Promise<{
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
    submitLesson(req: any, dto: SubmitLessonDto): Promise<{
        score: number;
        total: number;
        breakdown: any[];
        pointsEarned: number;
        passed: boolean;
        isFirstCompletion: boolean;
    }>;
    updateLesson(id: string, dto: any, req: any, video?: Express.Multer.File): Promise<{
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
    recordPlay(id: string, req: any): Promise<{
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
