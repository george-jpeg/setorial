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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GamificationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const ioredis_1 = __importDefault(require("ioredis"));
const notifications_service_1 = require("../notifications/notifications.service");
let GamificationService = class GamificationService {
    prisma;
    notificationsService;
    redis;
    constructor(prisma, notificationsService) {
        this.prisma = prisma;
        this.notificationsService = notificationsService;
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        this.redis = new ioredis_1.default(redisUrl, {
            tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
        });
    }
    async onModuleInit() {
        await this.getStarterBadges();
    }
    onModuleDestroy() {
        this.redis.disconnect();
    }
    async awardPoints(userId, points, action, subjectId) {
        await this.prisma.pointsLedger.create({
            data: { userId, points, action },
        });
        await this.redis.zincrby('leaderboard:global', points, userId);
        if (subjectId) {
            await this.redis.zincrby(`leaderboard:subject:${subjectId}`, points, userId);
        }
    }
    async incrementStreak(userId) {
        const key = `streak:${userId}`;
        const today = new Date().toISOString().split('T')[0];
        const lastActive = await this.redis.hget(key, 'lastActive');
        let currentStreak = parseInt(await this.redis.hget(key, 'count') || '0', 10);
        let newActiveDay = false;
        if (lastActive === today) {
            return currentStreak;
        }
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        if (lastActive === yesterdayStr) {
            currentStreak++;
            newActiveDay = true;
        }
        else {
            const hasFreezeActive = await this.redis.get(`streak_freeze:${userId}`);
            if (hasFreezeActive) {
                await this.redis.del(`streak_freeze:${userId}`);
                currentStreak++;
                newActiveDay = true;
            }
            else {
                currentStreak = 1;
                newActiveDay = true;
            }
        }
        await this.redis.hset(key, 'count', currentStreak);
        await this.redis.hset(key, 'lastActive', today);
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { longestStreak: true } });
        if (user) {
            const longestStreak = Math.max(user.longestStreak || 0, currentStreak);
            await this.prisma.user.update({
                where: { id: userId },
                data: {
                    currentStreak,
                    longestStreak,
                    ...(newActiveDay && { totalActiveDays: { increment: 1 } }),
                    lastActiveAt: new Date(),
                }
            });
        }
        return currentStreak;
    }
    async applyStreakFreeze(userId) {
        await this.redis.set(`streak_freeze:${userId}`, '1', 'EX', 48 * 60 * 60);
    }
    async getStreak(userId) {
        const count = await this.redis.hget(`streak:${userId}`, 'count');
        return parseInt(count || '0', 10);
    }
    async getStarterBadges() {
        const defaultBadges = [
            { name: 'First Steps', description: 'Completed your first quiz.', icon: 'CheckCircle', color: '#58CC02' },
            { name: 'Perfect Score', description: 'Got 100% on a quiz.', icon: 'Star', color: '#FFC800' },
            { name: '7-Day Streak', description: 'Studied for 7 days in a row.', icon: 'Zap', color: '#FF9600' }
        ];
        for (const b of defaultBadges) {
            await this.prisma.badge.upsert({
                where: { name: b.name },
                update: {},
                create: b
            });
        }
    }
    async checkAndAwardBadges(userId, context) {
        const earnedBadges = [];
        if (context.score !== undefined) {
            const quizCount = await this.prisma.pointsLedger.count({ where: { userId, action: 'Quiz Completion' } });
            if (quizCount === 1) {
                earnedBadges.push('First Steps');
            }
            if (context.score === context.total && context.total > 0) {
                earnedBadges.push('Perfect Score');
            }
        }
        if (context.streak >= 7) {
            earnedBadges.push('7-Day Streak');
        }
        if (earnedBadges.length > 0) {
            const badges = await this.prisma.badge.findMany({
                where: { name: { in: earnedBadges } }
            });
            for (const badge of badges) {
                await this.prisma.userBadge.upsert({
                    where: { userId_badgeId: { userId, badgeId: badge.id } },
                    update: {},
                    create: { userId, badgeId: badge.id }
                }).catch(() => { });
            }
        }
    }
    async getUserBadges(userId) {
        return this.prisma.userBadge.findMany({
            where: { userId },
            include: { badge: true },
            orderBy: { awardedAt: 'desc' }
        }).then(userBadges => userBadges.map(ub => ({
            ...ub.badge,
            awardedAt: ub.awardedAt
        })));
    }
    async getLeaderboard(limit = 10, subjectId) {
        const key = subjectId ? `leaderboard:subject:${subjectId}` : 'leaderboard:global';
        const rawData = await this.redis.zrevrange(key, 0, limit - 1, 'WITHSCORES');
        const userIds = [];
        const scoresMap = new Map();
        for (let i = 0; i < rawData.length; i += 2) {
            const userId = rawData[i];
            const score = parseInt(rawData[i + 1], 10);
            userIds.push(userId);
            scoresMap.set(userId, score);
        }
        if (userIds.length === 0)
            return [];
        const users = await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, avatarUrl: true }
        });
        return userIds.map(id => {
            const user = users.find(u => u.id === id);
            return {
                id,
                points: scoresMap.get(id),
                name: user?.name || 'Student',
                avatarUrl: user?.avatarUrl || null
            };
        });
    }
};
exports.GamificationService = GamificationService;
exports.GamificationService = GamificationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService])
], GamificationService);
//# sourceMappingURL=gamification.service.js.map