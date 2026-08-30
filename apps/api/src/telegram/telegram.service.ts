import { randomBytes } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { PasswordReset } from '@/auth/password-reset.entity';
import { ApiException } from '@/common/errors/api-exception';
import { isPostgresUniqueViolation } from '@/common/is-postgres-unique-violation';
import type { AppEnv } from '@/config/env';
import { User } from '@/users/user.entity';
import { TELEGRAM_BIND_TTL_MS } from './telegram.constants';
import { TelegramBind } from './telegram-bind.entity';

export type TelegramBindResponse = {
  bind_token: string;
  start_param: string;
};

export type TelegramInboxResponse = {
  code: string;
};

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly inbox = new Map<string, string>();

  constructor(
    @InjectRepository(TelegramBind) private readonly binds: Repository<TelegramBind>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(PasswordReset) private readonly resets: Repository<PasswordReset>,
    private readonly config: ConfigService<AppEnv, true>,
  ) {}

  async createBind(user: User): Promise<TelegramBindResponse> {
    const bindToken = randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + TELEGRAM_BIND_TTL_MS);
    const existing = await this.binds.findOne({ where: { userId: user.id } });

    if (existing) {
      existing.bindToken = bindToken;
      existing.expiresAt = expiresAt;
      await this.binds.save(existing);
    } else {
      await this.binds.save(
        this.binds.create({
          userId: user.id,
          bindToken,
          expiresAt,
        }),
      );
    }

    return { bind_token: bindToken, start_param: `bind_${bindToken}` };
  }

  async confirmBind(bindToken: string, telegramId: string): Promise<void> {
    const bind = await this.binds.findOne({ where: { bindToken } });
    if (!bind || bind.expiresAt.getTime() <= Date.now()) {
      throw new ApiException('not_found');
    }

    const account = await this.users.findOne({ where: { id: bind.userId } });
    if (!account) {
      throw new ApiException('not_found');
    }

    const taken = await this.users.findOne({ where: { telegramId } });
    if (taken && taken.id !== account.id) {
      throw new ApiException('invalid_request');
    }

    account.telegramId = telegramId;

    try {
      await this.users.save(account);
    } catch (error: unknown) {
      if (isPostgresUniqueViolation(error)) {
        throw new ApiException('invalid_request');
      }

      throw error;
    }

    await this.binds.delete({ id: bind.id });
  }

  async unbind(user: User): Promise<void> {
    const previousTelegramId = user.telegramId;
    user.telegramId = null;
    await this.users.save(user);
    await this.binds.delete({ userId: user.id });
    await this.resets.delete({ userId: user.id, consumedAt: IsNull() });

    if (previousTelegramId) {
      this.clearInbox(previousTelegramId);
    }
  }

  putInbox(telegramId: string, code: string): void {
    this.inbox.set(telegramId, code);

    if (this.config.get('NODE_ENV', { infer: true }) !== 'production') {
      this.logger.log(`Mock Telegram reset code for ${telegramId}`);
    }
  }

  getInbox(telegramId: string): TelegramInboxResponse {
    if (this.config.get('NODE_ENV', { infer: true }) === 'production') {
      throw new ApiException('not_found');
    }

    const code = this.inbox.get(telegramId);
    if (!code) {
      throw new ApiException('not_found');
    }

    return { code };
  }

  clearInbox(telegramId: string): void {
    this.inbox.delete(telegramId);
  }
}
