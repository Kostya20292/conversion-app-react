import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PasswordReset } from './password-reset.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PasswordReset])],
  exports: [TypeOrmModule],
})
export class AuthModule {}
