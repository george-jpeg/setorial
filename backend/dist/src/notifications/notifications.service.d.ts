import { PrismaService } from '../prisma.service';
export declare class NotificationsService {
    private prisma;
    private readonly logger;
    private readonly resend;
    private readonly globalFrom;
    private readonly supportRedirect;
    constructor(prisma: PrismaService);
    private renderTemplate;
    private executeEmailAsync;
    sendPush(userId: string, title: string, body: string, data?: Record<string, any>): Promise<void>;
    sendPushToMany(userIds: string[], title: string, body: string, data?: Record<string, any>): Promise<void>;
    private sendToTokens;
    private generateSetorialHtml;
    sendOtpEmail(email: string, otpCode: string, name?: string): Promise<void>;
    sendPasswordResetEmail(email: string, otpCode: string, name?: string): Promise<void>;
    sendWelcomeEmail(email: string, name: string): Promise<void>;
    sendPayoutConfirmation(email: string, amount: number, month: string): Promise<void>;
    sendBroadcastEmail(emails: string[], subject: string, htmlMessage: string): Promise<void>;
    sendSupportEmail(userEmail: string, message: string): Promise<void>;
}
