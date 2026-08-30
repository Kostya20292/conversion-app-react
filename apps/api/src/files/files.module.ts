import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageModule } from '@/file-store/storage.module';
import { ShareLink } from '@/shares/share-link.entity';
import { User } from '@/users/user.entity';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { StoredFile } from './stored-file.entity';
import { V1FilesController } from './v1-files.controller';

@Module({
  imports: [TypeOrmModule.forFeature([StoredFile, ShareLink, User]), StorageModule],
  controllers: [FilesController, V1FilesController],
  providers: [FilesService],
  exports: [TypeOrmModule, FilesService],
})
export class FilesModule {}
