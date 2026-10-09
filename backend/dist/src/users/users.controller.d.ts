import { UsersService } from './users.service';
import { GamificationService } from '../gamification/gamification.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PayoutMethod } from '@prisma/client';
import { UploadService } from '../upload/upload.service';
export declare class UsersController {
    private usersService;
    private gamificationService;
    private notificationsService;
    private uploadService;
    constructor(usersService: UsersService, gamificationService: GamificationService, notificationsService: NotificationsService, uploadService: UploadService);
    getMe(req: any): Promise<{
        points: number;
        streak: number;
        badges: {
            awardedAt: Date;
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            description: string;
            icon: string;
            color: string;
        }[];
        activeSub: any;
        detectedCountry: any;
        id?: string | undefined;
        email?: string | undefined;
        password?: string | undefined;
        name?: string | null | undefined;
        isEmailVerified?: boolean | undefined;
        emailOtp?: string | null | undefined;
        emailOtpExpiresAt?: Date | null | undefined;
        avatarUrl?: string | null | undefined;
        role?: import("@prisma/client").$Enums.Role | undefined;
        tier?: import("@prisma/client").$Enums.Tier | undefined;
        isVerified?: boolean | undefined;
        kycStatus?: import("@prisma/client").$Enums.KycStatus | undefined;
        payoutMethod?: import("@prisma/client").$Enums.PayoutMethod | null | undefined;
        payoutAccount?: import("@prisma/client/runtime/client").JsonValue | undefined;
        billingCountry?: string | null | undefined;
        countryLocked?: boolean | undefined;
        lastActiveAt?: Date | null | undefined;
        currentStreak?: number | undefined;
        longestStreak?: number | undefined;
        totalActiveDays?: number | undefined;
        assessmentPassed?: boolean | undefined;
        monetizationEligibleAt?: Date | null | undefined;
        createdAt?: Date | undefined;
        updatedAt?: Date | undefined;
        isFrozen?: boolean | undefined;
        isFlagged?: boolean | undefined;
        expoPushToken?: string | null | undefined;
    }>;
    updateMe(req: any, body: {
        name?: string;
        billingCountry?: string;
        expoPushToken?: string;
    }, file?: Express.Multer.File): Promise<{
        id: string;
        email: string;
        password: string;
        name: string | null;
        isEmailVerified: boolean;
        emailOtp: string | null;
        emailOtpExpiresAt: Date | null;
        avatarUrl: string | null;
        role: import("@prisma/client").$Enums.Role;
        tier: import("@prisma/client").$Enums.Tier;
        isVerified: boolean;
        kycStatus: import("@prisma/client").$Enums.KycStatus;
        payoutMethod: import("@prisma/client").$Enums.PayoutMethod | null;
        payoutAccount: import("@prisma/client/runtime/client").JsonValue | null;
        billingCountry: string | null;
        countryLocked: boolean;
        lastActiveAt: Date | null;
        currentStreak: number;
        longestStreak: number;
        totalActiveDays: number;
        assessmentPassed: boolean;
        monetizationEligibleAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        isFrozen: boolean;
        isFlagged: boolean;
        expoPushToken: string | null;
    }>;
    getMyStats(req: any): Promise<{
        userId: string;
        email: string;
        name: string | null;
        planTier: import("@prisma/client").$Enums.Tier;
        tier: import("@prisma/client").$Enums.Tier;
        dateJoined: Date;
        currentStreak: number;
        longestStreak: number;
        lastActiveDate: Date | null;
        lastLessonCompleted: {
            lessonName: string;
            completedAt: Date;
        } | null;
        lessonsCompleted: {
            allTime: number;
            thisWeek: number;
            today: number;
        };
        lessonCompletionRate: number;
        missedDays: {
            total: number;
            thisWeek: number;
            thisMonth: number;
        };
        streakFreezes: {
            used: number;
            remaining: number;
            total: number;
        };
        totalPoints: number;
        currentLevel: number;
        rank: number;
        learnAndEarn: {
            pointsEarned: number;
            amountPayable: number;
            totalEverPaidOut: number;
            totalEarned: number;
        };
        monetization: {
            eligible: boolean;
            reason: string;
        };
        mockExamHistory: {
            examTitle: any;
            score: any;
            completedAt: any;
        }[];
        averageDailyTimeSpent: {
            seconds: number;
            minutes: number;
            hours: number;
        };
        badges: {
            id: any;
            name: any;
            icon: any;
            description: any;
            color: any;
            awardedAt: any;
        }[];
    }>;
    getProgress(req: any): Promise<{
        id: string;
        name: string;
        totalTopics: number;
        totalLessons: number;
        completedLessons: number;
        progress: number;
    }[]>;
    sendSupport(req: any, message: string): Promise<{
        message: string;
    }>;
    submitKyc(req: any, body: {
        payoutMethod: PayoutMethod;
        payoutAccount: Record<string, any>;
    }): Promise<any>;
    getBanks(country?: string): Promise<any>;
    resolveAccount(accountNumber: string, bankCode: string): Promise<any>;
    getUser(id: string): Promise<{
        id: string;
        email: string;
        password: string;
        name: string | null;
        isEmailVerified: boolean;
        emailOtp: string | null;
        emailOtpExpiresAt: Date | null;
        avatarUrl: string | null;
        role: import("@prisma/client").$Enums.Role;
        tier: import("@prisma/client").$Enums.Tier;
        isVerified: boolean;
        kycStatus: import("@prisma/client").$Enums.KycStatus;
        payoutMethod: import("@prisma/client").$Enums.PayoutMethod | null;
        payoutAccount: import("@prisma/client/runtime/client").JsonValue | null;
        billingCountry: string | null;
        countryLocked: boolean;
        lastActiveAt: Date | null;
        currentStreak: number;
        longestStreak: number;
        totalActiveDays: number;
        assessmentPassed: boolean;
        monetizationEligibleAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        isFrozen: boolean;
        isFlagged: boolean;
        expoPushToken: string | null;
    } | null>;
}
