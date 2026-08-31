import { Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '@/common/current-user.decorator';
import { CookieAuthGuard } from '@/common/guards/cookie-auth.guard';
import type { User } from '@/users/user.entity';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramService, type TelegramBindResponse } from './telegram.service';

@Controller('users/me/telegram')
@UseGuards(CookieAuthGuard)
export class UsersTelegramController {
  constructor(
    private readonly telegramService: TelegramService,
    private readonly telegramBot: TelegramBotService,
  ) {}

  @Post('bind')
  @HttpCode(HttpStatus.CREATED)
  async bind(@CurrentUser() user: User): Promise<TelegramBindResponse> {
    const tokens = await this.telegramService.createBind(user);

    return {
      ...tokens,
      bot_username: this.telegramBot.getUsername(),
    };
  }

  @Post('unbind')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unbind(@CurrentUser() user: User): Promise<void> {
    await this.telegramService.unbind(user);
  }
}
