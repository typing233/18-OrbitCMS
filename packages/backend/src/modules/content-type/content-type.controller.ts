import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ContentTypeService } from './content-type.service';
import { CreateContentTypeDto, UpdateContentTypeDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Content Types')
@Controller('api/v1/content-types')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ContentTypeController {
  constructor(private readonly contentTypeService: ContentTypeService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List all content types' })
  async findAll() {
    return this.contentTypeService.findAll();
  }

  @Get(':idOrSlug')
  @Public()
  @ApiOperation({ summary: 'Get a content type by ID or slug' })
  async findOne(@Param('idOrSlug') idOrSlug: string) {
    return this.contentTypeService.findOne(idOrSlug);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create a new content type' })
  async create(@Body() dto: CreateContentTypeDto, @CurrentUser('tenantId') tenantId: string) {
    return this.contentTypeService.create(dto);
  }

  @Put(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update a content type' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateContentTypeDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.contentTypeService.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a content type' })
  async remove(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    await this.contentTypeService.remove(id);
    return { message: 'Content type deleted successfully' };
  }
}
