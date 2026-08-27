import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversionJob } from './conversion-job.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ConversionJob])],
  exports: [TypeOrmModule],
})
export class JobsModule {}
