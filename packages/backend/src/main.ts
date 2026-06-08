import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  const testReplayEndpoints = generateTestReplaySpec(documentV1);
  fs.writeFileSync(
    path.join(docsDir, 'test-replay-v1.json'),
    JSON.stringify(testReplayEndpoints, null, 2),
  );

  await app.listen(3000);
  console.log('OrbitCMS API running on http://localhost:3000');
  console.log('API Docs: http://localhost:3000/api/docs');
}

function generateTestReplaySpec(document: any) {
  const endpoints: any[] = [];
  for (const [pathKey, methods] of Object.entries(document.paths || {})) {
    for (const [method, spec] of Object.entries(methods as any)) {
      const operation = spec as any;
      endpoints.push({
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
      });
    }
  }
  return {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    baseUrl: 'http://localhost:3000',
    endpoints,
  };
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
