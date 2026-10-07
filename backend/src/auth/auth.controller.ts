import { Controller, Post, Patch, Body, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('register')
    async register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }

    @Post('verify-otp')
    async verifyOtp(@Body() body: { email: string; otp: string }) {
        return this.authService.verifyOtp(body.email, body.otp);
    }

    @Post('forgot-password')
    async forgotPassword(@Body() body: { email: string }) {
        return this.authService.forgotPassword(body.email);
    }

    @Post('reset-password')
    async resetPassword(@Body() body: { email: string; otp: string; newPassword: string }) {
        return this.authService.resetPassword(body.email, body.otp, body.newPassword);
    }

    @HttpCode(HttpStatus.OK)
    @Post('login')
    async login(@Body() loginDto: LoginDto, @Request() req: any) {
        const ipCountry = req.headers['cf-ipcountry'] || req.headers['x-vercel-ip-country'] || null;
        return this.authService.login(loginDto, ipCountry);
    }

    @HttpCode(HttpStatus.OK)
    @Post('google')
    async googleLogin(@Body() body: { idToken: string }, @Request() req: any) {
        const ipCountry = req.headers['cf-ipcountry'] || req.headers['x-vercel-ip-country'] || null;
        return this.authService.googleLogin(body.idToken, ipCountry);
    }

    @UseGuards(JwtAuthGuard)
    @Patch('password')
    async changePassword(
        @Request() req: any,
        @Body() body: { currentPassword: string; newPassword: string }
    ) {
        return this.authService.changePassword(req.user.userId, body.currentPassword, body.newPassword);
    }
}
