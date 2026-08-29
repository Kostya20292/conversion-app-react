import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { type ApiKeyAuthenticator, type AuthenticatedApiKey } from '@/common/api-key.authenticator';
import { ApiKey } from './api-key.entity';
import { getApiKeyPrefix, verifyApiKey } from './api-key-secret';

@Injectable()
export class DbApiKeyAuthenticator implements ApiKeyAuthenticator {
  constructor(@InjectRepository(ApiKey) private readonly apiKeys: Repository<ApiKey>) {}

  async authenticate(plaintextKey: string): Promise<AuthenticatedApiKey | null> {
    const prefix = getApiKeyPrefix(plaintextKey);
    if (prefix.length === 0) {
      return null;
    }

    const stored = await this.apiKeys
      .createQueryBuilder('key')
      .addSelect('key.keyHash')
      .where('key.prefix = :prefix', { prefix })
      .andWhere('key.revokedAt IS NULL')
      .getOne();

    if (!stored) {
      return null;
    }

    const matches = await verifyApiKey(stored.keyHash, plaintextKey);
    if (!matches) {
      return null;
    }

    return { id: stored.id, userId: stored.userId };
  }
}
