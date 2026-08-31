import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { applyCreatedAtIdCursor, paginateRows, resolveListLimit } from '@/common/cursor-page';
import { MIME_BY_FORMAT } from '@/common/domain/file-mime';
import { ApiException } from '@/common/errors/api-exception';
import { isPostgresUniqueViolation } from '@/common/is-postgres-unique-violation';
import { StorageService } from '@/file-store/storage.service';
import { StoredFile } from '@/files/stored-file.entity';
import { ConversionJob } from '@/jobs/conversion-job.entity';
import { CreateShareDto } from './dto/create-share.dto';
import { ShareLink } from './share-link.entity';
import {
  type ShareCreatedResponse,
  type ShareDownload,
  type ShareListResponse,
  type SharePublicResponse,
  publicPayloadFromShare,
  toShareCreatedResponse,
  toShareListItem,
  toSharePublicResponse,
} from './share-response';
import { SHARE_TTL_MS, createShareToken } from './share-token';

const ISSUE_ATTEMPTS = 5;

export type ShareChannel = 'ui' | 'api';

@Injectable()
export class SharesService {
  constructor(
    @InjectRepository(ShareLink) private readonly shares: Repository<ShareLink>,
    @InjectRepository(ConversionJob) private readonly jobs: Repository<ConversionJob>,
    @InjectRepository(StoredFile) private readonly files: Repository<StoredFile>,
    private readonly storage: StorageService,
  ) {}

  async create(
    dto: CreateShareDto,
    ownerUserId: string | null,
    channel: ShareChannel,
  ): Promise<ShareCreatedResponse> {
    const hasJob = typeof dto.job_id === 'string';
    const hasFile = typeof dto.file_id === 'string';
    if (hasJob === hasFile) {
      throw new ApiException('invalid_request');
    }

    if (hasJob && dto.job_id) {
      const job = await this.requireJob(dto.job_id, ownerUserId, channel);
      return this.insertShare({
        ownerUserId,
        jobId: job.id,
        fileId: null,
      });
    }

    if (!dto.file_id) {
      throw new ApiException('invalid_request');
    }

    const file = await this.requireFile(dto.file_id, ownerUserId);
    return this.insertShare({
      ownerUserId,
      jobId: null,
      fileId: file.id,
    });
  }

  async listForOwner(
    ownerUserId: string,
    query: { cursor?: string; limit?: number } = {},
  ): Promise<ShareListResponse> {
    const limit = resolveListLimit(query.limit);
    const qb = this.shares
      .createQueryBuilder('share')
      .leftJoinAndSelect('share.job', 'job')
      .leftJoinAndSelect('share.file', 'file')
      .where('share.ownerUserId = :ownerUserId', { ownerUserId })
      .andWhere('share.revokedAt IS NULL')
      .andWhere('share.expiresAt > :now', { now: new Date() })
      .orderBy('share.createdAt', 'DESC')
      .addOrderBy('share.id', 'DESC')
      .take(limit + 1);
    applyCreatedAtIdCursor(qb, 'share', query.cursor);
    const page = paginateRows(await qb.getMany(), limit);

    return {
      shares: page.items.map(toShareListItem),
      next_cursor: page.nextCursor,
    };
  }

  async revokeForOwner(token: string, ownerUserId: string): Promise<void> {
    const share = await this.shares.findOneBy({ token });
    if (
      !share ||
      share.ownerUserId !== ownerUserId ||
      share.revokedAt !== null ||
      share.expiresAt.getTime() <= Date.now()
    ) {
      throw new ApiException('not_found');
    }

    share.revokedAt = new Date();
    await this.shares.save(share);
  }

  async getPublic(token: string): Promise<SharePublicResponse> {
    const share = await this.requirePublicShare(token);
    const payload = publicPayloadFromShare(share);
    return toSharePublicResponse(share, payload);
  }

  async downloadPublic(token: string): Promise<ShareDownload> {
    const share = await this.requirePublicShare(token);
    const payload = publicPayloadFromShare(share);

    try {
      const bytes = await this.storage.read(payload.storageKey);
      return {
        bytes,
        mimeType: MIME_BY_FORMAT[payload.format],
        filename: payload.name,
      };
    } catch {
      throw new ApiException('gone');
    }
  }

  private async requirePublicShare(token: string): Promise<ShareLink> {
    const share = await this.shares.findOne({
      where: { token },
      relations: { job: true, file: true },
    });
    if (!share) {
      throw new ApiException('not_found');
    }

    if (share.revokedAt !== null || share.expiresAt.getTime() <= Date.now()) {
      throw new ApiException('gone');
    }

    return share;
  }

  private async requireJob(
    jobId: string,
    viewerUserId: string | null,
    channel: ShareChannel,
  ): Promise<ConversionJob> {
    const job = await this.jobs.findOneBy({ id: jobId });
    if (!job) {
      throw new ApiException('not_found');
    }

    if (channel === 'api') {
      if (job.userId !== viewerUserId) {
        throw new ApiException('not_found');
      }
    } else if (job.userId !== null && job.userId !== viewerUserId) {
      throw new ApiException('not_found');
    }

    if (job.status !== 'completed' || job.resultStorageKey === null || job.resultSize === null) {
      throw new ApiException('invalid_request');
    }

    return job;
  }

  private async requireFile(fileId: string, viewerUserId: string | null): Promise<StoredFile> {
    if (viewerUserId === null) {
      throw new ApiException('not_found');
    }

    const file = await this.files.findOneBy({ id: fileId });
    if (!file || file.userId !== viewerUserId) {
      throw new ApiException('not_found');
    }

    return file;
  }

  private async insertShare(input: {
    ownerUserId: string | null;
    jobId: string | null;
    fileId: string | null;
  }): Promise<ShareCreatedResponse> {
    const expiresAt = new Date(Date.now() + SHARE_TTL_MS);

    for (let attempt = 0; attempt < ISSUE_ATTEMPTS; attempt += 1) {
      const row = this.shares.create({
        token: createShareToken(),
        ownerUserId: input.ownerUserId,
        jobId: input.jobId,
        fileId: input.fileId,
        expiresAt,
        revokedAt: null,
      });

      try {
        const saved = await this.shares.save(row);
        return toShareCreatedResponse(saved);
      } catch (error: unknown) {
        if (!isPostgresUniqueViolation(error)) {
          throw error;
        }
      }
    }

    throw new ApiException('internal_error');
  }
}
