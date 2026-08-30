import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PasswordReset } from '@/auth/password-reset.entity';
import { User } from '@/users/user.entity';
import { TelegramBind } from './telegram-bind.entity';
import { TelegramMockController } from './telegram-mock.controller';
import { TelegramService } from './telegram.service';
import { UsersTelegramController } from './users-telegram.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TelegramBind, User, PasswordReset])],
  controllers: [UsersTelegramController, TelegramMockController],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
