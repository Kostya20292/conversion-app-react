import { Body, Controller, Patch, UseGuards } from '@nestjs/common';
import type { AuthUserResponse } from '@/auth/auth-user.response';
import { CurrentUser } from '@/common/current-user.decorator';
import { CookieAuthGuard } from '@/common/guards/cookie-auth.guard';
import { PatchMeDto } from './dto/patch-me.dto';
import { User } from './user.entity';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  @UseGuards(CookieAuthGuard)
  async patchMe(@CurrentUser() user: User, @Body() dto: PatchMeDto): Promise<AuthUserResponse> {
    return this.usersService.updateMe(user, dto);
  }
}
