import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { hash, verify } from 'argon2';
import type { Response } from 'express';
import { DataSource, Repository } from 'typeorm';
import { ApiKeysService } from '@/api-keys/api-keys.service';
import { AUTH_COOKIE_NAME, createAuthCookieOptions } from '@/common/auth-cookie';
import { ApiException } from '@/common/errors/api-exception';
import { isPostgresUniqueViolation } from '@/common/is-postgres-unique-violation';
import type { AppEnv } from '@/config/env';
import { User } from '@/users/user.entity';
import {
  toAuthUserResponse,
  type AuthUserResponse,
  type RegisterResponse,
} from './auth-user.response';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import { isPasswordValid } from './password-policy';

const EMAIL_TAKEN_MESSAGE = 'This email is already registered';
const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';
const JWT_EXPIRES_IN = '30d';

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
    private readonly apiKeys: ApiKeysService,
    private readonly dataSource: DataSource,
  ) {}

  async register(dto: RegisterDto, response: Response): Promise<RegisterResponse> {
    if (!isPasswordValid(dto.password)) {
      throw new ApiException('invalid_request');
    }

    const email = dto.email.toLowerCase();
    const existing = await this.users.findOne({ where: { email } });
    if (existing) {
      throw new ApiException('invalid_request', EMAIL_TAKEN_MESSAGE);
    }

    const passwordHash = await hash(dto.password);

    try {
      const { user, apiKey } = await this.dataSource.transaction(async (manager) => {
        const users = manager.getRepository(User);
        const created = users.create({
          email,
          passwordHash,
          displayName: dto.display_name,
          telegramId: null,
          saveConversions: false,
          tokenVersion: 0,
        });
        const saved = await users.save(created);
        const issued = await this.apiKeys.createForUser(saved.id, manager);

        return { user: saved, apiKey: issued.plaintext };
      });

      await this.attachSessionCookie(response, user, false);
      return { ...toAuthUserResponse(user), api_key: apiKey };
    } catch (error: unknown) {
      if (isPostgresUniqueViolation(error)) {
        throw new ApiException('invalid_request', EMAIL_TAKEN_MESSAGE);
      }

      throw error;
    }
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
