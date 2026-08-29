import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { hash, verify } from 'argon2';
import { Repository } from 'typeorm';
import { toAuthUserResponse, type AuthUserResponse } from '@/auth/auth-user.response';
import { isPasswordValid } from '@/auth/password-policy';
import { ApiException } from '@/common/errors/api-exception';
import { isPostgresUniqueViolation } from '@/common/is-postgres-unique-violation';
import type { PatchMeDto } from './dto/patch-me.dto';
import { User } from './user.entity';

const EMAIL_TAKEN_MESSAGE = 'This email is already taken';

const verifyPassword = async (passwordHash: string, password: string): Promise<boolean> => {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
};

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  async getById(userId: string): Promise<AuthUserResponse> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) {
      throw new ApiException('unauthorized');
    }

    return toAuthUserResponse(user);
  }

  async updateMe(user: User, dto: PatchMeDto): Promise<AuthUserResponse> {
    const account = await this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id: user.id })
      .getOne();

    if (!account) {
      throw new ApiException('unauthorized');
    }

    const nextEmail = dto.email !== undefined ? dto.email.toLowerCase() : undefined;
    const emailChanged = nextEmail !== undefined && nextEmail !== account.email;
    const newPassword = dto.new_password;
    const passwordChangeRequested = newPassword !== undefined && newPassword.length > 0;

    if (emailChanged || passwordChangeRequested) {
      if (!dto.current_password) {
        throw new ApiException('invalid_request');
      }

      const passwordMatches = await verifyPassword(account.passwordHash, dto.current_password);
      if (!passwordMatches) {
        throw new ApiException('invalid_request');
      }
    }

    if (passwordChangeRequested && newPassword) {
      if (!isPasswordValid(newPassword)) {
        throw new ApiException('invalid_request');
      }

      account.passwordHash = await hash(newPassword);
    }

    if (emailChanged && nextEmail) {
      const taken = await this.users.findOne({ where: { email: nextEmail } });
      if (taken && taken.id !== account.id) {
        throw new ApiException('invalid_request', EMAIL_TAKEN_MESSAGE);
      }

      account.email = nextEmail;
    }

    if (dto.display_name !== undefined) {
      account.displayName = dto.display_name;
    }

    if (dto.save_conversions !== undefined) {
      account.saveConversions = dto.save_conversions;
    }

    if (emailChanged || passwordChangeRequested) {
      account.tokenVersion += 1;
    }

    try {
      await this.users.save(account);
    } catch (error: unknown) {
      if (isPostgresUniqueViolation(error)) {
        throw new ApiException('invalid_request', EMAIL_TAKEN_MESSAGE);
      }

      throw error;
    }

    return toAuthUserResponse(account);
  }
}
