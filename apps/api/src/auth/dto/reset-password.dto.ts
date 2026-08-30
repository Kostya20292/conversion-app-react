import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class ResetPasswordDto {
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  new_password!: string;
}
