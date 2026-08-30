import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageModule } from '@/file-store/storage.module';
import { StoredFile } from '@/files/stored-file.entity';
import { ConversionJob } from '@/jobs/conversion-job.entity';
import { CleanupService } from './cleanup.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([ConversionJob, StoredFile]),
    StorageModule,
  ],
  providers: [CleanupService],
  exports: [CleanupService],
})
export class CleanupModule {}
