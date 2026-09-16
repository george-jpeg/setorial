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
var AiContentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiContentService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const axios_1 = __importDefault(require("axios"));
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
let AiContentService = AiContentService_1 = class AiContentService {
    prisma;
    aiQueue;
    logger = new common_1.Logger(AiContentService_1.name);
    deepseekKey;
    constructor(prisma, aiQueue) {
        this.prisma = prisma;
        this.aiQueue = aiQueue;
        this.deepseekKey = process.env.DEEPSEEK_API_KEY ?? '';
        if (!this.deepseekKey) {
            throw new Error('Missing environment variable DEEPSEEK_API_KEY');
        }
    }
    async queueFullSyllabusGeneration(subjectId, numTopics, userRole) {
        if (!this.aiQueue) {
            this.logger.warn('Bull queues disabled; cannot queue AI content generation.');
            throw new Error('Background queue unavailable');
        }
        await this.aiQueue.add('generate-full-subject', { subjectId, numTopics, userRole }, {
            removeOnComplete: true,
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 }
        });
        return { message: 'Wormhole opened. Generating syllabus in the background...' };
    }
    async generateLevelsForTopic(subjectId, topicName, numLevels = 3, userRole) {
        const subject = await this.prisma.subject.findUnique({ where: { id: subjectId } });
        if (!subject)
            throw new Error('Subject not found');
        const isApproved = userRole === 'TUTOR' ? false : true;
        let topic = await this.prisma.topic.findFirst({
            where: { name: topicName, subjectId }
        });
        if (!topic) {
            topic = await this.prisma.topic.create({
                data: { name: topicName, subjectId, isApproved }
            });
        }
        const titlePrompt = `For the subject "${subject.name}" and the topic "${topicName}", suggest exactly ${numLevels} textbook chapter titles in logical learning order.
Respond ONLY with a JSON object:
{
  "titles": ["Chapter 1 Name", "Chapter 2 Name", ...]
}`;
        const { titles } = await this.executeGeneration(titlePrompt, async (data) => data);
        const createdLessons = [];
        for (let i = 0; i < titles.length; i++) {
            const lessonData = await this.generateLessonContent(subject.name, topicName, titles[i]);
            const lesson = await this.prisma.lesson.create({
                data: {
                    name: titles[i],
                    topicId: topic.id,
                    content: lessonData.content,
                    order: i + 1,
                    isApproved,
                    questions: {
                        create: lessonData.questions.map((q) => ({
                            text: q.text,
                            options: q.options,
                            correctOption: q.correctOption
                        }))
                    }
                },
                include: { questions: true }
            });
            createdLessons.push(lesson);
        }
        return { topic, levels: createdLessons };
    }
    async generateLessonContent(subjectName, topicName, lessonName) {
        const prompt = `You are writing a professional textbook chapter.
Subject: "${subjectName}".
Topic: "${topicName}".
Chapter Title: "${lessonName}".

Provide high-depth textbook-style content (~800-1200 words). Include sections like "Introduction", "Core Principles", "Detailed Analysis", "Practical Examples", and "Summary". 
Also generate 5 challenging multiple-choice questions based on this specific content.

IMPORTANT MATH FORMATTING: All mathematical expressions MUST use LaTeX wrapped in dollar-sign delimiters.
Use $...$ for inline math and $$...$$ for display equations.
Examples: $\\frac{a}{b}$, $\\sqrt{x}$, $\\sec^2(x)$, $$E = mc^2$$
NEVER use plain Unicode superscripts (like x² or √x) or raw carets (like x^2). Always use LaTeX.

Respond ONLY with valid JSON:
{
  "content": "Full textbook markdown...",
  "questions": [ { "text": "...", "options": ["A", "B", "C", "D"], "correctOption": 0 } ]
}`;
        return this.executeGeneration(prompt, async (data) => data);
    }
    async regenerateLesson(lessonId, userRole) {
        const lesson = await this.prisma.lesson.findUnique({
            where: { id: lessonId },
            include: { topic: { include: { subject: true } } }
        });
        if (!lesson)
            throw new Error('Lesson not found');
        const data = await this.generateLessonContent(lesson.topic.subject.name, lesson.topic.name, lesson.name);
        const isApproved = userRole === 'TUTOR' ? false : true;
        return await this.prisma.$transaction(async (tx) => {
            await tx.question.deleteMany({ where: { lessonId } });
            return tx.lesson.update({
                where: { id: lessonId },
                data: {
                    content: data.content,
                    isApproved,
                    questions: {
                        create: data.questions.map((q) => ({
                            text: q.text,
                            options: q.options,
                            correctOption: q.correctOption
                        }))
                    }
                },
                include: { questions: true }
            });
        });
    }
    async generateMockExam(subjectId, title, numQuestions = 30, durationMinutes, userRole) {
        const subject = await this.prisma.subject.findUnique({ where: { id: subjectId } });
        if (!subject)
            throw new Error('Subject not found');
        const isApproved = userRole === 'TUTOR' ? false : true;
        const duration = durationMinutes || Math.ceil(numQuestions * 1.5);
        const maxPerBatch = 30;
        let allQuestions = [];
        let questionsRemaining = numQuestions;
        while (questionsRemaining > 0) {
            const batchSize = Math.min(questionsRemaining, maxPerBatch);
            const prompt = `Create a professional standardized mock exam for the subject "${subject.name}".
Generate exactly ${batchSize} diverse, high-quality multiple choice questions.

GUARDRAILS: If the subject "${subject.name}" is not academic, educational, or professional in nature (e.g., hate speech, violence, meaningless nonsense, purely non-academic pop culture), you MUST return an empty array: { "questions": [] }. Do not generate educational-looking questions for inappropriate topics.

IMPORTANT MATH FORMATTING: All mathematical expressions MUST use LaTeX wrapped in dollar-sign delimiters.
Use $...$ for inline math and $$...$$ for display equations.
Examples: $\\frac{a}{b}$, $\\sqrt{x}$, $\\sec^2(x)$, $$E = mc^2$$
NEVER use plain Unicode superscripts (like x² or √x) or raw carets (like x^2). Always use LaTeX.

Respond ONLY with valid JSON:
{
  "questions": [
    {
      "text": "Question text...",
      "options": ["A", "B", "C", "D"],
      "correctOption": 0
    }
  ]
}`;
            try {
                const batchData = await this.executeGeneration(prompt, async (data) => data);
                if (batchData?.questions && Array.isArray(batchData.questions)) {
                    allQuestions = allQuestions.concat(batchData.questions);
                }
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                const stack = err instanceof Error ? err.stack : undefined;
                this.logger.error(`Batch generation failed: ${msg}`, stack);
            }
            questionsRemaining -= batchSize;
        }
        if (allQuestions.length === 0) {
            throw new Error('AI refused to generate mock exam. Please provide a valid educational subject.');
        }
        return this.prisma.mockExam.create({
            data: {
                title: title,
                description: `Comprehensive mock exam for ${subject.name}`,
                durationMinutes: duration,
                isApproved,
                questions: {
                    create: allQuestions.map((q) => ({
                        text: q.text,
                        options: q.options,
                        correctOption: q.correctOption
                    }))
                }
            },
            include: { questions: true }
        });
    }
    async generateFullSyllabus(subjectId, numTopics = 5, userRole) {
        const subject = await this.prisma.subject.findUnique({ where: { id: subjectId } });
        if (!subject)
            throw new Error('Subject not found');
        const topicPrompt = `Generate exactly ${numTopics} curriculum topics for the subject "${subject.name}".
Respond ONLY with a JSON object:
{
  "topics": ["Topic 1 Name", "Topic 2 Name", ...]
}`;
        const topicData = await this.executeGeneration(topicPrompt, async (data) => data);
        const topicNames = topicData.topics;
        const results = [];
        for (const topicName of topicNames) {
            try {
                const topicResult = await this.generateLevelsForTopic(subjectId, topicName, 3, userRole);
                results.push(topicResult);
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                const stack = err instanceof Error ? err.stack : undefined;
                this.logger.error(`Failed to generate levels for topic ${topicName}: ${msg}`, stack);
            }
        }
        try {
            await this.generateMockExam(subjectId, `${subject.name} - Standardized Pro Mock`, 30, undefined, userRole);
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            const stack = err instanceof Error ? err.stack : undefined;
            this.logger.error(`Failed to generate subject mock exam: ${msg}`, stack);
        }
        return { subject, topics: results };
    }
    async executeGeneration(prompt, saveCallback) {
        try {
            const response = await axios_1.default.post('https://api.deepseek.com/chat/completions', {
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: 'You are a professional academic JSON generator. You provide deep, accurate, and extensive educational content.' },
                    { role: 'user', content: prompt }
                ],
                response_format: { type: 'json_object' },
                max_tokens: 8192
            }, { headers: { 'Authorization': `Bearer ${this.deepseekKey}` } });
            let text = response.data.choices[0].message.content.trim();
            if (text.startsWith('\`\`\`json'))
                text = text.replace(/^\`\`\`json\s*/, '').replace(/\s*\`\`\`$/, '');
            else if (text.startsWith('\`\`\`'))
                text = text.replace(/^\`\`\`\s*/, '').replace(/\s*\`\`\`$/, '');
            const data = JSON.parse(text);
            return await saveCallback(data);
        }
        catch (error) {
            if (error instanceof Error) {
                this.logger.error(`AI Generation failed: ${error.message}`, error.stack);
            }
            else {
                this.logger.error(`AI Generation failed: ${String(error)}`);
            }
            throw new Error('Failed to generate AI content');
        }
    }
    async generateQuestionsForSubject(subjectName, numQuestions) {
        const maxPerBatch = 30;
        let allQuestions = [];
        let questionsRemaining = numQuestions;
        while (questionsRemaining > 0) {
            const batchSize = Math.min(questionsRemaining, maxPerBatch);
            const prompt = `Create a professional standardized mock exam for the subject "${subjectName}".
Generate exactly ${batchSize} diverse, high-quality multiple choice questions.

IMPORTANT MATH FORMATTING: All mathematical expressions MUST use LaTeX wrapped in dollar-sign delimiters.
Use $...$ for inline math and $$...$$ for display equations.
Examples: $\\frac{a}{b}$, $\\sqrt{x}$, $\\sec^2(x)$, $$E = mc^2$$
NEVER use plain Unicode superscripts (like x² or √x) or raw carets (like x^2). Always use LaTeX.

Respond ONLY with valid JSON:
{
  "questions": [
    {
      "text": "Question text...",
      "options": ["A", "B", "C", "D"],
      "correctOption": 0
    }
  ]
}`;
            try {
                const batchData = await this.executeGeneration(prompt, async (data) => data);
                if (batchData?.questions && Array.isArray(batchData.questions)) {
                    allQuestions = allQuestions.concat(batchData.questions);
                }
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                const stack = err instanceof Error ? err.stack : undefined;
                this.logger.error(`Batch generation failed for ${subjectName}: ${msg}`, stack);
            }
            questionsRemaining -= batchSize;
        }
        return allQuestions;
    }
};
exports.AiContentService = AiContentService;
exports.AiContentService = AiContentService = AiContentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Optional)()),
    __param(1, (0, bullmq_1.InjectQueue)('ai-content')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        bullmq_2.Queue])
], AiContentService);
//# sourceMappingURL=ai-content.service.js.map