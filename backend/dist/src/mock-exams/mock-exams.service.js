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
var MockExamsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockExamsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const wallet_service_1 = require("../wallet/wallet.service");
const gamification_service_1 = require("../gamification/gamification.service");
const ai_content_service_1 = require("../learning/ai-content.service");
let MockExamsService = MockExamsService_1 = class MockExamsService {
    prisma;
    walletService;
    gamificationService;
    aiContentService;
    logger = new common_1.Logger(MockExamsService_1.name);
    constructor(prisma, walletService, gamificationService, aiContentService) {
        this.prisma = prisma;
        this.walletService = walletService;
        this.gamificationService = gamificationService;
        this.aiContentService = aiContentService;
    }
    async getAvailableMocks(userId, role) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        const isPremium = user && (user.tier === 'SILVER' || user.tier === 'GOLD');
        const isStaff = role === 'ADMIN' || role === 'TUTOR';
        const whereClause = isStaff ? {} : { isActive: true, isApproved: true };
        const mocks = await this.prisma.mockExam.findMany({
            where: whereClause,
            select: {
                id: true,
                title: true,
                description: true,
                durationMinutes: true,
                price: true,
                isActive: true,
                isApproved: true,
                _count: { select: { questions: true } },
                ...(isStaff && { questions: true })
            }
        });
        if (!isStaff && isPremium) {
            return mocks.map(m => ({ ...m, price: 0 }));
        }
        return mocks;
    }
    async getMockDetails(mockId) {
        return this.prisma.mockExam.findUnique({
            where: { id: mockId },
            include: { questions: { select: { id: true, text: true, options: true } } }
        });
    }
    async startMock(userId, mockId) {
        const mock = await this.prisma.mockExam.findUnique({ where: { id: mockId } });
        if (!mock)
            throw new common_1.NotFoundException('Mock exam not found');
        const existingAttempt = await this.prisma.mockAttempt.findFirst({
            where: { userId, mockExamId: mockId, status: 'IN_PROGRESS' }
        });
        if (existingAttempt) {
            return { attemptId: existingAttempt.id, resumed: true };
        }
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        const isPremium = user && (user.tier === 'SILVER' || user.tier === 'GOLD');
        let price = Number(mock.price);
        if (isPremium) {
            price = 0;
        }
        if (price > 0) {
            const hasSufficientBalance = await this.walletService.deductBalance(userId, price, 'Mock Exam Access');
            if (!hasSufficientBalance) {
                throw new common_1.BadRequestException('Insufficient wallet balance to purchase this mock exam.');
            }
        }
        const attempt = await this.prisma.mockAttempt.create({
            data: {
                userId,
                mockExamId: mockId,
                status: 'IN_PROGRESS'
            }
        });
        return { attemptId: attempt.id, resumed: false };
    }
    async submitMock(userId, attemptId, answers, tabSwitches) {
        const attempt = await this.prisma.mockAttempt.findUnique({
            where: { id: attemptId },
            include: { mockExam: { include: { questions: true } } }
        });
        if (!attempt)
            throw new common_1.NotFoundException('Attempt not found');
        if (attempt.userId !== userId)
            throw new common_1.ForbiddenException('Not your attempt');
        if (attempt.status !== 'IN_PROGRESS')
            throw new common_1.BadRequestException('Attempt already completed');
        const now = new Date();
        const durationAllowedMs = attempt.mockExam.durationMinutes * 60 * 1000;
        const timeTakenMs = now.getTime() - attempt.startedAt.getTime();
        const isTimeViolated = timeTakenMs > (durationAllowedMs + (5 * 60 * 1000));
        if (isTimeViolated || tabSwitches > 3) {
            await this.prisma.mockAttempt.update({
                where: { id: attemptId },
                data: { status: 'CHEATED', completedAt: now, score: 0, tabSwitches }
            });
            throw new common_1.BadRequestException('Exam flagged for irregular activity. Score nullified.');
        }
        let score = 0;
        const questions = attempt.mockExam.questions;
        questions.forEach((q, index) => {
            if (q.correctOption === answers[index]) {
                score++;
            }
        });
        const updatedAttempt = await this.prisma.mockAttempt.update({
            where: { id: attemptId },
            data: { status: 'COMPLETED', score, completedAt: now, tabSwitches }
        });
        const pointsEarned = score * 50;
        if (pointsEarned > 0) {
            await this.gamificationService.awardPoints(userId, pointsEarned, 'Mock Exam Completion');
        }
        const corrections = questions.map((q, index) => ({
            text: q.text,
            options: q.options,
            userOption: answers[index],
            correctOption: q.correctOption,
            explanation: q.explanation,
        }));
        return { score, maxScore: questions.length, pointsEarned, status: updatedAttempt.status, corrections };
    }
    async generateCustomMock(userId, subjectIds, numQuestions, durationMinutes) {
        if (!subjectIds || subjectIds.length === 0) {
            throw new common_1.BadRequestException('At least one subject must be selected');
        }
        const parsedNumQuestions = Number(numQuestions);
        const validNumQuestions = (isNaN(parsedNumQuestions) || parsedNumQuestions <= 0) ? 50 : parsedNumQuestions;
        const parsedDuration = Number(durationMinutes);
        const validDuration = (isNaN(parsedDuration) || parsedDuration <= 0) ? Math.ceil(validNumQuestions * 1.5) : parsedDuration;
        const questionsPerSubject = Math.floor(validNumQuestions / subjectIds.length);
        let allQuestions = [];
        let missingQuestionsBySubject = [];
        for (const subjectId of subjectIds) {
            const subject = await this.prisma.subject.findUnique({ where: { id: subjectId } });
            if (!subject)
                continue;
            const dbQuestions = await this.prisma.question.findMany({
                where: {
                    lesson: {
                        topic: {
                            subjectId: subject.id
                        }
                    }
                },
                select: {
                    text: true,
                    options: true,
                    correctOption: true,
                    explanation: true
                }
            });
            const shuffledDb = dbQuestions.sort(() => 0.5 - Math.random());
            const selectedDb = shuffledDb.slice(0, questionsPerSubject);
            allQuestions = allQuestions.concat(selectedDb);
            const missing = questionsPerSubject - selectedDb.length;
            if (missing > 0) {
                missingQuestionsBySubject.push({ subjectName: subject.name, missingCount: missing });
            }
        }
        for (const missingData of missingQuestionsBySubject) {
            try {
                this.logger.log(`Generating ${missingData.missingCount} missing questions via AI for ${missingData.subjectName}`);
                const aiQuestions = await this.aiContentService.generateQuestionsForSubject(missingData.subjectName, missingData.missingCount);
                allQuestions = allQuestions.concat(aiQuestions);
            }
            catch (err) {
                this.logger.error(`Failed to generate AI questions for ${missingData.subjectName}`, err);
            }
        }
        const finalQuestions = allQuestions.sort(() => 0.5 - Math.random());
        const exactQuestions = finalQuestions.slice(0, validNumQuestions);
        if (exactQuestions.length === 0) {
            throw new common_1.BadRequestException('No questions could be found or generated for the selected subjects. Please select different subjects or try again.');
        }
        const formattedQuestions = exactQuestions.map((q) => {
            let opts = q.options;
            if (typeof opts === 'string') {
                try {
                    opts = JSON.parse(opts);
                }
                catch {
                    opts = [opts];
                }
            }
            if (!Array.isArray(opts)) {
                opts = opts && typeof opts === 'object' ? Object.values(opts) : [];
            }
            if (opts.length === 0) {
                opts = ['Option A', 'Option B', 'Option C', 'Option D'];
            }
            return {
                text: String(q.text || 'Question'),
                options: opts.map(String),
                correctOption: typeof q.correctOption === 'number' ? q.correctOption : 0,
                explanation: q.explanation ? String(q.explanation) : null
            };
        });
        const customMock = await this.prisma.mockExam.create({
            data: {
                title: `Custom Mock Exam`,
                description: `A custom mock exam generated on the fly for your subjects.`,
                durationMinutes: validDuration,
                isApproved: true,
                isActive: true,
                price: 0,
                questions: {
                    create: formattedQuestions
                }
            }
        });
        return {
            mockId: customMock.id,
            message: 'Custom mock generated successfully',
            totalQuestions: exactQuestions.length
        };
    }
    async initializePayment(userId, mockId) {
        const secret = process.env.PAYSTACK_SECRET_KEY;
        if (!secret)
            throw new common_1.BadRequestException('Paystack not configured');
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.BadRequestException('User not found');
        const mock = await this.prisma.mockExam.findUnique({ where: { id: mockId } });
        if (!mock)
            throw new common_1.NotFoundException('Mock exam not found');
        if (Number(mock.price) <= 0) {
            throw new common_1.BadRequestException('This mock exam is free. No payment required.');
        }
        const amount = Math.round(Number(mock.price) * 100);
        const response = await fetch('https://api.paystack.co/transaction/initialize', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${secret}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: user.email,
                amount,
                metadata: {
                    userId: user.id,
                    mockExamId: mock.id,
                    type: 'MOCK_EXAM',
                },
                callback_url: `setorial://mock-payment-callback`,
            }),
        });
        const data = await response.json();
        if (!data.status)
            throw new common_1.BadRequestException(data.message || 'Payment initialization failed');
        return {
            authorization_url: data.data.authorization_url,
            access_code: data.data.access_code,
            reference: data.data.reference,
        };
    }
    async verifyPayment(userId, reference) {
        const secret = process.env.PAYSTACK_SECRET_KEY;
        if (!secret)
            throw new common_1.BadRequestException('Paystack not configured');
        const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
            headers: { 'Authorization': `Bearer ${secret}` },
        });
        const data = await response.json();
        if (!data.status || data.data.status !== 'success') {
            throw new common_1.BadRequestException('Payment not verified or not successful');
        }
        const metadata = data.data.metadata;
        if (metadata?.type !== 'MOCK_EXAM' || metadata?.userId !== userId || !metadata?.mockExamId) {
            throw new common_1.BadRequestException('Invalid payment metadata');
        }
        let attempt = await this.prisma.mockAttempt.findFirst({
            where: { userId, mockExamId: metadata.mockExamId, status: 'IN_PROGRESS' }
        });
        if (!attempt) {
            attempt = await this.prisma.mockAttempt.create({
                data: {
                    userId,
                    mockExamId: metadata.mockExamId,
                    status: 'IN_PROGRESS'
                }
            });
        }
        return { status: 'success', attemptId: attempt.id, mockId: metadata.mockExamId };
    }
};
exports.MockExamsService = MockExamsService;
exports.MockExamsService = MockExamsService = MockExamsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        wallet_service_1.WalletService,
        gamification_service_1.GamificationService,
        ai_content_service_1.AiContentService])
], MockExamsService);
//# sourceMappingURL=mock-exams.service.js.map