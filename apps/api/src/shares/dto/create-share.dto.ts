import { IsOptional, IsUUID } from 'class-validator';

export class CreateShareDto {
  @IsOptional()
  @IsUUID()
  job_id?: string;

  @IsOptional()
  @IsUUID()
  file_id?: string;
}
