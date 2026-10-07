import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import axios from 'axios';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private prisma: PrismaService,
        private notificationsService: NotificationsService,
    ) { }

    async register(registerDto: RegisterDto) {
        const existing = await this.usersService.findByEmail(registerDto.email);
        if (existing) {
            throw new BadRequestException('Email already in use');
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

        const hashedPassword = await bcrypt.hash(registerDto.password, 10);
        await this.usersService.createUser({
            email: registerDto.email,
            password: hashedPassword,
            name: registerDto.name,
            emailOtp: otp,
            emailOtpExpiresAt: otpExpires,
            isEmailVerified: false,
        });

        // Fire-and-forget: queue email sending without waiting
        this.notificationsService.sendOtpEmail(registerDto.email, otp, registerDto.name || 'Student').catch(err =>
            this.logger.warn(`Failed to queue OTP email in register: ${err.message}`)
        );

        return {
            message: 'Registration successful. Please check your email for the verification code.',
            email: registerDto.email
        };
    }

    async verifyOtp(email: string, otp: string) {
        const user = await this.usersService.findByEmail(email);
        if (!user) throw new BadRequestException('User not found');

        if (user.isEmailVerified) {
            throw new BadRequestException('Email already verified');
        }

        if (user.emailOtp !== otp) {
            throw new BadRequestException('Invalid verification code');
        }

        if (user.emailOtpExpiresAt && new Date() > user.emailOtpExpiresAt) {
            throw new BadRequestException('Verification code has expired');
        }

        const updatedUser = await this.prisma.user.update({
            where: { id: user.id },
            data: {
                isEmailVerified: true,
                emailOtp: null,
                emailOtpExpiresAt: null,
            }
        });

        // Fire-and-forget: queue welcome email without waiting
        this.notificationsService.sendWelcomeEmail(updatedUser.email, updatedUser.name || 'Student').catch(err =>
            this.logger.warn(`Failed to queue welcome email in verifyOtp: ${err.message}`)
        );

        return this.generateAuthResponse(updatedUser);
    }

    async login(loginDto: LoginDto, ipCountry?: string) {
        let user = await this.usersService.findByEmail(loginDto.email);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }
        const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        if (!user.isEmailVerified) {
            throw new UnauthorizedException('Please verify your email address first');
        }

        // Fraud detection logic
        if (ipCountry && user.countryLocked && user.billingCountry && user.billingCountry.toUpperCase() !== ipCountry.toUpperCase()) {
            if (!user.isFlagged) {
                user = await this.prisma.user.update({
                    where: { id: user.id },
                    data: { isFlagged: true }
                });
            }
        }

        // Update last active
        await this.prisma.user.update({
            where: { id: user.id },
            data: { lastActiveAt: new Date() }
        });

        return this.generateAuthResponse(user);
    }

    async changePassword(userId: string, currentPassword: string, newPassword: string) {
        const user = await this.usersService.findById(userId);
        if (!user) throw new UnauthorizedException('User not found');

        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) throw new BadRequestException('Current password is incorrect');

        const hashed = await bcrypt.hash(newPassword, 10);
        await this.prisma.user.update({
            where: { id: userId },
            data: { password: hashed },
        });

        return { message: 'Password updated successfully' };
    }

    async forgotPassword(email: string) {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            // We return a standard success message even if the user is not found to prevent email enumeration
            return { message: 'If an account with that email exists, a password reset code has been sent.' };
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                emailOtp: otp,
                emailOtpExpiresAt: otpExpires,
            }
        });

        // Fire-and-forget: queue password reset email without waiting
        this.notificationsService.sendPasswordResetEmail(user.email, otp, user.name || 'Student').catch(err =>
            this.logger.warn(`Failed to queue password reset email: ${err.message}`)
        );

        return { message: 'If an account with that email exists, a password reset code has been sent.' };
    }

    async resetPassword(email: string, otp: string, newPassword: string) {
        const user = await this.usersService.findByEmail(email);
        if (!user) throw new BadRequestException('User not found');

        if (user.emailOtp !== otp) {
            throw new BadRequestException('Invalid verification code');
        }

        if (user.emailOtpExpiresAt && new Date() > user.emailOtpExpiresAt) {
            throw new BadRequestException('Verification code has expired');
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

    async googleLogin(idToken: string, ipCountry?: string) {
        if (!idToken) throw new BadRequestException('Missing Google ID token');

        const audiences = (process.env.GOOGLE_CLIENT_IDS || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
        if (audiences.length === 0) {
            this.logger.error('GOOGLE_CLIENT_IDS is not configured');
            throw new BadRequestException('Google sign-in is not configured');
        }

        let payload: any;
        try {
            const res = await axios.get('https://oauth2.googleapis.com/tokeninfo', { params: { id_token: idToken }, timeout: 10000 });
            payload = res.data;
        } catch (err: any) {
            this.logger.warn(`Invalid Google token: ${err.response?.data?.error_description || err.message}`);
            throw new UnauthorizedException('Invalid Google token');
        }

        const validIssuer = payload?.iss === 'accounts.google.com' || payload?.iss === 'https://accounts.google.com';
        if (!validIssuer || !audiences.includes(payload?.aud)) {
            this.logger.warn(`Google token audience/issuer mismatch: aud=${payload?.aud} iss=${payload?.iss}`);
            throw new UnauthorizedException('Invalid Google token');
        }

        const emailVerified = payload?.email_verified === true || payload?.email_verified === 'true';
        if (!payload?.email || !emailVerified) {
            throw new UnauthorizedException('Google account email is not verified');
        }

        const email = payload.email.toLowerCase();
        let user = await this.prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
        let isNew = false;

        if (!user) {
            // Google users get an unusable random password; they can set one via "Forgot Password".
            const randomPassword = await bcrypt.hash(randomBytes(32).toString('hex'), 10);
            user = await this.usersService.createUser({
                email,
                password: randomPassword,
                name: payload.name || email.split('@')[0],
                avatarUrl: payload.picture || null,
                isEmailVerified: true,
            });
            isNew = true;
        } else if (!user.isEmailVerified) {
            // Google has verified ownership of this email, so we can mark it verified.
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
            this.notificationsService.sendWelcomeEmail(user.email, user.name || 'Student').catch(err =>
                this.logger.warn(`Failed to queue welcome email in googleLogin: ${err.message}`)
            );
        }

        return this.generateAuthResponse(user);
    }

    private generateAuthResponse(user: any) {
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
                expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN as any) || '7d',
            }),
        };
    }
}
