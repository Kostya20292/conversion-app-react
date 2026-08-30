import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import type { FileFormat } from '@/common/domain/file-format';
import type { ApiErrorCode } from '@/common/errors/api-error-codes';
import { ApiException } from '@/common/errors/api-exception';
import { ConversionService } from '@/conversion/conversion.service';
import { ENGINE_TIMEOUT_MS, withEngineTimeout } from '@/conversion/engine-timeout';
import { resultStorageKey } from '@/file-store/storage-key';
import { StorageService } from '@/file-store/storage.service';
import { FilesService } from '@/files/files.service';
import { ConversionJob } from '@/jobs/conversion-job.entity';

const WORKER_POLL_INTERVAL_MS = 250;
const MAX_SHARP_CONCURRENT = 2;
const MAX_LIBREOFFICE_CONCURRENT = 1;
const SHARP_SOURCE_FORMATS: FileFormat[] = ['jpg', 'png'];
const LIBREOFFICE_SOURCE_FORMATS: FileFormat[] = ['docx', 'pdf'];

@Injectable()
export class JobWorkerService implements OnModuleDestroy {
  private readonly logger = new Logger(JobWorkerService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private ticking = false;
  private sharpRunning = 0;
  private libreOfficeRunning = 0;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ConversionJob) private readonly jobs: Repository<ConversionJob>,
    private readonly conversion: ConversionService,
    private readonly storage: StorageService,
    private readonly files: FilesService,
  ) {}

  onModuleDestroy(): void {
    this.stop();
  }

  start(): void {
    if (this.timer !== null) {
      return;
    }

    this.timer = setInterval(() => {
      void this.tick().catch((error: unknown) => {
        this.logger.error(error);
      });
    }, WORKER_POLL_INTERVAL_MS);
  }

  stop(): void {
    if (this.timer === null) {
      return;
    }

    clearInterval(this.timer);
    this.timer = null;
  }

  async processJobById(id: string): Promise<void> {
    const job = await this.claimById(id);
    if (!job) {
      return;
    }

    await this.runEngine(job);
  }

  private async tick(): Promise<void> {
    if (this.ticking) {
      return;
    }

    this.ticking = true;
    try {
      await this.fillSlots();
    } finally {
      this.ticking = false;
    }
  }

  private async fillSlots(): Promise<void> {
    while (this.sharpRunning < MAX_SHARP_CONCURRENT) {
      const job = await this.claimQueued(SHARP_SOURCE_FORMATS);
      if (!job) {
        break;
      }

      this.sharpRunning += 1;
      void this.runEngine(job).finally(() => {
        this.sharpRunning -= 1;
      });
    }

    while (this.libreOfficeRunning < MAX_LIBREOFFICE_CONCURRENT) {
      const job = await this.claimQueued(LIBREOFFICE_SOURCE_FORMATS);
      if (!job) {
        break;
      }

      this.libreOfficeRunning += 1;
      void this.runEngine(job).finally(() => {
        this.libreOfficeRunning -= 1;
      });
    }
  }

  private async claimById(id: string): Promise<ConversionJob | null> {
    return this.dataSource.transaction(async (manager) => {
      const job = await manager
        .createQueryBuilder(ConversionJob, 'j')
        .setLock('pessimistic_partial_write')
        .where('j.id = :id', { id })
        .andWhere('j.status = :status', { status: 'queued' })
        .getOne();

      return this.markProcessing(manager, job);
    });
  }

  private async claimQueued(formats: readonly FileFormat[]): Promise<ConversionJob | null> {
    return this.dataSource.transaction(async (manager) => {
      const job = await manager
        .createQueryBuilder(ConversionJob, 'j')
        .setLock('pessimistic_partial_write')
        .where('j.status = :status', { status: 'queued' })
        .andWhere('j.sourceFormat IN (:...formats)', { formats })
        .orderBy('j.createdAt', 'ASC')
        .addOrderBy('j.id', 'ASC')
        .getOne();

      return this.markProcessing(manager, job);
    });
  }

  private async markProcessing(
    manager: EntityManager,
    job: ConversionJob | null,
  ): Promise<ConversionJob | null> {
    if (!job) {
      return null;
    }

    await manager.update(ConversionJob, { id: job.id }, { status: 'processing' });
    job.status = 'processing';
    return job;
  }

  private async runEngine(job: ConversionJob): Promise<void> {
    this.logger.log(`job ${job.id} processing`);

    try {
      const source = await this.storage.read(job.sourceStorageKey);
      const convertPromise = this.conversion.convert({
        bytes: source,
        sourceFormat: job.sourceFormat,
        targetFormat: job.targetFormat,
      });
      void convertPromise.catch(() => undefined);
      const bytes = await withEngineTimeout(convertPromise, ENGINE_TIMEOUT_MS);
      const latest = await this.jobs.findOneBy({ id: job.id });
      if (latest?.status !== 'processing') {
        return;
      }

      const resultKey = resultStorageKey(job.id);
      await this.storage.write(resultKey, bytes);
      latest.status = 'completed';
      latest.resultStorageKey = resultKey;
      latest.resultSize = bytes.byteLength;
      latest.errorCode = null;
      latest.finishedAt = new Date();
      await this.jobs.save(latest);
      await this.files.saveFromCompletedJob(latest, bytes);
      await this.storage.delete(job.sourceStorageKey).catch(() => undefined);
      this.logger.log(`job ${job.id} completed`);
    } catch (error: unknown) {
      const latest = await this.jobs.findOneBy({ id: job.id });
      if (latest?.status !== 'processing') {
        return;
      }

      const code = toJobErrorCode(error);
      latest.status = 'failed';
      latest.errorCode = code;
      latest.finishedAt = new Date();
      await this.jobs.save(latest);
      this.logger.error(`job ${job.id} failed ${code}`);
    }
  }
}

const toJobErrorCode = (error: unknown): ApiErrorCode => {
  if (
    error instanceof ApiException &&
    (error.apiErrorCode === 'conversion_timeout' || error.apiErrorCode === 'conversion_failed')
  ) {
    return error.apiErrorCode;
  }

  return 'conversion_failed';
};
