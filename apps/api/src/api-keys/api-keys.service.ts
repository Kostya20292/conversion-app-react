import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository, type EntityManager } from 'typeorm';
import { ApiException } from '@/common/errors/api-exception';
import { isPostgresUniqueViolation } from '@/common/is-postgres-unique-violation';
import { ApiKey } from './api-key.entity';
import { createApiKey, maskFromPrefix, type IssuedApiKey } from './api-key-secret';

const ISSUE_ATTEMPTS = 5;

export type ApiKeyListItem = {
  prefix: string;
  masked_key: string;
  created_at: string;
};

export type ApiKeyListResponse = {
  keys: ApiKeyListItem[];
};

export type ApiKeyPlaintextResponse = {
  api_key: string;
};

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey) private readonly apiKeys: Repository<ApiKey>,
    private readonly dataSource: DataSource,
  ) {}

  async createForUser(userId: string, manager?: EntityManager): Promise<IssuedApiKey> {
    const repo = manager ? manager.getRepository(ApiKey) : this.apiKeys;

    for (let attempt = 0; attempt < ISSUE_ATTEMPTS; attempt += 1) {
      const issued = await createApiKey();
      const row = repo.create({
        userId,
        keyHash: issued.keyHash,
        prefix: issued.prefix,
        revokedAt: null,
      });
      const savepoint = `api_key_issue_${attempt}`;

      try {
        if (manager) {
          await manager.query(`SAVEPOINT ${savepoint}`);
        }

        await repo.save(row);

        if (manager) {
          await manager.query(`RELEASE SAVEPOINT ${savepoint}`);
        }

        return issued;
      } catch (error: unknown) {
        if (manager) {
          await manager.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
        }

        if (!isPostgresUniqueViolation(error)) {
          throw error;
        }
      }
    }

    throw new ApiException('internal_error');
  }

  async listActiveForUser(userId: string): Promise<ApiKeyListResponse> {
    const keys = await this.apiKeys.find({
      where: { userId, revokedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });

    return {
      keys: keys.map((key) => ({
        prefix: key.prefix,
        masked_key: maskFromPrefix(key.prefix),
        created_at: key.createdAt.toISOString(),
      })),
    };
  }

  async reissueForUser(userId: string): Promise<ApiKeyPlaintextResponse> {
    const issued = await this.dataSource.transaction(async (manager) => {
      await manager.update(ApiKey, { userId, revokedAt: IsNull() }, { revokedAt: new Date() });
      return this.createForUser(userId, manager);
    });

    return { api_key: issued.plaintext };
  }
}
