import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class ConfirmTelegramDto {
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  bind_token!: string;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  telegram_id!: string;
}
