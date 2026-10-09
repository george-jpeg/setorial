import type { Response } from 'express';
import { PrismaService } from '../prisma.service';
export declare class TutorController {
    private prisma;
    private readonly deepseekKey;
    constructor(prisma: PrismaService);
    getSessions(req: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string | null;
    }[]>;
    getMessages(sessionId: string, req: any): Promise<{
        id: string;
        role: string;
        createdAt: Date;
        content: string;
        sessionId: string;
    }[]>;
    chat(dto: {
        sessionId?: string;
        message: string;
        systemPrompt?: string;
    }, req: any, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
