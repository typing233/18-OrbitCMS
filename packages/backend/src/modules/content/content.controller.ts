import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ContentService } from './content.service';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Content')
@Controller('api/v1/content/:contentTypeSlug')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get()
  @ApiOperation({ summary: 'List entries for a content type' })
  async findAll(
    @Param('contentTypeSlug') slug: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.contentService.findAll(slug, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single entry' })
  async findOne(
    @Param('contentTypeSlug') slug: string,
    @Param('id') id: string,
  ) {
    return this.contentService.findOne(slug, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new entry' })
  async create(
    @Param('contentTypeSlug') slug: string,
    @Body() body: Record<string, any>,
  ) {
    return this.contentService.create(slug, body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an entry' })
  async update(
    @Param('contentTypeSlug') slug: string,
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.contentService.update(slug, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an entry' })
  async remove(
    @Param('contentTypeSlug') slug: string,
    @Param('id') id: string,
  ) {
    await this.contentService.remove(slug, id);
    return { message: 'Entry deleted successfully' };
  }
}
