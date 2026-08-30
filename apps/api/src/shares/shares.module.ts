import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageModule } from '@/file-store/storage.module';
import { StoredFile } from '@/files/stored-file.entity';
import { ConversionJob } from '@/jobs/conversion-job.entity';
import { PublicSharesController } from './public-shares.controller';
import { ShareLink } from './share-link.entity';
import { SharesController } from './shares.controller';
import { SharesService } from './shares.service';
import { V1SharesController } from './v1-shares.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ShareLink, ConversionJob, StoredFile]), StorageModule],
  controllers: [SharesController, V1SharesController, PublicSharesController],
  providers: [SharesService],
  exports: [TypeOrmModule, SharesService],
})
export class SharesModule {}
