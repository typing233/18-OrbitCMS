import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentEntry } from '../../entities/content-entry.entity';
import { ContentType } from '../../entities/content-type.entity';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { ContentValidatorService } from './validation/content-validator.service';

@Module({
  imports: [TypeOrmModule.forFeature([ContentEntry, ContentType])],
  controllers: [ContentController],
  providers: [ContentService, ContentValidatorService],
})
export class ContentModule {}
