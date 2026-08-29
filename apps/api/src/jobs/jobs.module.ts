import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageModule } from '@/file-store/storage.module';
import { ConversionJob } from './conversion-job.entity';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { V1JobsController } from './v1-jobs.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ConversionJob]), StorageModule],
  controllers: [JobsController, V1JobsController],
  providers: [JobsService],
  exports: [TypeOrmModule, JobsService],
})
export class JobsModule {}
