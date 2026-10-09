import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    register(registerDto: RegisterDto): Promise<{
        message: string;
        email: string;
    }>;
    verifyOtp(body: {
        email: string;
        otp: string;
    }): Promise<{
        user: any;
        token: string;
        refresh_token: string;
    }>;
    forgotPassword(body: {
        email: string;
    }): Promise<{
        message: string;
    }>;
    resetPassword(body: {
        email: string;
        otp: string;
        newPassword: string;
    }): Promise<{
        message: string;
    }>;
    login(loginDto: LoginDto, req: any): Promise<{
        user: any;
        token: string;
        refresh_token: string;
    }>;
    googleLogin(body: {
        idToken: string;
    }, req: any): Promise<{
        user: any;
        token: string;
        refresh_token: string;
    }>;
    changePassword(req: any, body: {
        currentPassword: string;
        newPassword: string;
    }): Promise<{
        message: string;
    }>;
}
