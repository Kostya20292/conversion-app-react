import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot, type CommandContext, type Context } from 'grammy';
import type { AppEnv } from '@/config/env';
import { parseBindStartParam } from './bind-start-param';
import { TelegramService } from './telegram.service';

const HELP_MESSAGE =
  'Этот бот Convertly привязывает аккаунт и присылает код для сброса пароля. Откройте ссылку из личного кабинета.';
const BIND_OK_MESSAGE =
  'Telegram привязан к аккаунту Convertly. Можно вернуться на сайт — статус обновится сам.';
const BIND_FAIL_MESSAGE =
  'Не удалось привязать аккаунт. Запросите новую ссылку в личном кабинете Convertly.';

const resetCodeMessage = (code: string): string =>
  `Код для сброса пароля Convertly:\n${code}\n\nДействует 15 минут. Если вы не запрашивали сброс, проигнорируйте это сообщение.`;

@Injectable()
export class TelegramBotService implements OnModuleDestroy {
  private readonly logger = new Logger(TelegramBotService.name);
  private bot: Bot | null = null;
  private username: string | null = null;

  constructor(
    private readonly config: ConfigService<AppEnv, true>,
    private readonly telegram: TelegramService,
  ) {}

  getUsername(): string | null {
    return this.username;
  }

  async start(): Promise<void> {
    if (this.bot !== null) {
      return;
    }

    if (this.config.get('NODE_ENV', { infer: true }) === 'test') {
      return;
    }

    const token = this.config.get('TELEGRAM_BOT_TOKEN', { infer: true });
    if (token.length === 0) {
      return;
    }

    const bot = new Bot(token);
    bot.command('start', (ctx) => this.handleStart(ctx));
    this.bot = bot;

    try {
      await bot.init();
      this.username = bot.botInfo.username ?? null;
      void bot
        .start({
          drop_pending_updates: true,
          allowed_updates: ['message'],
        })
        .catch(() => {
          this.logger.error('Telegram polling stopped unexpectedly');
        });
      this.logger.log(
        this.username === null ? 'Telegram bot polling' : `Telegram bot @${this.username} polling`,
      );
    } catch {
      this.bot = null;
      this.username = null;
      this.logger.error('Telegram bot failed to start');
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.stop();
  }

  async stop(): Promise<void> {
    const bot = this.bot;
    if (bot === null) {
      return;
    }

    this.bot = null;
    this.username = null;

    try {
      await bot.stop();
    } catch {
      this.logger.error('Telegram bot failed to stop');
    }
  }

  async sendResetCode(telegramId: string, code: string): Promise<void> {
    const bot = this.bot;
    if (bot === null) {
      return;
    }

    try {
      await bot.api.sendMessage(telegramId, resetCodeMessage(code));
    } catch {
      this.logger.error('Failed to send Telegram reset code');
    }
  }

  private async handleStart(ctx: CommandContext<Context>): Promise<void> {
    const fromId = ctx.from?.id;
    if (fromId === undefined) {
      return;
    }

    const payload = typeof ctx.match === 'string' ? ctx.match : '';
    const bindToken = parseBindStartParam(payload);
    if (bindToken === null) {
      await this.replySafe(ctx, HELP_MESSAGE);
      return;
    }

    try {
      await this.telegram.confirmBind(bindToken, String(fromId));
      await this.replySafe(ctx, BIND_OK_MESSAGE);
    } catch {
      await this.replySafe(ctx, BIND_FAIL_MESSAGE);
    }
  }

  private readonly replySafe = async (
    ctx: CommandContext<Context>,
    text: string,
  ): Promise<void> => {
    try {
      await ctx.reply(text);
    } catch {
      this.logger.error('Failed to reply in Telegram');
    }
  };
}
