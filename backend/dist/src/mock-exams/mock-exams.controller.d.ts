import { MockExamsService } from './mock-exams.service';
export declare class MockExamsController {
    private readonly mockService;
    constructor(mockService: MockExamsService);
    getAvailableMocks(req: any): Promise<{
        id: string;
        isApproved: boolean;
        description: string | null;
        _count: {
            questions: number;
        };
        isActive: boolean;
        title: string;
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
        durationMinutes: number;
        price: import("@prisma/client-runtime-utils").Decimal;
    }[] | {
        price: number;
        id: string;
        isApproved: boolean;
        description: string | null;
        _count: {
            questions: number;
        };
        isActive: boolean;
        title: string;
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
        durationMinutes: number;
    }[]>;
    createCustomMock(req: any, body: {
        subjectIds: string[];
        numQuestions: number;
        durationMinutes: number;
    }): Promise<{
        mockId: string;
        message: string;
        totalQuestions: number;
    }>;
    getMockDetails(id: string): Promise<({
        questions: {
            id: string;
            options: import("@prisma/client/runtime/client").JsonValue;
            text: string;
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
    }) | null>;
    startMock(req: any, id: string): Promise<{
        attemptId: string;
        resumed: boolean;
    }>;
    submitMock(req: any, id: string, body: {
        answers: number[];
        tabSwitches: number;
    }): Promise<{
        score: number;
        maxScore: number;
        pointsEarned: number;
        status: import("@prisma/client").$Enums.MockStatus;
        corrections: {
            text: string;
            options: import("@prisma/client/runtime/client").JsonValue;
            userOption: number;
            correctOption: number;
            explanation: string | null;
        }[];
    }>;
    initializePayment(req: any, id: string): Promise<{
        authorization_url: any;
        access_code: any;
        reference: any;
    }>;
    verifyPayment(req: any, body: {
        reference: string;
    }): Promise<{
        status: string;
        attemptId: string;
        mockId: any;
    }>;
}
