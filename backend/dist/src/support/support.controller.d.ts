import { PrismaService } from '../prisma.service';
export declare class SupportController {
    private prisma;
    constructor(prisma: PrismaService);
    sendMessage(req: any, data: {
        subject: string;
        message: string;
    }): Promise<{
        subject: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        status: import("@prisma/client").$Enums.SupportStatus;
        message: string;
        adminReply: string | null;
        repliedAt: Date | null;
        repliedBy: string | null;
    }>;
    getMyMessages(req: any): Promise<{
        subject: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        status: import("@prisma/client").$Enums.SupportStatus;
        message: string;
        adminReply: string | null;
        repliedAt: Date | null;
        repliedBy: string | null;
    }[]>;
}
