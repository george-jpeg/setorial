import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import Redis from 'ioredis';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class GamificationService implements OnModuleDestroy, OnModuleInit {
    private redis: Redis;

    constructor(
        private prisma: PrismaService,
        private notificationsService: NotificationsService,
    ) {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        this.redis = new Redis(redisUrl, {
            tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
        });
    }

    async onModuleInit() {
        try {
            await this.getStarterBadges();
        } catch (err) {
            console.warn('[GamificationService] Could not seed starter badges (DB may not be ready):', err?.message);
        }
    }

    onModuleDestroy() {
        this.redis.disconnect();
    }

    async awardPoints(userId: string, points: number, action: string, subjectId?: string) {
        // Transactional Points Ledger entry
        await this.prisma.pointsLedger.create({
            data: { userId, points, action },
        });

        // Update Global Leaderboard (Sorted Set)
        await this.redis.zincrby('leaderboard:global', points, userId);

        // Update Subject-specific Leaderboard if provided
        if (subjectId) {
            await this.redis.zincrby(`leaderboard:subject:${subjectId}`, points, userId);
        }
    }

    async incrementStreak(userId: string) {
        const key = `streak:${userId}`;
        const today = new Date().toISOString().split('T')[0];
        const lastActive = await this.redis.hget(key, 'lastActive');

        let currentStreak = parseInt(await this.redis.hget(key, 'count') || '0', 10);
        let newActiveDay = false;

        if (lastActive === today) {
            return currentStreak; // Already incremented today
        }

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (lastActive === yesterdayStr) {
            currentStreak++;
            newActiveDay = true;
        } else {
            // Check for streak freeze before resetting
            const hasFreezeActive = await this.redis.get(`streak_freeze:${userId}`);
            if (hasFreezeActive) {
                // Freeze consumed — keep the streak alive, remove the freeze
                await this.redis.del(`streak_freeze:${userId}`);
                currentStreak++; // They're back, so increment
                newActiveDay = true;
            } else {
                currentStreak = 1; // Reset streak
                newActiveDay = true;
            }
        }

        await this.redis.hset(key, 'count', currentStreak);
        await this.redis.hset(key, 'lastActive', today);

        // Sync with PostgreSQL
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

    /** Apply a streak freeze for the user — lasts until next missed day */
    async applyStreakFreeze(userId: string) {
        // Set with 48 hour TTL (covers 1 missed day + buffer)
        await this.redis.set(`streak_freeze:${userId}`, '1', 'EX', 48 * 60 * 60);
    }

    async getStreak(userId: string): Promise<number> {
        const count = await this.redis.hget(`streak:${userId}`, 'count');
        return parseInt(count || '0', 10);
    }

    async getStarterBadges() {
        // Ensure some default badges exist
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

    async checkAndAwardBadges(userId: string, context: { streak: number, score?: number, total?: number }) {
        const earnedBadges = [];

        // Condition: First Quiz
        if (context.score !== undefined) {
            const quizCount = await this.prisma.pointsLedger.count({ where: { userId, action: 'Quiz Completion' } });
            if (quizCount === 1) {
                earnedBadges.push('First Steps');
            }

            // Condition: Perfect Score
            if (context.score === context.total && context.total > 0) {
                earnedBadges.push('Perfect Score');
            }
        }

        // Condition: 7 Day Streak
        if (context.streak >= 7) {
            earnedBadges.push('7-Day Streak');
        }

        // Award them efficiently in a single batch where possible
        if (earnedBadges.length > 0) {
            const badges = await this.prisma.badge.findMany({ 
                where: { name: { in: earnedBadges } } 
            });
            
            for (const badge of badges) {
                // Upsert handles composite unique key userId_badgeId
                await this.prisma.userBadge.upsert({
                    where: { userId_badgeId: { userId, badgeId: badge.id } },
                    update: {},
                    create: { userId, badgeId: badge.id }
                }).catch(() => { }); 
            }
        }
    }

    async getUserBadges(userId: string) {
        return this.prisma.userBadge.findMany({
            where: { userId },
            include: { badge: true },
            orderBy: { awardedAt: 'desc' }
        }).then(userBadges => userBadges.map(ub => ({
            ...ub.badge,
            awardedAt: ub.awardedAt
        })));
    }

    async getLeaderboard(limit: number = 10, subjectId?: string) {
        const key = subjectId ? `leaderboard:subject:${subjectId}` : 'leaderboard:global';
        const rawData = await this.redis.zrevrange(key, 0, limit - 1, 'WITHSCORES');
        
        // rawData is an array of alternating values: ['userId1', '100', 'userId2', '50']
        const userIds = [];
        const scoresMap = new Map();
        
        for (let i = 0; i < rawData.length; i += 2) {
            const userId = rawData[i];
            const score = parseInt(rawData[i + 1], 10);
            userIds.push(userId);
            scoresMap.set(userId, score);
        }

        if (userIds.length === 0) return [];

        const users = await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, avatarUrl: true }
        });

        // Map and sort back to the Redis sorted order
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
}
