import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { StorageService } from '@/file-store/storage.service';
import { StoredFile } from '@/files/stored-file.entity';
import { ConversionJob } from '@/jobs/conversion-job.entity';
import { RESULT_TTL_MS } from '@/jobs/jobs.service';

export const UPLOAD_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class CleanupService {
  constructor(
    @InjectRepository(ConversionJob) private readonly jobs: Repository<ConversionJob>,
    @InjectRepository(StoredFile) private readonly files: Repository<StoredFile>,
    private readonly storage: StorageService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR, {
    waitForCompletion: true,
    disabled: process.env.NODE_ENV === 'test',
  })
  async handleCron(): Promise<void> {
    await this.run();
  }

  async run(): Promise<void> {
    await this.deleteStaleUploads();
    await this.deleteStaleResults();
    await this.deleteOrphans();
  }

  private async deleteStaleUploads(): Promise<void> {
    const cutoff = new Date(Date.now() - UPLOAD_TTL_MS);
    const stale = await this.jobs.find({
      select: { id: true, sourceStorageKey: true },
      where: { createdAt: LessThan(cutoff) },
    });

    for (const job of stale) {
      await this.deleteKey(job.sourceStorageKey);
    }
  }

  private async deleteStaleResults(): Promise<void> {
    const cutoff = new Date(Date.now() - RESULT_TTL_MS);
    const stale = await this.jobs.find({
      select: { id: true, resultStorageKey: true },
      where: { status: 'completed', finishedAt: LessThan(cutoff) },
    });

    for (const job of stale) {
      if (job.resultStorageKey === null || !job.resultStorageKey.startsWith('results/')) {
        continue;
      }

      await this.deleteKey(job.resultStorageKey);
    }
  }

  private async deleteOrphans(): Promise<void> {
    const [jobs, files, diskKeys] = await Promise.all([
      this.jobs.find({ select: { id: true, sourceStorageKey: true, resultStorageKey: true } }),
      this.files.find({ select: { id: true, storageKey: true } }),
      this.storage.listKeys(),
    ]);

    const liveKeys = new Set<string>();
    for (const job of jobs) {
      liveKeys.add(job.sourceStorageKey);
      if (job.resultStorageKey !== null) {
        liveKeys.add(job.resultStorageKey);
      }
    }

    for (const file of files) {
      liveKeys.add(file.storageKey);
    }

    for (const key of diskKeys) {
      if (liveKeys.has(key)) {
        continue;
      }

      await this.deleteKey(key);
    }
  }

  private async deleteKey(key: string): Promise<void> {
    await this.storage.delete(key).catch(() => undefined);
  }
}
