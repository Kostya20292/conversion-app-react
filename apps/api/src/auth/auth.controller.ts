import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import type { User } from '@/users/user.entity';
import { AuthService } from './auth.service';
import type { AuthUserResponse } from './auth-user.response';
import { CookieAuthGuard } from './cookie-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthUserResponse> {
    return this.authService.register(dto, response);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
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
}
