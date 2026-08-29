import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { V1MeController } from './v1-me.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController, V1MeController],
  providers: [UsersService],
  exports: [TypeOrmModule, UsersService],
})
export class UsersModule {}
