import { PrismaService } from '../prisma.service';
import { Prisma, User, PayoutMethod, KycStatus } from '@prisma/client';
import { HttpService } from '@nestjs/axios';
export declare class UsersService {
    private prisma;
    private httpService;
    private readonly logger;
    private readonly paystackKey;
    constructor(prisma: PrismaService, httpService: HttpService);
    createUser(data: Prisma.UserCreateInput): Promise<User>;
    findByEmail(email: string): Promise<User | null>;
    findById(id: string): Promise<User | null>;
    getPoints(userId: string): Promise<number>;
    private getStartOfDay;
    private getStartOfWeek;
    private getStartOfMonth;
    getUserStats(userId: string): Promise<{
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
    updateProfile(userId: string, data: {
        name?: string;
        billingCountry?: string;
        expoPushToken?: string;
        avatarUrl?: string;
    }): Promise<{
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
        payoutAccount: Prisma.JsonValue | null;
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
    getLearningProgress(userId: string): Promise<{
        id: string;
        name: string;
        totalTopics: number;
        totalLessons: number;
        completedLessons: number;
        progress: number;
    }[]>;
    getBanks(country?: string): Promise<any>;
    resolveAccount(accountNumber: string, bankCode: string): Promise<any>;
    private normalizeName;
    private namesMatch;
    submitKyc(userId: string, dto: {
        payoutMethod: PayoutMethod;
        payoutAccount: Record<string, any>;
    }): Promise<any>;
    updateKycStatus(userId: string, status: KycStatus): Promise<any>;
    getActiveSubscription(userId: string): Promise<any>;
}
