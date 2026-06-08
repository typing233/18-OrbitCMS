import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ContentTypeService } from './modules/content-type/content-type.service';
import { FieldType } from './common/enums/field-type.enum';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  app.useStaticAssets(uploadDir, { prefix: '/uploads/' });

  app.enableCors({
    origin: ['http://localhost:5173'],
    credentials: true,
  });

  app.useGlobalFilters(new AllExceptionsFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const configV1 = new DocumentBuilder()
    .setTitle('OrbitCMS API')
    .setDescription('Headless CMS with dynamic content type management, RBAC, multi-tenant isolation')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'x-tenant-id', in: 'header' }, 'tenant-id')
    .addTag('Auth', 'Authentication and authorization')
    .addTag('Users', 'User management')
    .addTag('Roles', 'Role and permission management')
    .addTag('Content Types', 'Content type schema management')
    .addTag('Content', 'Content entry CRUD with versioning')
    .addTag('Media', 'Media asset management with chunked upload')
    .addTag('Audit', 'Audit log access')
    .addTag('Health', 'System health checks')
    .build();

  const documentV1 = SwaggerModule.createDocument(app, configV1);

  // Generate dynamic schemas from content types
  try {
    const contentTypeService = app.get(ContentTypeService);
    const contentTypes = await contentTypeService.findAll();
    documentV1.components = documentV1.components || {};
    documentV1.components.schemas = documentV1.components.schemas || {};

    for (const ct of contentTypes) {
      const schemaName = `ContentEntry_${ct.slug.replace(/-/g, '_')}`;
      const properties: Record<string, any> = {};
      const required: string[] = [];

      for (const field of ct.fields || []) {
        properties[field.slug] = fieldTypeToOpenAPISchema(field);
        if (field.validations?.required) {
          required.push(field.slug);
        }
      }

      documentV1.components.schemas[schemaName] = {
        type: 'object',
        description: `Schema for content type: ${ct.name}${ct.description ? ' - ' + ct.description : ''}`,
        properties,
        ...(required.length > 0 ? { required } : {}),
      };

      documentV1.components.schemas[`${schemaName}_Response`] = {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          contentTypeId: { type: 'string', format: 'uuid' },
          tenantId: { type: 'string', format: 'uuid' },
          data: { $ref: `#/components/schemas/${schemaName}` },
          status: { type: 'string', enum: ['draft', 'published', 'archived'] },
          currentVersion: { type: 'integer' },
          lockVersion: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      };
    }
  } catch (e) {
    // Content types may not be available yet if DB isn't seeded
  }

  const docsDir = path.resolve('./docs/api');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(docsDir, 'openapi-v1.json'),
    JSON.stringify(documentV1, null, 2),
  );

  SwaggerModule.setup('api/docs', app, documentV1, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const testReplaySpec = generateTestReplaySpec(documentV1);
  fs.writeFileSync(
    path.join(docsDir, 'test-replay-v1.json'),
    JSON.stringify(testReplaySpec, null, 2),
  );

  await app.listen(3000);
  console.log('OrbitCMS API running on http://localhost:3000');
  console.log('API Docs: http://localhost:3000/api/docs');
}

