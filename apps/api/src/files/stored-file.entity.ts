import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { REQUEST_SOURCES, type RequestSource } from '@/common/domain/request-source';
import { sqlInCheck } from '@/common/domain/sql-in-check';
import { ConversionJob } from '@/jobs/conversion-job.entity';
import { User } from '@/users/user.entity';

@Entity({ name: 'stored_file' })
@Index('idx_stored_file_user_id', ['userId'])
@Index('idx_stored_file_job_id', ['jobId'])
@Check(sqlInCheck('source', REQUEST_SOURCES))
@Check('"size" > 0')
export class StoredFile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'uuid', nullable: true })
  jobId!: string | null;

  @ManyToOne(() => ConversionJob, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'job_id' })
  job!: ConversionJob | null;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text' })
  storageKey!: string;

  @Column({ type: 'int' })
  size!: number;

  @Column({ type: 'varchar', length: 8 })
  source!: RequestSource;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
