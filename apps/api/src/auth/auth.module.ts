import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '@/users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CookieAuthGuard } from './cookie-auth.guard';
import { PasswordReset } from './password-reset.entity';

@Module({
  imports: [UsersModule, TypeOrmModule.forFeature([PasswordReset])],
  controllers: [AuthController],
  providers: [AuthService, CookieAuthGuard],
  exports: [TypeOrmModule, CookieAuthGuard],
})
export class AuthModule {}