function fieldTypeToOpenAPISchema(field: any): Record<string, any> {
  const schema: Record<string, any> = {};
  switch (field.fieldType) {
    case FieldType.TEXT:
      schema.type = 'string';
      if (field.validations?.maxLength) schema.maxLength = field.validations.maxLength;
      if (field.validations?.minLength) schema.minLength = field.validations.minLength;
      if (field.validations?.pattern) schema.pattern = field.validations.pattern;
      break;
    case FieldType.NUMBER:
      schema.type = 'number';
      if (field.validations?.min !== undefined) schema.minimum = field.validations.min;
      if (field.validations?.max !== undefined) schema.maximum = field.validations.max;
      break;
    case FieldType.RICHTEXT:
      schema.type = 'string';
      schema.format = 'html';
      break;
    case FieldType.BOOLEAN:
      schema.type = 'boolean';
      break;
    case FieldType.DATE:
      schema.type = 'string';
      schema.format = 'date';
      break;
    case FieldType.JSON:
      if (field.validations?.nestedFields) {
        schema.type = 'object';
        schema.properties = {};
        for (const nf of field.validations.nestedFields) {
          schema.properties[nf.slug] = fieldTypeToOpenAPISchema(nf);
        }
        if (field.validations.repeatable) {
          return { type: 'array', items: schema };
        }
      } else {
        schema.type = 'object';
        schema.additionalProperties = true;
      }
      break;
    case FieldType.RELATION:
      if (field.relationConfig?.relationType === 'oneToMany' || field.relationConfig?.relationType === 'manyToMany') {
        schema.type = 'array';
        schema.items = { type: 'string', format: 'uuid' };
      } else {
        schema.type = 'string';
        schema.format = 'uuid';
      }
      break;
    case FieldType.MEDIA:
      schema.type = 'string';
      schema.format = 'uuid';
      schema.description = 'Media asset ID';
      break;
    default:
      schema.type = 'string';
  }
  return schema;
}

function generateTestReplaySpec(document: any) {
  const endpoints: any[] = [];
  for (const [pathKey, methods] of Object.entries(document.paths || {})) {
    for (const [method, spec] of Object.entries(methods as any)) {
      const operation = spec as any;
      const endpoint: any = {
        id: operation.operationId || `${method.toUpperCase()} ${pathKey}`,
        method: method.toUpperCase(),
        path: pathKey,
        summary: operation.summary || '',
        tags: operation.tags || [],
        parameters: operation.parameters || [],
        requestBody: operation.requestBody || null,
        responses: operation.responses || {},
        security: operation.security || [],
        testTemplate: {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer {{accessToken}}',
            'x-tenant-id': '{{tenantId}}',
          },
          pathParams: extractPathParams(pathKey),
          sampleBody: extractSampleBody(operation.requestBody),
        },
        assertions: generateAssertions(operation),
      };
      endpoints.push(endpoint);
    }
  }
  return {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    baseUrl: 'http://localhost:3000',
    schemas: document.components?.schemas || {},
    endpoints,
    replaySequence: [
      { step: 'auth', endpoint: 'POST /api/v1/auth/login', extractVars: { accessToken: '$.accessToken', tenantId: '$.user.tenantId' } },
      { step: 'list-content-types', endpoint: 'GET /api/v1/content-types', assertions: ['status === 200', 'body is array'] },
    ],
  };
}

function generateAssertions(operation: any): string[] {
  const assertions: string[] = [];
  if (operation.responses?.['200']) {
    assertions.push('status === 200');
  }
  if (operation.responses?.['201']) {
    assertions.push('status === 201');
    assertions.push('body.id is uuid');
  }
  if (operation.security?.length > 0) {
    assertions.push('401 when no auth header');
  }
  return assertions;
}

function extractPathParams(pathStr: string): string[] {
  const matches = pathStr.match(/\{([^}]+)\}/g);
  return matches ? matches.map((m) => m.slice(1, -1)) : [];
}

function extractSampleBody(requestBody: any): Record<string, any> | null {
  if (!requestBody?.content?.['application/json']?.schema) return null;
  const schema = requestBody.content['application/json'].schema;
  const sample: Record<string, any> = {};
  if (schema.properties) {
    for (const [key, prop] of Object.entries(schema.properties as any)) {
      const p = prop as any;
      if (p.type === 'string') sample[key] = `sample_${key}`;
      else if (p.type === 'number' || p.type === 'integer') sample[key] = 0;
      else if (p.type === 'boolean') sample[key] = false;
      else if (p.type === 'array') sample[key] = [];
      else sample[key] = {};
    }
  }
  return sample;
}

bootstrap();
