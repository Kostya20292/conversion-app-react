import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class PatchMeDto {
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  display_name?: string;

  @IsOptional()
  @Transform(trimString)
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  current_password?: string;

  @IsOptional()
  @IsString()
  new_password?: string;

  @IsOptional()
  @IsBoolean()
  save_conversions?: boolean;
}
