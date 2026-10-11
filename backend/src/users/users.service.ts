import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma, User, PayoutMethod, KycStatus } from '@prisma/client';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);
    private readonly paystackKey = process.env.PAYSTACK_SECRET_KEY;

    constructor(
        private prisma: PrismaService,
        private httpService: HttpService,
    ) { }

    async createUser(data: Prisma.UserCreateInput): Promise<User> {
        return this.prisma.user.create({ data });
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.prisma.user.findUnique({ where: { email } });
    }

    async findById(id: string): Promise<User | null> {
        return this.prisma.user.findUnique({ where: { id } });
    }

    async getPoints(userId: string): Promise<number> {
        const result = await this.prisma.pointsLedger.aggregate({
            where: { userId },
            _sum: { points: true },
        });
        return result._sum.points || 0;
    }

    private getStartOfDay(date: Date) {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        return start;
    }

    private getStartOfWeek(date: Date) {
        const start = this.getStartOfDay(date);
        const day = start.getDay();
        const diff = (day === 0 ? -6 : 1 - day);
        start.setDate(start.getDate() + diff);
        return start;
    }

    private getStartOfMonth(date: Date) {
        return new Date(date.getFullYear(), date.getMonth(), 1);
    }

    async getUserStats(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                tier: true,
                createdAt: true,
                lastActiveAt: true,
                currentStreak: true,
                longestStreak: true,
                totalActiveDays: true,
                isVerified: true,
                assessmentPassed: true,
                kycStatus: true,
                monetizationEligibleAt: true,
            },
        });

        if (!user) throw new BadRequestException('User not found');

        const now = new Date();
        const startOfToday = this.getStartOfDay(now);
        const startOfWeek = this.getStartOfWeek(now);
        const startOfMonth = this.getStartOfMonth(now);
        const daysSinceJoin = Math.max(0, Math.ceil((now.getTime() - new Date(user.createdAt).getTime()) / 86400000));

        // 1. Points & Wallet (batch 1 - aggregated totals)
        const [pointsAgg, walletGroups] = await Promise.all([
            this.prisma.pointsLedger.aggregate({ where: { userId }, _sum: { points: true } }),
            this.prisma.walletLedger.groupBy({
                by: ['type'],
                where: { userId },
                _sum: { amount: true },
            }),
        ]);

        const totalPoints = Number(pointsAgg._sum.points ?? 0);
        const totalEarned = Number(walletGroups.find((g: any) => g.type === 'EARN')?._sum.amount ?? 0);
        const amountPayable = Number(walletGroups.find((g: any) => g.type === 'ELIGIBLE_MOVE')?._sum.amount ?? 0);
        const totalPaidOut = Number(walletGroups.find((g: any) => g.type === 'PAYOUT')?._sum.amount ?? 0);

        // 2. Lessons & Progress (batch 2)
        const [
            lessonsCompletedAll,
            lessonsCompletedThisWeek,
            lessonsCompletedToday,
            totalLessonsAvailable,
            lastLessonProgress,
        ] = await Promise.all([
            this.prisma.userProgress.count({ where: { userId } }),
            this.prisma.userProgress.count({ where: { userId, completedAt: { gte: startOfWeek } } }),
            this.prisma.userProgress.count({ where: { userId, completedAt: { gte: startOfToday } } }),
            this.prisma.lesson.count({ where: { isApproved: true } }),
            this.prisma.userProgress.findFirst({
                where: { userId },
                orderBy: { completedAt: 'desc' },
                select: { completedAt: true, lesson: { select: { name: true } } },
            }),
        ]);

        // 3. User PowerUps, Attempts, Badges & Activity (batch 3)
        const [
            freezePowerUps,
            mockAttempts,
            userBadges,
            timeSpentAgg,
            activeThisWeek,
            activeThisMonth,
        ] = await Promise.all([
            this.prisma.userPowerUp.findMany({
                where: { userId },
                include: { powerUp: true },
            }),
            this.prisma.mockAttempt.findMany({
                where: { userId, status: 'COMPLETED' },
                orderBy: { completedAt: 'desc' },
                include: { mockExam: { select: { title: true } } },
            }),
            this.prisma.userBadge.findMany({
                where: { userId },
                include: { badge: true },
                orderBy: { awardedAt: 'desc' },
            }),
            this.prisma.userActivityLog.aggregate({ where: { userId }, _sum: { timeSpent: true } }),
            this.prisma.userActivityLog.count({ where: { userId, date: { gte: startOfWeek } } }),
            this.prisma.userActivityLog.count({ where: { userId, date: { gte: startOfMonth } } }),
        ]);

        // 4. Rank calculation (count users with higher points)
        let rank = 1;
        try {
            const higherRankUsers = await this.prisma.pointsLedger.groupBy({
                by: ['userId'],
                _sum: { points: true },
                having: {
                    points: {
                        _sum: {
                            gt: totalPoints,
                        },
                    },
                },
            });
            rank = higherRankUsers.length + 1;
        } catch {
            rank = 1;
        }

        const completionRate = totalLessonsAvailable > 0 ? Number(((lessonsCompletedAll / totalLessonsAvailable) * 100).toFixed(2)) : 0;
        const freezeCount = freezePowerUps.length;
        const usedFreezeCount = freezePowerUps.filter((item: any) => !item.isActive).length;
        const remainingFreezeCount = freezePowerUps.filter((item: any) => item.isActive).length;

        const monetizationEligible = ['SILVER', 'GOLD'].includes(user.tier)
            && user.isVerified
            && user.assessmentPassed
            && (user.kycStatus === 'APPROVED' || user.isVerified);

        const consistencyGap = Math.max(0, 90 - (user.totalActiveDays || 0));
        const monetizationReason = monetizationEligible
            ? 'eligible'
            : [
                !['SILVER', 'GOLD'].includes(user.tier) ? 'upgrade to Silver or Gold' : null,
                !user.isVerified ? 'complete KYC verification' : null,
                !user.assessmentPassed ? 'pass the assessment' : null,
                consistencyGap > 0 ? `needs ${consistencyGap} more consistent days` : null,
            ].filter(Boolean).join('; ') || 'not yet eligible';

        const missedTotal = Math.max(0, daysSinceJoin - (user.totalActiveDays || 0));
        const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const missedThisWeek = Math.max(0, 7 - activeThisWeek);
        const missedThisMonth = Math.max(0, daysInCurrentMonth - activeThisMonth);

        const mockExamHistory = mockAttempts.map((attempt: any) => ({
            examTitle: attempt.mockExam?.title || 'Unknown mock exam',
            score: attempt.score ?? 0,
            completedAt: attempt.completedAt,
        }));

        const averageDailyTimeSpentSeconds = (user.totalActiveDays || 0) > 0
            ? Number((Number(timeSpentAgg._sum.timeSpent ?? 0) / (user.totalActiveDays || 1)).toFixed(0))
            : 0;

        return {
            userId: user.id,
            email: user.email,
            name: user.name,
            planTier: user.tier,
            tier: user.tier,
            dateJoined: user.createdAt,
            currentStreak: user.currentStreak,
            longestStreak: user.longestStreak,
            lastActiveDate: user.lastActiveAt,
            lastLessonCompleted: lastLessonProgress
                ? {
                    lessonName: lastLessonProgress.lesson?.name ?? 'Unknown lesson',
                    completedAt: lastLessonProgress.completedAt,
                }
                : null,
            lessonsCompleted: {
                allTime: lessonsCompletedAll,
                thisWeek: lessonsCompletedThisWeek,
                today: lessonsCompletedToday,
            },
            lessonCompletionRate: completionRate,
            missedDays: {
                total: missedTotal,
                thisWeek: missedThisWeek,
                thisMonth: missedThisMonth,
            },
            streakFreezes: {
                used: usedFreezeCount,
                remaining: remainingFreezeCount,
                total: freezeCount,
            },
            totalPoints,
            currentLevel: Math.max(1, Math.floor(totalPoints / 1000) + 1),
            rank,
            learnAndEarn: {
                pointsEarned: totalPoints,
                amountPayable,
                totalEverPaidOut: totalPaidOut,
                totalEarned,
            },
            monetization: {
                eligible: monetizationEligible,
                reason: monetizationReason,
            },
            mockExamHistory,
            averageDailyTimeSpent: {
                seconds: averageDailyTimeSpentSeconds,
                minutes: Number((averageDailyTimeSpentSeconds / 60).toFixed(2)),
                hours: Number((averageDailyTimeSpentSeconds / 3600).toFixed(2)),
            },
            badges: userBadges.map((item: any) => ({
                id: item.badge.id,
                name: item.badge.name,
                icon: item.badge.icon,
                description: item.badge.description,
                color: item.badge.color,
                awardedAt: item.awardedAt,
            })),
        };
    }

    async updateProfile(userId: string, data: { name?: string, billingCountry?: string, expoPushToken?: string, avatarUrl?: string }) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new BadRequestException('User not found');

        const updateData: any = { ...data };

        // Handle billing country locking
        if (data.billingCountry) {
            if (user.countryLocked && user.billingCountry !== data.billingCountry) {
                throw new BadRequestException('Billing country is locked and cannot be changed');
            }
            updateData.countryLocked = true;
        }

        return this.prisma.user.update({
            where: { id: userId },
            data: updateData,
        });
    }

    async getLearningProgress(userId: string) {
        // Get all subjects with their topics and lessons
        const subjects = await this.prisma.subject.findMany({
            include: {
                topics: {
                    include: {
                        lessons: {
                            include: {
                                userProgress: {
                                    where: { userId }
                                }
                            }
                        }
                    }
                }
            }
        });

        return subjects.map(subject => {
            let totalLessons = 0;
            let completedLessons = 0;

            subject.topics.forEach(topic => {
                topic.lessons.forEach(lesson => {
                    totalLessons++;
                    if (lesson.userProgress && lesson.userProgress.length > 0) {
                        completedLessons++;
                    }
                });
            });

            return {
                id: subject.id,
                name: subject.name,
                totalTopics: subject.topics.length,
                totalLessons,
                completedLessons,
                progress: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
            };
        });
    }

    async getBanks(country: string = 'nigeria') {
        try {
            const response = await lastValueFrom(
                this.httpService.get(`https://api.paystack.co/bank?country=${country.toLowerCase()}`, {
                    headers: { Authorization: `Bearer ${this.paystackKey}` },
                })
            );
            return response.data.data; // List of banks
        } catch (error) {
            this.logger.error('Failed to fetch banks from Paystack', error);
            throw new BadRequestException('Could not fetch bank list');
        }
    }

    async resolveAccount(accountNumber: string, bankCode: string) {
        try {
            const response = await lastValueFrom(
                this.httpService.get(`https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`, {
                    headers: { Authorization: `Bearer ${this.paystackKey}` },
                })
            );
            return response.data.data; // { account_number: string, account_name: string, bank_id: number }
        } catch (error) {
            this.logger.error('Failed to resolve account from Paystack', error);
            throw new BadRequestException('Could not verify account details');
        }
    }

    private normalizeName(name: string): string {
        return name.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    }

    private namesMatch(name1: string, name2: string): boolean {
        const n1 = this.normalizeName(name1);
        const n2 = this.normalizeName(name2);
        if (!n1 || !n2) return false;
        // Check for partial match or inclusion
        return n1.includes(n2) || n2.includes(n1);
    }

    async submitKyc(userId: string, dto: { payoutMethod: PayoutMethod; payoutAccount: Record<string, any> }) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } }) as any;
        if (!user) throw new BadRequestException('User not found');

        if (!['SILVER', 'GOLD'].includes(user.tier)) {
            throw new BadRequestException('Only Silver or Gold tier users can submit KYC');
        }

        if (user.kycStatus === KycStatus.APPROVED) {
            throw new BadRequestException('Your KYC is already approved');
        }

        let status: KycStatus = KycStatus.PENDING;

        // Auto-approval logic for bank accounts
        if (dto.payoutMethod === 'NGN_BANK' && dto.payoutAccount.accountNumber && dto.payoutAccount.bankCode) {
            try {
                const resolved = await this.resolveAccount(dto.payoutAccount.accountNumber, dto.payoutAccount.bankCode);
                if (resolved && resolved.account_name) {
                    // Update the account name in the DTO to the resolved one
                    dto.payoutAccount.accountName = resolved.account_name;

                    if (this.namesMatch(user.name || '', resolved.account_name)) {
                        status = KycStatus.APPROVED;
                    }
                }
            } catch (error) {
                this.logger.warn(`Auto-resolution failed for user ${userId}, falling back to manual review`);
            }
        }

        return this.prisma.user.update({
            where: { id: userId },
            data: {
                kycStatus: status,
                payoutMethod: dto.payoutMethod,
                payoutAccount: dto.payoutAccount,
                isVerified: status === KycStatus.APPROVED,
            },
            select: { id: true, kycStatus: true, payoutMethod: true, payoutAccount: true, isVerified: true },
        }) as any;
    }

    async updateKycStatus(userId: string, status: KycStatus) {
        return this.prisma.user.update({
            where: { id: userId },
            data: { kycStatus: status, isVerified: status === KycStatus.APPROVED },
            select: { id: true, name: true, email: true, kycStatus: true, isVerified: true },
        }) as any;
    }

    async getActiveSubscription(userId: string) {
        return (this.prisma as any).subscriptionRecord.findFirst({
            where: { userId, status: 'ACTIVE' },
            orderBy: { currentPeriodEnd: 'desc' }
        });
    }
}
