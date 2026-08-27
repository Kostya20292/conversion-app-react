import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '@/users/user.entity';

@Entity({ name: 'api_key' })
@Index('uq_api_key_prefix', ['prefix'], { unique: true })
@Index('idx_api_key_user_id', ['userId'])
@Index('uq_api_key_active_user', ['userId'], { unique: true, where: '"revoked_at" IS NULL' })
@Index('idx_api_key_active', ['prefix'], { where: '"revoked_at" IS NULL' })
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'text', select: false })
  keyHash!: string;

  @Column({ type: 'varchar', length: 32 })
  prefix!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;
}
