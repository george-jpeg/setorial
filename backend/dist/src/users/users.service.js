"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var UsersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const client_1 = require("@prisma/client");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
let UsersService = UsersService_1 = class UsersService {
    prisma;
    httpService;
    logger = new common_1.Logger(UsersService_1.name);
    paystackKey = process.env.PAYSTACK_SECRET_KEY;
    constructor(prisma, httpService) {
        this.prisma = prisma;
        this.httpService = httpService;
    }
    async createUser(data) {
        return this.prisma.user.create({ data });
    }
    async findByEmail(email) {
        return this.prisma.user.findUnique({ where: { email } });
    }
    async findById(id) {
        return this.prisma.user.findUnique({ where: { id } });
    }
    async getPoints(userId) {
        const result = await this.prisma.pointsLedger.aggregate({
            where: { userId },
            _sum: { points: true },
        });
        return result._sum.points || 0;
    }
    getStartOfDay(date) {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        return start;
    }
    getStartOfWeek(date) {
        const start = this.getStartOfDay(date);
        const day = start.getDay();
        const diff = (day === 0 ? -6 : 1 - day);
        start.setDate(start.getDate() + diff);
        return start;
    }
    getStartOfMonth(date) {
        return new Date(date.getFullYear(), date.getMonth(), 1);
    }
    async getUserStats(userId) {
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
        if (!user)
            throw new common_1.BadRequestException('User not found');
        const now = new Date();
        const startOfToday = this.getStartOfDay(now);
        const startOfWeek = this.getStartOfWeek(now);
        const startOfMonth = this.getStartOfMonth(now);
        const daysSinceJoin = Math.max(0, Math.ceil((now.getTime() - new Date(user.createdAt).getTime()) / 86400000));
        const [pointsAgg, walletGroups] = await Promise.all([
            this.prisma.pointsLedger.aggregate({ where: { userId }, _sum: { points: true } }),
            this.prisma.walletLedger.groupBy({
                by: ['type'],
                where: { userId },
                _sum: { amount: true },
            }),
        ]);
        const totalPoints = Number(pointsAgg._sum.points ?? 0);
        const totalEarned = Number(walletGroups.find((g) => g.type === 'EARN')?._sum.amount ?? 0);
        const amountPayable = Number(walletGroups.find((g) => g.type === 'ELIGIBLE_MOVE')?._sum.amount ?? 0);
        const totalPaidOut = Number(walletGroups.find((g) => g.type === 'PAYOUT')?._sum.amount ?? 0);
        const [lessonsCompletedAll, lessonsCompletedThisWeek, lessonsCompletedToday, totalLessonsAvailable, lastLessonProgress,] = await Promise.all([
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
        const [freezePowerUps, mockAttempts, userBadges, timeSpentAgg, activeThisWeek, activeThisMonth,] = await Promise.all([
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
        }
        catch {
            rank = 1;
        }
        const completionRate = totalLessonsAvailable > 0 ? Number(((lessonsCompletedAll / totalLessonsAvailable) * 100).toFixed(2)) : 0;
        const freezeCount = freezePowerUps.length;
        const usedFreezeCount = freezePowerUps.filter((item) => !item.isActive).length;
        const remainingFreezeCount = freezePowerUps.filter((item) => item.isActive).length;
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
        const mockExamHistory = mockAttempts.map((attempt) => ({
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
            badges: userBadges.map((item) => ({
                id: item.badge.id,
                name: item.badge.name,
                icon: item.badge.icon,
                description: item.badge.description,
                color: item.badge.color,
                awardedAt: item.awardedAt,
            })),
        };
    }
    async updateProfile(userId, data) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.BadRequestException('User not found');
        const updateData = { ...data };
        if (data.billingCountry) {
            if (user.countryLocked && user.billingCountry !== data.billingCountry) {
                throw new common_1.BadRequestException('Billing country is locked and cannot be changed');
            }
            updateData.countryLocked = true;
        }
        return this.prisma.user.update({
            where: { id: userId },
            data: updateData,
        });
    }
    async getLearningProgress(userId) {
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
    async getBanks(country = 'nigeria') {
        try {
            const response = await (0, rxjs_1.lastValueFrom)(this.httpService.get(`https://api.paystack.co/bank?country=${country.toLowerCase()}`, {
                headers: { Authorization: `Bearer ${this.paystackKey}` },
            }));
            return response.data.data;
        }
        catch (error) {
            this.logger.error('Failed to fetch banks from Paystack', error);
            throw new common_1.BadRequestException('Could not fetch bank list');
        }
    }
    async resolveAccount(accountNumber, bankCode) {
        try {
            const response = await (0, rxjs_1.lastValueFrom)(this.httpService.get(`https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`, {
                headers: { Authorization: `Bearer ${this.paystackKey}` },
            }));
            return response.data.data;
        }
        catch (error) {
            this.logger.error('Failed to resolve account from Paystack', error);
            throw new common_1.BadRequestException('Could not verify account details');
        }
    }
    normalizeName(name) {
        return name.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    }
    namesMatch(name1, name2) {
        const n1 = this.normalizeName(name1);
        const n2 = this.normalizeName(name2);
        if (!n1 || !n2)
            return false;
        return n1.includes(n2) || n2.includes(n1);
    }
    async submitKyc(userId, dto) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.BadRequestException('User not found');
        if (!['SILVER', 'GOLD'].includes(user.tier)) {
            throw new common_1.BadRequestException('Only Silver or Gold tier users can submit KYC');
        }
        if (user.kycStatus === client_1.KycStatus.APPROVED) {
            throw new common_1.BadRequestException('Your KYC is already approved');
        }
        let status = client_1.KycStatus.PENDING;
        if (dto.payoutMethod === 'NGN_BANK' && dto.payoutAccount.accountNumber && dto.payoutAccount.bankCode) {
            try {
                const resolved = await this.resolveAccount(dto.payoutAccount.accountNumber, dto.payoutAccount.bankCode);
                if (resolved && resolved.account_name) {
                    dto.payoutAccount.accountName = resolved.account_name;
                    if (this.namesMatch(user.name || '', resolved.account_name)) {
                        status = client_1.KycStatus.APPROVED;
                    }
                }
            }
            catch (error) {
                this.logger.warn(`Auto-resolution failed for user ${userId}, falling back to manual review`);
            }
        }
        return this.prisma.user.update({
            where: { id: userId },
            data: {
                kycStatus: status,
                payoutMethod: dto.payoutMethod,
                payoutAccount: dto.payoutAccount,
                isVerified: status === client_1.KycStatus.APPROVED,
            },
            select: { id: true, kycStatus: true, payoutMethod: true, payoutAccount: true, isVerified: true },
        });
    }
    async updateKycStatus(userId, status) {
        return this.prisma.user.update({
            where: { id: userId },
            data: { kycStatus: status, isVerified: status === client_1.KycStatus.APPROVED },
            select: { id: true, name: true, email: true, kycStatus: true, isVerified: true },
        });
    }
    async getActiveSubscription(userId) {
        return this.prisma.subscriptionRecord.findFirst({
            where: { userId, status: 'ACTIVE' },
            orderBy: { currentPeriodEnd: 'desc' }
        });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = UsersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        axios_1.HttpService])
], UsersService);
//# sourceMappingURL=users.service.js.map