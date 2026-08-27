import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramBind } from './telegram-bind.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TelegramBind])],
  exports: [TypeOrmModule],
})
export class TelegramModule {}
