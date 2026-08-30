import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversionModule } from '@/conversion/conversion.module';
import { StorageModule } from '@/file-store/storage.module';
import { FilesModule } from '@/files/files.module';
import { ConversionJob } from '@/jobs/conversion-job.entity';
import { JobWorkerService } from './job-worker.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ConversionJob]),
    ConversionModule,
    StorageModule,
    FilesModule,
  ],
  providers: [JobWorkerService],
  exports: [JobWorkerService],
})
export class WorkerModule {}
