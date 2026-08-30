import { randomBytes } from 'node:crypto';
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
import {
  EXPIRED_RESET_CODE_MESSAGE,
  FORGOT_PASSWORD_COOLDOWN_MS,
  INVALID_RESET_CODE_MESSAGE,
  NEUTRAL_FORGOT_MESSAGE,
  PASSWORD_RESET_TTL_MS,
} from '@/telegram/telegram.constants';
import { TelegramService } from '@/telegram/telegram.service';
import { User } from '@/users/user.entity';
import {
  toAuthUserResponse,
  type AuthUserResponse,
  type RegisterResponse,
} from './auth-user.response';
import type { ForgotPasswordDto } from './dto/forgot-password.dto';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { ResetPasswordDto } from './dto/reset-password.dto';
import { PasswordReset } from './password-reset.entity';
import { isPasswordValid } from './password-policy';
import { hashResetCodeLookup } from './reset-code-lookup';

const EMAIL_TAKEN_MESSAGE = 'This email is already registered';
const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';
const JWT_EXPIRES_IN = '30d';

export type ForgotPasswordResponse = {
  message: string;
};

const verifyPassword = async (passwordHash: string, password: string): Promise<boolean> => {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
};

const verifyResetCode = async (codeHash: string, code: string): Promise<boolean> => {
  try {
    return await verify(codeHash, code);
  } catch {
    return false;
  }
};

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(PasswordReset) private readonly resets: Repository<PasswordReset>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<AppEnv, true>,
    private readonly apiKeys: ApiKeysService,
    private readonly dataSource: DataSource,
    private readonly telegram: TelegramService,
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

  async forgotPassword(dto: ForgotPasswordDto): Promise<ForgotPasswordResponse> {
    const email = dto.email.toLowerCase();
    const user = await this.users.findOne({ where: { email } });
    const telegramId = user?.telegramId;

    if (!user || !telegramId) {
      return { message: NEUTRAL_FORGOT_MESSAGE };
    }

    const lastReset = await this.resets.findOne({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
    });
    const elapsedMs = lastReset
      ? Date.now() - lastReset.createdAt.getTime()
      : FORGOT_PASSWORD_COOLDOWN_MS;

    if (lastReset && elapsedMs < FORGOT_PASSWORD_COOLDOWN_MS) {
      const retryAfterSeconds = Math.min(
        60,
        Math.max(1, Math.ceil((FORGOT_PASSWORD_COOLDOWN_MS - elapsedMs) / 1000)),
      );
      throw new ApiException('rate_limited', undefined, undefined, retryAfterSeconds);
    }

    const code = randomBytes(16).toString('hex');
    const codeHash = await hash(code);
    await this.resets.save(
      this.resets.create({
        userId: user.id,
        codeHash,
        lookupHash: hashResetCodeLookup(code),
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
        consumedAt: null,
      }),
    );
    this.telegram.putInbox(telegramId, code);

    return { message: NEUTRAL_FORGOT_MESSAGE };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const reset = await this.resets
      .createQueryBuilder('reset')
      .addSelect('reset.codeHash')
      .where('reset.lookupHash = :lookupHash', { lookupHash: hashResetCodeLookup(dto.code) })
      .andWhere('reset.consumedAt IS NULL')
      .getOne();

    if (!reset || !(await verifyResetCode(reset.codeHash, dto.code))) {
      throw new ApiException('invalid_request', INVALID_RESET_CODE_MESSAGE);
    }

    if (reset.expiresAt.getTime() <= Date.now()) {
      throw new ApiException('gone', EXPIRED_RESET_CODE_MESSAGE);
    }

    if (!isPasswordValid(dto.new_password)) {
      throw new ApiException('invalid_request');
    }

    const account = await this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id: reset.userId })
      .getOne();

    if (!account?.telegramId) {
      throw new ApiException('invalid_request', INVALID_RESET_CODE_MESSAGE);
    }

    account.passwordHash = await hash(dto.new_password);
    account.tokenVersion += 1;
    reset.consumedAt = new Date();

    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(User).save(account);
      await manager.getRepository(PasswordReset).save(reset);
    });

    this.telegram.clearInbox(account.telegramId);
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
