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
import { StoredFile } from '@/files/stored-file.entity';
import { ConversionJob } from '@/jobs/conversion-job.entity';
import { User } from '@/users/user.entity';

@Entity({ name: 'share_link' })
@Index('uq_share_link_token', ['token'], { unique: true })
@Index('idx_share_link_expires_at', ['expiresAt'])
@Index('idx_share_link_owner_user_id', ['ownerUserId'])
@Index('idx_share_link_owner_created_id', ['ownerUserId', 'createdAt', 'id'], {
  where: '"revoked_at" IS NULL',
})
@Index('idx_share_link_job_id', ['jobId'])
@Index('idx_share_link_file_id', ['fileId'])
@Index('idx_share_link_active', ['token'], { where: '"revoked_at" IS NULL' })
@Check(
  '"revoked_at" IS NOT NULL OR (("job_id" IS NOT NULL)::int + ("file_id" IS NOT NULL)::int) = 1',
)
export class ShareLink {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  token!: string;

  @Column({ type: 'uuid', nullable: true })
  ownerUserId!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'owner_user_id' })
  ownerUser!: User | null;

  @Column({ type: 'uuid', nullable: true })
  jobId!: string | null;

  @ManyToOne(() => ConversionJob, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job!: ConversionJob | null;

  @Column({ type: 'uuid', nullable: true })
  fileId!: string | null;

  @ManyToOne(() => StoredFile, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'file_id' })
  file!: StoredFile | null;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
