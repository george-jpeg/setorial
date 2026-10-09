import { PrismaService } from '../prisma.service';
import { Queue } from 'bullmq';
export declare class AiContentService {
    private prisma;
    private aiQueue?;
    private readonly logger;
    private readonly deepseekKey;
    constructor(prisma: PrismaService, aiQueue?: Queue | undefined);
    queueFullSyllabusGeneration(subjectId: string, numTopics: number, userRole?: string): Promise<{
        message: string;
    }>;
    generateLevelsForTopic(subjectId: string, topicName: string, numLevels?: number, userRole?: string): Promise<{
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
    private generateLessonContent;
    regenerateLesson(lessonId: string, userRole?: string): Promise<{
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
    generateMockExam(subjectId: string, title: string, numQuestions?: number, durationMinutes?: number, userRole?: string, price?: number): Promise<{
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
    generateFullSyllabus(subjectId: string, numTopics?: number, userRole?: string): Promise<{
        subject: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            isApproved: boolean;
        };
        topics: {
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
        }[];
    }>;
    private executeGeneration;
    generateQuestionsForSubject(subjectName: string, numQuestions: number): Promise<any[]>;
}
