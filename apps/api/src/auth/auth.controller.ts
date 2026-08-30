import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '@/common/current-user.decorator';
import { ApiThrottlerGuard } from '@/common/guards/api-throttler.guard';
import { CookieAuthGuard } from '@/common/guards/cookie-auth.guard';
import type { User } from '@/users/user.entity';
import type { AuthUserResponse, RegisterResponse } from './auth-user.response';
import { AuthService, type ForgotPasswordResponse } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<RegisterResponse> {
    return this.authService.register(dto, response);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiThrottlerGuard)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthUserResponse> {
    return this.authService.login(dto, response);
  }

  @Get('me')
  @UseGuards(CookieAuthGuard)
  me(@CurrentUser() user: User): AuthUserResponse {
    return this.authService.getMe(user);
  }

  @Post('logout')
  @UseGuards(CookieAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentUser() user: User,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.logout(user, response);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<ForgotPasswordResponse> {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.authService.resetPassword(dto);
  }
}
