import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ContentTypeService } from './content-type.service';
import { CreateContentTypeDto, UpdateContentTypeDto } from './dto';

@ApiTags('Content Types')
@Controller('api/v1/content-types')
export class ContentTypeController {
  constructor(private readonly contentTypeService: ContentTypeService) {}

  @Get()
  @ApiOperation({ summary: 'List all content types' })
  async findAll() {
    return this.contentTypeService.findAll();
  }

  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Get a content type by ID or slug' })
  async findOne(@Param('idOrSlug') idOrSlug: string) {
    return this.contentTypeService.findOne(idOrSlug);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new content type' })
  async create(@Body() dto: CreateContentTypeDto) {
    return this.contentTypeService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a content type' })
  async update(@Param('id') id: string, @Body() dto: UpdateContentTypeDto) {
    return this.contentTypeService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a content type' })
  async remove(@Param('id') id: string) {
    await this.contentTypeService.remove(id);
    return { message: 'Content type deleted successfully' };
  }
}
