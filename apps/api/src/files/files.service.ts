import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { applyCreatedAtIdCursor, paginateRows, resolveListLimit } from '@/common/cursor-page';
import { MIME_BY_FORMAT } from '@/common/domain/file-mime';
import { ApiException } from '@/common/errors/api-exception';
import { resultFileName } from '@/common/result-file-name';
import { SignedDownloadTokenService } from '@/common/signed-download-token';
import { profileStorageKey } from '@/file-store/storage-key';
import { StorageService } from '@/file-store/storage.service';
import type { ConversionJob } from '@/jobs/conversion-job.entity';
import { ShareLink } from '@/shares/share-link.entity';
import { User } from '@/users/user.entity';
import {
  type FileDownload,
  type FileDownloadChannel,
  type FileListResponse,
  formatFromStoredName,
  toFileListItem,
  uiFileDownloadUrl,
  v1FileDownloadUrl,
} from './file-response';
import { StoredFile } from './stored-file.entity';

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(StoredFile) private readonly files: Repository<StoredFile>,
    @InjectRepository(ShareLink) private readonly shares: Repository<ShareLink>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly storage: StorageService,
    private readonly downloadTokens: SignedDownloadTokenService,
  ) {}

  async saveFromCompletedJob(job: ConversionJob, bytes: Uint8Array): Promise<void> {
    if (job.userId === null) {
      return;
    }

    const user = await this.users.findOneBy({ id: job.userId });
    if (!user?.saveConversions) {
      return;
    }

    const id = randomUUID();
    const storageKey = profileStorageKey(job.userId, id);
    await this.storage.write(storageKey, bytes);

    try {
      await this.files.save(
        this.files.create({
          id,
          userId: job.userId,
          jobId: job.id,
          name: resultFileName(job.sourceFileName, job.targetFormat),
          storageKey,
          size: bytes.byteLength,
          source: job.sourceOfRequest,
        }),
      );
    } catch (error: unknown) {
      await this.storage.delete(storageKey).catch(() => undefined);
      throw error;
    }
  }

  async isSavedForJob(jobId: string): Promise<boolean> {
    return this.files.existsBy({ jobId });
  }

  async listForOwner(
    userId: string,
    channel: FileDownloadChannel,
    query: { cursor?: string; limit?: number } = {},
  ): Promise<FileListResponse> {
    const limit = resolveListLimit(query.limit);
    const qb = this.files
      .createQueryBuilder('file')
      .where('file.userId = :userId', { userId })
      .orderBy('file.createdAt', 'DESC')
      .addOrderBy('file.id', 'DESC')
      .take(limit + 1);
    applyCreatedAtIdCursor(qb, 'file', query.cursor);
    const page = paginateRows(await qb.getMany(), limit);

    return {
      files: page.items.map((file) => toFileListItem(file, this.downloadUrlFor(file.id, channel))),
      next_cursor: page.nextCursor,
    };
  }

  async downloadForUi(
    id: string,
    viewerUserId: string | null,
    token: string | undefined,
  ): Promise<FileDownload> {
    const file = await this.requireFile(id);
    this.assertUiDownloadAccess(file, viewerUserId, token);
    return this.readFile(file);
  }

  async downloadForApi(id: string, ownerUserId: string): Promise<FileDownload> {
    const file = await this.requireOwnedFile(id, ownerUserId);
    return this.readFile(file);
  }

  async deleteForOwner(id: string, ownerUserId: string): Promise<void> {
    const file = await this.requireOwnedFile(id, ownerUserId);
    await this.shares.update({ fileId: file.id, revokedAt: IsNull() }, { revokedAt: new Date() });
    await this.storage.delete(file.storageKey).catch(() => undefined);
    await this.files.delete({ id: file.id });
  }

  private downloadUrlFor(fileId: string, channel: FileDownloadChannel): string {
    if (channel === 'api') {
      return v1FileDownloadUrl(fileId);
    }

    const issued = this.downloadTokens.issueForFile(fileId);
    return uiFileDownloadUrl(fileId, issued.token);
  }

  private assertUiDownloadAccess(
    file: StoredFile,
    viewerUserId: string | null,
    token: string | undefined,
  ): void {
    if (file.userId === viewerUserId) {
      return;
    }

    if (token === undefined || token.length === 0) {
      throw new ApiException('not_found');
    }

    this.downloadTokens.verifyFile(token, file.id);
  }

  private async requireFile(id: string): Promise<StoredFile> {
    const file = await this.files.findOneBy({ id });
    if (!file) {
      throw new ApiException('not_found');
    }

    return file;
  }

  private async requireOwnedFile(id: string, ownerUserId: string): Promise<StoredFile> {
    const file = await this.requireFile(id);
    if (file.userId !== ownerUserId) {
      throw new ApiException('not_found');
    }

    return file;
  }

  private async readFile(file: StoredFile): Promise<FileDownload> {
    try {
      const bytes = await this.storage.read(file.storageKey);
      const format = formatFromStoredName(file.name);
      return {
        bytes,
        mimeType: MIME_BY_FORMAT[format],
        filename: file.name,
      };
    } catch (error: unknown) {
      if (error instanceof ApiException) {
        throw error;
      }

      throw new ApiException('gone');
    }
  }
}
