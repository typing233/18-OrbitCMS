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
    documentV1.paths = documentV1.paths || {};

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

      const basePath = `/api/v1/content/${ct.slug}`;
      documentV1.paths[basePath] = {
        ...documentV1.paths[basePath],
        get: {
          tags: ['Content'],
          operationId: `list_${ct.slug}`,
          summary: `List ${ct.name} entries`,
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20 } },
          ],
          responses: {
            '200': {
              description: 'Paginated list',
              content: { 'application/json': { schema: { type: 'object', properties: {
                data: { type: 'array', items: { $ref: `#/components/schemas/${schemaName}_Response` } },
                meta: { type: 'object', properties: { page: { type: 'integer' }, pageSize: { type: 'integer' }, total: { type: 'integer' }, totalPages: { type: 'integer' } } },
              } } } },
            },
          },
          security: [{ 'bearer-auth': [] }, { 'tenant-id': [] }],
        },
        post: {
          tags: ['Content'],
          operationId: `create_${ct.slug}`,
          summary: `Create a ${ct.name} entry`,
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: `#/components/schemas/${schemaName}` } } } },
          responses: {
            '201': { description: 'Created', content: { 'application/json': { schema: { $ref: `#/components/schemas/${schemaName}_Response` } } } },
          },
          security: [{ 'bearer-auth': [] }, { 'tenant-id': [] }],
        },
      };

      documentV1.paths[`${basePath}/{id}`] = {
        ...documentV1.paths[`${basePath}/{id}`],
        get: {
          tags: ['Content'],
          operationId: `get_${ct.slug}`,
          summary: `Get a ${ct.name} entry by ID`,
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            '200': { description: 'Entry detail', content: { 'application/json': { schema: { $ref: `#/components/schemas/${schemaName}_Response` } } } },
            '404': { description: 'Not found' },
          },
          security: [{ 'bearer-auth': [] }, { 'tenant-id': [] }],
        },
        put: {
          tags: ['Content'],
          operationId: `update_${ct.slug}`,
          summary: `Update a ${ct.name} entry`,
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: `#/components/schemas/${schemaName}` } } } },
          responses: {
            '200': { description: 'Updated', content: { 'application/json': { schema: { $ref: `#/components/schemas/${schemaName}_Response` } } } },
            '409': { description: 'Conflict' },
          },
          security: [{ 'bearer-auth': [] }, { 'tenant-id': [] }],
        },
        delete: {
          tags: ['Content'],
          operationId: `delete_${ct.slug}`,
          summary: `Delete a ${ct.name} entry`,
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { '200': { description: 'Deleted' } },
          security: [{ 'bearer-auth': [] }, { 'tenant-id': [] }],
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
          sampleBody: extractSampleBody(operation.requestBody, document.components?.schemas),
        },
        assertions: generateAssertions(operation),
      };
      endpoints.push(endpoint);
    }
  }

  const contentTypeEndpoints = endpoints.filter((e) => e.tags.includes('Content') && e.id.startsWith('create_'));

  return {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    baseUrl: 'http://localhost:3000',
    schemas: document.components?.schemas || {},
    variables: {
      accessToken: { source: 'auth', jsonPath: '$.accessToken' },
      tenantId: { source: 'auth', jsonPath: '$.user.tenantId' },
      createdEntryId: { source: 'step:create-entry', jsonPath: '$.id' },
    },
    endpoints,
    replaySequence: [
      {
        step: 'auth',
        request: { method: 'POST', path: '/api/v1/auth/login', body: { email: '{{testEmail}}', password: '{{testPassword}}' } },
        extractVars: { accessToken: '$.accessToken', tenantId: '$.user.tenantId' },
        assertions: [
          { type: 'status', expected: 200 },
          { type: 'jsonPath', path: '$.accessToken', check: 'exists' },
        ],
      },
      {
        step: 'list-content-types',
        request: { method: 'GET', path: '/api/v1/content-types' },
        assertions: [
          { type: 'status', expected: 200 },
          { type: 'body', check: 'isArray' },
        ],
      },
      ...contentTypeEndpoints.map((ep) => ({
        step: `create-entry-${ep.id.replace('create_', '')}`,
        request: {
          method: 'POST',
          path: ep.path,
          body: ep.testTemplate.sampleBody,
        },
        assertions: [
          { type: 'status', expected: 201 },
          { type: 'jsonPath', path: '$.id', check: 'isUuid' },
          { type: 'jsonPath', path: '$.status', check: 'equals', expected: 'draft' },
        ],
        extractVars: { [`entryId_${ep.id.replace('create_', '')}`]: '$.id' },
      })),
      {
        step: 'auth-required-check',
        request: { method: 'GET', path: '/api/v1/content-types', headers: { Authorization: '' } },
        assertions: [
          { type: 'status', expected: 200 },
        ],
        description: 'Public endpoints should be accessible without auth',
      },
    ],
    execution: {
      runner: 'node',
      description: 'Execute with: node test-replay-runner.js test-replay-v1.json',
      envVars: ['TEST_BASE_URL', 'TEST_EMAIL', 'TEST_PASSWORD'],
    },
  };
}

