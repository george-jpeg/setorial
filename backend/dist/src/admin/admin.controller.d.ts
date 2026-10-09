import { PayoutsService } from '../payouts/payouts.service';
import { PrismaService } from '../prisma.service';
import { MockExamsService } from '../mock-exams/mock-exams.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
export declare class AdminController {
    private payoutsService;
    private prisma;
    private mockExamsService;
    private notificationsService;
    private usersService;
    constructor(payoutsService: PayoutsService, prisma: PrismaService, mockExamsService: MockExamsService, notificationsService: NotificationsService, usersService: UsersService);
    getDashboardStats(): Promise<{
        currentMonthRevenue: number;
        rewardPoolCap: number;
        totalLiability: number;
        liabilityRatio: number;
        projectedPayoutExposure: number;
        distributionRatio: number;
        dynamicConversionRate: number;
        riskLevel: string;
        sustainabilityTier: string;
        activeMonetizedUsers: number;
        fraudFlags: {
            suspiciousHighEarners: number;
            cheatedMockAttempts: number;
            flaggedUserIds: string[];
        };
        pendingKycCount: number;
        approvedKycCount: number;
        totalUsers: number;
        latestPayoutBatch: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            region: string | null;
            status: import("@prisma/client").$Enums.PayoutStatus;
            exchangeRate: number | null;
            month: string;
            totalLiability: import("@prisma/client-runtime-utils").Decimal;
            totalPaid: import("@prisma/client-runtime-utils").Decimal;
        } | null;
    }>;
    getPendingKyc(): Promise<{
        id: string;
        email: string;
        name: string | null;
        tier: import("@prisma/client").$Enums.Tier;
        payoutMethod: import("@prisma/client").$Enums.PayoutMethod | null;
        payoutAccount: import("@prisma/client/runtime/client").JsonValue;
        createdAt: Date;
    }[]>;
    approveKyc(userId: string): Promise<{
        id: string;
        email: string;
        name: string | null;
        isVerified: boolean;
        kycStatus: import("@prisma/client").$Enums.KycStatus;
    }>;
    rejectKyc(userId: string, reason: string): Promise<{
        success: boolean;
        userId: string;
        reason: string;
    }>;
    getAllUsers(tier?: string, kycStatus?: string, role?: string): Promise<{
        id: string;
        email: string;
        name: string | null;
        role: import("@prisma/client").$Enums.Role;
        tier: import("@prisma/client").$Enums.Tier;
        isVerified: boolean;
        kycStatus: import("@prisma/client").$Enums.KycStatus;
        createdAt: Date;
        isFrozen: boolean;
        isFlagged: boolean;
    }[]>;
    createTutor(data: any): Promise<{
        id: string;
        email: string;
        name: string | null;
        role: import("@prisma/client").$Enums.Role;
        createdAt: Date;
    }>;
    freezeUser(userId: string, isFrozen: boolean): Promise<{
        id: string;
        email: string;
        isFrozen: boolean;
    }>;
    flagUser(userId: string, isFlagged: boolean): Promise<{
        id: string;
        email: string;
        isFlagged: boolean;
    }>;
    getConfigs(): Promise<{
        id: string;
        updatedAt: Date;
        description: string | null;
        key: string;
        value: string;
    }[]>;
    getPublicConfig(key: string): Promise<{
        error: string;
        key?: undefined;
        value?: undefined;
    } | {
        key: string;
        value: null;
        error?: undefined;
    } | {
        key: string;
        value: string;
        error?: undefined;
    }>;
    updateConfig(key: string, value: string, description?: string): Promise<{
        id: string;
        updatedAt: Date;
        description: string | null;
        key: string;
        value: string;
    }>;
    getDiscounts(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        code: string;
        discountPercent: number;
        maxUses: number | null;
        usedCount: number;
        expiryDate: Date | null;
    }[]>;
    createDiscount(data: {
        code: string;
        discountPercent: number;
        maxUses?: number;
        expiryDate?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        code: string;
        discountPercent: number;
        maxUses: number | null;
        usedCount: number;
        expiryDate: Date | null;
    }>;
    toggleDiscount(id: string, isActive: boolean): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        code: string;
        discountPercent: number;
        maxUses: number | null;
        usedCount: number;
        expiryDate: Date | null;
    }>;
    getPayoutBatches(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        region: string | null;
        status: import("@prisma/client").$Enums.PayoutStatus;
        exchangeRate: number | null;
        month: string;
        totalLiability: import("@prisma/client-runtime-utils").Decimal;
        totalPaid: import("@prisma/client-runtime-utils").Decimal;
    }[]>;
    triggerPayout(month: string): Promise<{
        message: string;
        month: string;
        totalPaid: number;
        totalGlobalPaid?: undefined;
        regionsProcessed?: undefined;
        batches?: undefined;
    } | {
        month: string;
        totalGlobalPaid: number;
        regionsProcessed: number;
        batches: {
            region: any;
            batchId: any;
            rewardPool: number;
            totalEligibleBalance: any;
            distributionRatio: number;
            totalPaid: number;
            usersPaid: any;
        }[];
        message?: undefined;
        totalPaid?: undefined;
    }>;
    simulatePayout(month: string, revenue?: string): Promise<{
        month: string;
        globalEstimatedRevenue: number | undefined;
        regions: {
            region: any;
            regionalRevenue: number;
            rewardPool: number;
            totalEligibleBalance: any;
            distributionRatio: number;
            safeToExecute: boolean;
            simulatedPayoutsCount: any;
            simulatedPayouts: any;
        }[];
    }>;
    createMock(data: any, req: any): Promise<{
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
    legacyUpdateMock(id: string, data: any, req: any): Promise<{
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
    getMock(id: string): Promise<({
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
    }) | null>;
    deleteMock(id: string): Promise<{
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
    patchMock(id: string, data: any, req: any): Promise<{
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
    approveMock(id: string): Promise<{
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
    getSupportMessages(): Promise<({
        user: {
            email: string;
            name: string | null;
        };
    } & {
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
    })[]>;
    replyToSupport(id: string, data: {
        reply: string;
        adminName: string;
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
    sendNotification(data: {
        userId?: string;
        recentOnly?: boolean;
        title: string;
        body: string;
        data?: any;
    }): Promise<void>;
    sendEmailBroadcast(data: {
        subject: string;
        body: string;
        emails?: string[];
    }): Promise<void>;
    getUserStats(id: string): Promise<{
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
    getUserAnalytics(id: string): Promise<{
        lessonsCompleted: number;
        mockAttempts: number;
        mockCompleted: number;
        totalEarned: number;
        totalPayouts: number;
        totalPoints: number;
        supportTickets: number;
        tutorSessions: number;
        videoPlays: number;
        videoPlayBreakdown: {
            lessonId: string;
            lessonName: any;
            count: any;
        }[];
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
        user: {
            id: string;
            email: string;
            name: string | null;
            lastActiveAt: Date | null;
            createdAt: Date;
        };
    }>;
    getCohortOverview(): Promise<{
        totalRegisteredUsers: number;
        planTierBreakdown: Record<string, number>;
        active: {
            today: number;
            thisWeek: number;
            thisMonth: number;
        };
        dormantUsers: {
            last24Hours: number;
            last3Days: number;
            last7Days: number;
        };
        streakFreezeUsage: {
            usersWhoUsedFreeze: number;
            freezesRemaining: number;
        };
        learnAndEarn: {
            eligibleUsers: number;
            totalAmountOwed: number;
        };
        averageStreakLength: number;
        averageLessonCompletionRate: number;
        retentionRate: {
            day1: number;
            day7: number;
            day30: number;
        };
        newSignupsTrend: {
            daily: {
                date: string;
                count: number;
                tiers: Record<string, number>;
            }[];
            weekly: {
                period: string;
                count: number;
            }[];
        };
        atRiskUsers: {
            userId: string;
            lastActiveAt: Date | null;
            currentStreak: number;
        }[];
        topPerformers: {
            userId: string;
            name: string;
            avatarUrl: string | null;
            tier: import("@prisma/client").$Enums.Tier;
            points: number;
        }[];
    }>;
    exportAnalyticsCsv(): Promise<{
        csv: string;
    }>;
}
