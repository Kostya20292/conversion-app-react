import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ConfirmTelegramDto } from './dto/confirm-telegram.dto';
import { TelegramService, type TelegramInboxResponse } from './telegram.service';

@Controller('telegram/mock')
export class TelegramMockController {
  constructor(private readonly telegramService: TelegramService) {}

  @Post('confirm')
  @HttpCode(HttpStatus.NO_CONTENT)
  async confirm(@Body() dto: ConfirmTelegramDto): Promise<void> {
    await this.telegramService.confirmBind(dto.bind_token, dto.telegram_id);
  }

  @Get('inbox/:telegramId')
  async inbox(@Param('telegramId') telegramId: string): Promise<TelegramInboxResponse> {
    return this.telegramService.getInbox(telegramId);
  }
}
