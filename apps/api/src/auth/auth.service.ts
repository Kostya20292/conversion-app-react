import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { hash, verify } from 'argon2';
import type { Response } from 'express';
import { QueryFailedError, Repository } from 'typeorm';
import { AUTH_COOKIE_NAME, createAuthCookieOptions } from '@/common/auth-cookie';
import { ApiException } from '@/common/errors/api-exception';
import type { AppEnv } from '@/config/env';
import { User } from '@/users/user.entity';
import { toAuthUserResponse, type AuthUserResponse } from './auth-user.response';
import { isPasswordValid } from './password-policy';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';

const EMAIL_TAKEN_MESSAGE = 'This email is already registered';
const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';
const JWT_EXPIRES_IN = '30d';

const isPostgresUniqueViolation = (error: unknown): boolean => {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError: unknown = error.driverError;
  if (typeof driverError !== 'object' || driverError === null || !('code' in driverError)) {
    return false;
  }

  return driverError.code === '23505';
};

const verifyPassword = async (passwordHash: string, password: string): Promise<boolean> => {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
};

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<AppEnv, true>,
  ) {}

  async register(dto: RegisterDto, response: Response): Promise<AuthUserResponse> {
    if (!isPasswordValid(dto.password)) {
      throw new ApiException('invalid_request');
    }

    const email = dto.email.toLowerCase();
    const existing = await this.users.findOne({ where: { email } });
    if (existing) {
      throw new ApiException('invalid_request', EMAIL_TAKEN_MESSAGE);
    }

    const user = this.users.create({
      email,
      passwordHash: await hash(dto.password),
      displayName: dto.display_name,
      telegramId: null,
      saveConversions: false,
      tokenVersion: 0,
    });

    try {
      await this.users.save(user);
    } catch (error: unknown) {
      if (isPostgresUniqueViolation(error)) {
        throw new ApiException('invalid_request', EMAIL_TAKEN_MESSAGE);
      }

      throw error;
    }

    await this.attachSessionCookie(response, user, false);
    return toAuthUserResponse(user);
  }

  async login(dto: LoginDto, response: Response): Promise<AuthUserResponse> {
    const email = dto.email.toLowerCase();
    const user = await this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();

    const passwordMatches = user ? await verifyPassword(user.passwordHash, dto.password) : false;
    if (!user || !passwordMatches) {
      throw new ApiException('unauthorized', INVALID_CREDENTIALS_MESSAGE);
    }

    await this.attachSessionCookie(response, user, dto.remember_me === true);
    return toAuthUserResponse(user);
  }

  getMe(user: User): AuthUserResponse {
    return toAuthUserResponse(user);
  }

  async logout(user: User, response: Response): Promise<void> {
    await this.users.increment({ id: user.id }, 'tokenVersion', 1);
    this.clearSessionCookie(response);
  }

  private isProduction(): boolean {
    return this.config.get('NODE_ENV', { infer: true }) === 'production';
  }

  private async attachSessionCookie(
    response: Response,
    user: User,
    rememberMe: boolean,
  ): Promise<void> {
    const token = await this.jwtService.signAsync(
      { sub: user.id, tokenVersion: user.tokenVersion },
      { expiresIn: JWT_EXPIRES_IN },
    );

    response.cookie(
      AUTH_COOKIE_NAME,
      token,
      createAuthCookieOptions({ rememberMe, isProduction: this.isProduction() }),
    );
  }

  private clearSessionCookie(response: Response): void {
    response.cookie(AUTH_COOKIE_NAME, '', {
      ...createAuthCookieOptions({ rememberMe: false, isProduction: this.isProduction() }),
      maxAge: 0,
    });
  }
}
