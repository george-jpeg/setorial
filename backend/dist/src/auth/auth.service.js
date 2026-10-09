"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const users_service_1 = require("../users/users.service");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const axios_1 = __importDefault(require("axios"));
const crypto_1 = require("crypto");
let AuthService = AuthService_1 = class AuthService {
    usersService;
    jwtService;
    prisma;
    notificationsService;
    logger = new common_1.Logger(AuthService_1.name);
    constructor(usersService, jwtService, prisma, notificationsService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.prisma = prisma;
        this.notificationsService = notificationsService;
    }
    async register(registerDto) {
        const existing = await this.usersService.findByEmail(registerDto.email);
        if (existing) {
            throw new common_1.BadRequestException('Email already in use');
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 15 * 60 * 1000);
        const hashedPassword = await bcrypt.hash(registerDto.password, 10);
        await this.usersService.createUser({
            email: registerDto.email,
            password: hashedPassword,
            name: registerDto.name,
            emailOtp: otp,
            emailOtpExpiresAt: otpExpires,
            isEmailVerified: false,
        });
        this.notificationsService.sendOtpEmail(registerDto.email, otp, registerDto.name || 'Student').catch(err => this.logger.warn(`Failed to queue OTP email in register: ${err.message}`));
        return {
            message: 'Registration successful. Please check your email for the verification code.',
            email: registerDto.email
        };
    }
    async verifyOtp(email, otp) {
        const user = await this.usersService.findByEmail(email);
        if (!user)
            throw new common_1.BadRequestException('User not found');
        if (user.isEmailVerified) {
            throw new common_1.BadRequestException('Email already verified');
        }
        if (user.emailOtp !== otp) {
            throw new common_1.BadRequestException('Invalid verification code');
        }
        if (user.emailOtpExpiresAt && new Date() > user.emailOtpExpiresAt) {
            throw new common_1.BadRequestException('Verification code has expired');
        }
        const updatedUser = await this.prisma.user.update({
            where: { id: user.id },
            data: {
                isEmailVerified: true,
                emailOtp: null,
                emailOtpExpiresAt: null,
            }
        });
        this.notificationsService.sendWelcomeEmail(updatedUser.email, updatedUser.name || 'Student').catch(err => this.logger.warn(`Failed to queue welcome email in verifyOtp: ${err.message}`));
        return this.generateAuthResponse(updatedUser);
    }
    async login(loginDto, ipCountry) {
        let user = await this.usersService.findByEmail(loginDto.email);
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (!user.isEmailVerified) {
            throw new common_1.UnauthorizedException('Please verify your email address first');
        }
        if (ipCountry && user.countryLocked && user.billingCountry && user.billingCountry.toUpperCase() !== ipCountry.toUpperCase()) {
            if (!user.isFlagged) {
                user = await this.prisma.user.update({
                    where: { id: user.id },
                    data: { isFlagged: true }
                });
            }
        }
        await this.prisma.user.update({
            where: { id: user.id },
            data: { lastActiveAt: new Date() }
        });
        return this.generateAuthResponse(user);
    }
    async changePassword(userId, currentPassword, newPassword) {
        const user = await this.usersService.findById(userId);
        if (!user)
            throw new common_1.UnauthorizedException('User not found');
        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid)
            throw new common_1.BadRequestException('Current password is incorrect');
        const hashed = await bcrypt.hash(newPassword, 10);
        await this.prisma.user.update({
            where: { id: userId },
            data: { password: hashed },
        });
        return { message: 'Password updated successfully' };
    }
    async forgotPassword(email) {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            return { message: 'If an account with that email exists, a password reset code has been sent.' };
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 15 * 60 * 1000);
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                emailOtp: otp,
                emailOtpExpiresAt: otpExpires,
            }
        });
        this.notificationsService.sendPasswordResetEmail(user.email, otp, user.name || 'Student').catch(err => this.logger.warn(`Failed to queue password reset email: ${err.message}`));
        return { message: 'If an account with that email exists, a password reset code has been sent.' };
    }
    async resetPassword(email, otp, newPassword) {
        const user = await this.usersService.findByEmail(email);
        if (!user)
            throw new common_1.BadRequestException('User not found');
        if (user.emailOtp !== otp) {
            throw new common_1.BadRequestException('Invalid verification code');
        }
        if (user.emailOtpExpiresAt && new Date() > user.emailOtpExpiresAt) {
            throw new common_1.BadRequestException('Verification code has expired');
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                emailOtp: null,
                emailOtpExpiresAt: null,
            }
        });
        return { message: 'Password has been successfully reset. You can now log in.' };
    }
    async googleLogin(idToken, ipCountry) {
        if (!idToken)
            throw new common_1.BadRequestException('Missing Google ID token');
        const audiences = (process.env.GOOGLE_CLIENT_IDS || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
        if (audiences.length === 0) {
            this.logger.error('GOOGLE_CLIENT_IDS is not configured');
            throw new common_1.BadRequestException('Google sign-in is not configured');
        }
        let payload;
        try {
            const res = await axios_1.default.get('https://oauth2.googleapis.com/tokeninfo', { params: { id_token: idToken }, timeout: 10000 });
            payload = res.data;
        }
        catch (err) {
            this.logger.warn(`Invalid Google token: ${err.response?.data?.error_description || err.message}`);
            throw new common_1.UnauthorizedException('Invalid Google token');
        }
        const validIssuer = payload?.iss === 'accounts.google.com' || payload?.iss === 'https://accounts.google.com';
        if (!validIssuer || !audiences.includes(payload?.aud)) {
            this.logger.warn(`Google token audience/issuer mismatch: aud=${payload?.aud} iss=${payload?.iss}`);
            throw new common_1.UnauthorizedException('Invalid Google token');
        }
        const emailVerified = payload?.email_verified === true || payload?.email_verified === 'true';
        if (!payload?.email || !emailVerified) {
            throw new common_1.UnauthorizedException('Google account email is not verified');
        }
        const email = payload.email.toLowerCase();
        let user = await this.prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
        let isNew = false;
        if (!user) {
            const randomPassword = await bcrypt.hash((0, crypto_1.randomBytes)(32).toString('hex'), 10);
            user = await this.usersService.createUser({
                email,
                password: randomPassword,
                name: payload.name || email.split('@')[0],
                avatarUrl: payload.picture || null,
                isEmailVerified: true,
            });
            isNew = true;
        }
        else if (!user.isEmailVerified) {
            user = await this.prisma.user.update({
                where: { id: user.id },
                data: { isEmailVerified: true, emailOtp: null, emailOtpExpiresAt: null },
            });
        }
        if (ipCountry && user.countryLocked && user.billingCountry && user.billingCountry.toUpperCase() !== ipCountry.toUpperCase() && !user.isFlagged) {
            user = await this.prisma.user.update({ where: { id: user.id }, data: { isFlagged: true } });
        }
        await this.prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
        if (isNew) {
            this.notificationsService.sendWelcomeEmail(user.email, user.name || 'Student').catch(err => this.logger.warn(`Failed to queue welcome email in googleLogin: ${err.message}`));
        }
        return this.generateAuthResponse(user);
    }
    generateAuthResponse(user) {
        const payload = { sub: user.id, email: user.email, role: user.role, tier: user.tier };
        const { password, ...userWithoutPassword } = user;
        const frontendUser = {
            ...userWithoutPassword,
            name: user.name || user.email.split('@')[0],
            points: 0,
            avatarUrl: 'https://i.pravatar.cc/150?u=' + user.id
        };
        return {
            user: frontendUser,
            token: this.jwtService.sign(payload),
            refresh_token: this.jwtService.sign(payload, {
                secret: process.env.JWT_REFRESH_SECRET,
                expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
            }),
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService])
], AuthService);
//# sourceMappingURL=auth.service.js.map