function generateAssertions(operation: any): { type: string; expected?: any; path?: string; check?: string }[] {
  const assertions: { type: string; expected?: any; path?: string; check?: string }[] = [];
  if (operation.responses?.['200']) {
    assertions.push({ type: 'status', expected: 200 });
  }
  if (operation.responses?.['201']) {
    assertions.push({ type: 'status', expected: 201 });
    assertions.push({ type: 'jsonPath', path: '$.id', check: 'isUuid' });
  }
  if (operation.responses?.['404']) {
    assertions.push({ type: 'negative', expected: 404, check: 'invalidId' });
  }
  if (operation.security?.length > 0) {
    assertions.push({ type: 'auth', check: '401_without_token' });
  }
  return assertions;
}

function extractPathParams(pathStr: string): string[] {
  const matches = pathStr.match(/\{([^}]+)\}/g);
  return matches ? matches.map((m) => m.slice(1, -1)) : [];
}

function extractSampleBody(requestBody: any, schemas?: Record<string, any>): Record<string, any> | null {
  if (!requestBody?.content?.['application/json']?.schema) return null;
  let schema = requestBody.content['application/json'].schema;

  if (schema.$ref && schemas) {
    const refName = schema.$ref.replace('#/components/schemas/', '');
    schema = schemas[refName] || schema;
  }

  return generateSampleFromSchema(schema, schemas);
}

function generateSampleFromSchema(schema: any, schemas?: Record<string, any>): Record<string, any> | null {
  if (!schema) return null;
  const sample: Record<string, any> = {};

  if (schema.properties) {
    for (const [key, prop] of Object.entries(schema.properties as any)) {
      const p = prop as any;
      if (p.$ref && schemas) {
        const refName = p.$ref.replace('#/components/schemas/', '');
        sample[key] = generateSampleFromSchema(schemas[refName], schemas) || {};
      } else if (p.type === 'string') {
        if (p.format === 'uuid') sample[key] = '00000000-0000-0000-0000-000000000000';
        else if (p.format === 'date') sample[key] = '2026-01-01';
        else if (p.format === 'date-time') sample[key] = '2026-01-01T00:00:00.000Z';
        else if (p.format === 'html') sample[key] = '<p>Sample content</p>';
        else sample[key] = `sample_${key}`;
      } else if (p.type === 'number' || p.type === 'integer') {
        sample[key] = p.minimum || 0;
      } else if (p.type === 'boolean') {
        sample[key] = false;
      } else if (p.type === 'array') {
        sample[key] = [];
      } else {
        sample[key] = {};
      }
    }
  }
  return Object.keys(sample).length > 0 ? sample : null;
}

bootstrap();
