import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentType } from '../../entities/content-type.entity';
import { FieldDefinition } from '../../entities/field-definition.entity';
import { ContentTypeController } from './content-type.controller';
import { ContentTypeService } from './content-type.service';

@Module({
  imports: [TypeOrmModule.forFeature([ContentType, FieldDefinition])],
  controllers: [ContentTypeController],
  providers: [ContentTypeService],
  exports: [ContentTypeService],
})
export class ContentTypeModule {}
