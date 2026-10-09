import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
export declare class AuthService {
    private usersService;
    private jwtService;
    private prisma;
    private notificationsService;
    private readonly logger;
    constructor(usersService: UsersService, jwtService: JwtService, prisma: PrismaService, notificationsService: NotificationsService);
    register(registerDto: RegisterDto): Promise<{
        message: string;
        email: string;
    }>;
    verifyOtp(email: string, otp: string): Promise<{
        user: any;
        token: string;
        refresh_token: string;
    }>;
    login(loginDto: LoginDto, ipCountry?: string): Promise<{
        user: any;
        token: string;
        refresh_token: string;
    }>;
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{
        message: string;
    }>;
    forgotPassword(email: string): Promise<{
        message: string;
    }>;
    resetPassword(email: string, otp: string, newPassword: string): Promise<{
        message: string;
    }>;
    googleLogin(idToken: string, ipCountry?: string): Promise<{
        user: any;
        token: string;
        refresh_token: string;
    }>;
    private generateAuthResponse;
}
