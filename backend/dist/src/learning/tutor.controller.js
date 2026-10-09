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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TutorController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const prisma_service_1 = require("../prisma.service");
const axios_1 = __importDefault(require("axios"));
let TutorController = class TutorController {
    prisma;
    deepseekKey;
    constructor(prisma) {
        this.prisma = prisma;
        this.deepseekKey = process.env.DEEPSEEK_API_KEY ?? '';
    }
    async getSessions(req) {
        return this.prisma.tutorSession.findMany({
            where: { userId: req.user.userId },
            orderBy: { updatedAt: 'desc' }
        });
    }
    async getMessages(sessionId, req) {
        const session = await this.prisma.tutorSession.findUnique({
            where: { id: sessionId, userId: req.user.userId }
        });
        if (!session)
            throw new common_1.BadRequestException('Session not found');
        return this.prisma.tutorMessage.findMany({
            where: { sessionId },
            orderBy: { createdAt: 'asc' }
        });
    }
    async chat(dto, req, res) {
        if (req.user.tier === 'FREE') {
            return res.status(403).json({ message: 'AI Tutor is only available for Gold members.' });
        }
        let sessionId = dto.sessionId;
        let isNewSession = false;
        if (!sessionId) {
            const session = await this.prisma.tutorSession.create({
                data: {
                    userId: req.user.userId,
                    title: dto.message.substring(0, 30) + (dto.message.length > 30 ? '...' : '')
                }
            });
            sessionId = session.id;
            isNewSession = true;
        }
        else {
            const session = await this.prisma.tutorSession.findUnique({ where: { id: sessionId } });
            if (!session || session.userId !== req.user.userId) {
                return res.status(403).json({ message: 'Invalid session' });
            }
        }
        await this.prisma.tutorMessage.create({
            data: {
                sessionId,
                role: 'user',
                content: dto.message
            }
        });
        const history = await this.prisma.tutorMessage.findMany({
            where: { sessionId },
            orderBy: { createdAt: 'asc' },
            take: 10
        });
        const messages = history.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
        }));
        const systemInstruction = dto.systemPrompt || `You are an expert AI tutor for the Setorial learning platform. 
Provide clear, educational, and accurate answers.
If the user's question is inappropriate, violent, hate speech, or completely non-educational nonsense, politely refuse to answer.
IMPORTANT MATH FORMATTING: 
1. ALL mathematical expressions, formulas, and numbers MUST use LaTeX wrapped in dollar-sign delimiters.
2. Use $...$ for inline math and $$...$$ for display equations.
3. Examples: $\\frac{a}{b}$, $\\sqrt{x}$, $\\sec^2(x)$, $$E = mc^2$$
4. NEVER escape dollar signs. NEVER use \\$. Always write exactly $ or $$.
5. NEVER output raw LaTeX (like \\times) outside of dollar signs.
6. NEVER use plain Unicode superscripts (like x² or √x) or raw carets (like x^2). Always use LaTeX.`;
        messages.unshift({ role: 'system', content: systemInstruction });
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        if (isNewSession) {
            res.write(`event: session\ndata: {"sessionId": "${sessionId}"}\n\n`);
        }
        try {
            const response = await axios_1.default.post('https://api.deepseek.com/chat/completions', {
                model: 'deepseek-chat',
                messages: messages,
                stream: true,
                max_tokens: 4096
            }, {
                headers: {
                    'Authorization': `Bearer ${this.deepseekKey}`,
                    'Accept': 'text/event-stream'
                },
                responseType: 'stream'
            });
            let fullAssistantMessage = '';
            response.data.on('data', (chunk) => {
                const lines = chunk.toString('utf8').split('\n').filter(line => line.trim() !== '');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.replace('data: ', '');
                        if (dataStr === '[DONE]') {
                            res.write('data: [DONE]\n\n');
                            break;
                        }
                        try {
                            const parsed = JSON.parse(dataStr);
                            const text = parsed.choices[0]?.delta?.content || '';
                            fullAssistantMessage += text;
                            res.write(`data: ${JSON.stringify({ text })}\n\n`);
                        }
                        catch (e) {
                        }
                    }
                }
            });
            response.data.on('end', async () => {
                await this.prisma.tutorMessage.create({
                    data: {
                        sessionId,
                        role: 'assistant',
                        content: fullAssistantMessage
                    }
                });
                res.end();
            });
            response.data.on('error', (err) => {
                res.write(`event: error\ndata: {"error": "stream_interrupted"}\n\n`);
                res.end();
            });
        }
        catch (error) {
            console.error('Deepseek API Error:', error.response?.data || error.message);
            res.write(`event: error\ndata: {"error": "${error.message}"}\n\n`);
            res.end();
        }
    }
};
exports.TutorController = TutorController;
__decorate([
    (0, common_1.Get)('sessions'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TutorController.prototype, "getSessions", null);
__decorate([
    (0, common_1.Get)('sessions/:id/messages'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TutorController.prototype, "getMessages", null);
__decorate([
    (0, common_1.Post)('chat'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], TutorController.prototype, "chat", null);
exports.TutorController = TutorController = __decorate([
    (0, common_1.Controller)('learning/tutor'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TutorController);
//# sourceMappingURL=tutor.controller.js.map