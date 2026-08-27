import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FILE_FORMATS, type FileFormat } from '@/common/domain/file-format';
import { JOB_STATUSES, type JobStatus } from '@/common/domain/job-status';
import { REQUEST_SOURCES, type RequestSource } from '@/common/domain/request-source';
import { sqlInCheck } from '@/common/domain/sql-in-check';
import type { ApiErrorCode } from '@/common/errors/api-error-codes';
import { User } from '@/users/user.entity';

@Entity({ name: 'conversion_job' })
@Index('idx_conversion_job_status', ['status', 'createdAt', 'id'])
@Index('idx_conversion_job_user_id', ['userId'])
@Check(sqlInCheck('status', JOB_STATUSES))
@Check(sqlInCheck('source_format', FILE_FORMATS))
@Check(sqlInCheck('target_format', FILE_FORMATS))
@Check(sqlInCheck('source_of_request', REQUEST_SOURCES))
@Check('"source_size" > 0')
@Check('"result_size" IS NULL OR "result_size" > 0')
export class ConversionJob {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  userId!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user!: User | null;

  @Column({ type: 'varchar', length: 16 })
  sourceFormat!: FileFormat;

  @Column({ type: 'varchar', length: 16 })
  targetFormat!: FileFormat;

  @Column({ type: 'varchar', length: 16, default: 'queued' })
  status: JobStatus = 'queued';

  @Column({ type: 'varchar', length: 8 })
  sourceOfRequest!: RequestSource;

  @Column({ type: 'varchar', length: 64, nullable: true })
  errorCode!: ApiErrorCode | null;

  @Column({ type: 'int' })
  sourceSize!: number;

  @Column({ type: 'int', nullable: true })
  resultSize!: number | null;

  @Column({ type: 'text' })
  sourceStorageKey!: string;

  @Column({ type: 'text', nullable: true })
  resultStorageKey!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  finishedAt!: Date | null;
}
