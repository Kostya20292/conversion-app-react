import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type ValueTransformer,
} from 'typeorm';

const lowercaseEmail: ValueTransformer = {
  to: (value: unknown): unknown => {
    if (typeof value !== 'string') {
      return value;
    }

    return value.toLowerCase();
  },
  from: (value: unknown): unknown => value,
};

@Entity({ name: 'user' })
@Index('uq_user_email', ['email'], { unique: true })
@Index('uq_user_telegram_id', ['telegramId'], { unique: true, where: '"telegram_id" IS NOT NULL' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 320, transformer: lowercaseEmail })
  email!: string;

  @Column({ type: 'text', select: false })
  passwordHash!: string;

  @Column({ type: 'text' })
  displayName!: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  telegramId!: string | null;

  @Column({ type: 'boolean', default: false })
  saveConversions = false;

  @Column({ type: 'int', default: 0 })
  tokenVersion = 0;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
