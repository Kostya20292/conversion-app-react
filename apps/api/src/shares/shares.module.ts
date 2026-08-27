import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShareLink } from './share-link.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ShareLink])],
  exports: [TypeOrmModule],
})
export class SharesModule {}
