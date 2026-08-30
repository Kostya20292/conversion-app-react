import { Transform } from 'class-transformer';
import { IsEmail } from 'class-validator';

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class ForgotPasswordDto {
  @Transform(trimString)
  @IsEmail()
  email!: string;
}
