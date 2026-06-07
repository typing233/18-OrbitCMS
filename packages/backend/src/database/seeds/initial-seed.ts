import { DataSource } from 'typeorm';
import { ContentType } from '../../entities/content-type.entity';
import { FieldDefinition } from '../../entities/field-definition.entity';
import { ContentEntry } from '../../entities/content-entry.entity';
import { FieldType } from '../../common/enums/field-type.enum';

async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL || 'postgresql://orbit:orbit_secret@localhost:5432/orbit_cms',
    entities: [ContentType, FieldDefinition, ContentEntry],
    synchronize: true,
  });

  await dataSource.initialize();
  console.log('Connected to database');

  const contentTypeRepo = dataSource.getRepository(ContentType);
  const fieldDefRepo = dataSource.getRepository(FieldDefinition);
  const entryRepo = dataSource.getRepository(ContentEntry);

  const existing = await contentTypeRepo.findOne({ where: { slug: 'blog-posts' } });
  if (existing) {
    console.log('Seed data already exists, skipping.');
    await dataSource.destroy();
    return;
  }

  const blogPost = await contentTypeRepo.save(
    contentTypeRepo.create({
      name: 'Blog Post',
      slug: 'blog-posts',
      description: 'Blog articles with title, body, and metadata',
    }),
  );

  const fields = [
    { name: 'Title', slug: 'title', fieldType: FieldType.TEXT, validations: { required: true, unique: true, maxLength: 200 }, sortOrder: 0 },
    { name: 'Body', slug: 'body', fieldType: FieldType.RICHTEXT, validations: { required: true }, sortOrder: 1 },
    { name: 'Published', slug: 'published', fieldType: FieldType.BOOLEAN, validations: {}, sortOrder: 2 },
    { name: 'Publish Date', slug: 'publish-date', fieldType: FieldType.DATE, validations: {}, sortOrder: 3 },
    { name: 'View Count', slug: 'view-count', fieldType: FieldType.NUMBER, validations: { min: 0 }, sortOrder: 4 },
  ];

  for (const f of fields) {
    await fieldDefRepo.save(
      fieldDefRepo.create({ ...f, contentTypeId: blogPost.id, relationConfig: null }),
    );
  }

  const entries = [
    {
      title: 'Getting Started with OrbitCMS',
      body: '<p>OrbitCMS is a headless content management system that lets you define content types visually and auto-generates APIs.</p>',
      published: true,
      'publish-date': '2024-01-15',
      'view-count': 142,
    },
    {
      title: 'Understanding Content Modeling',
      body: '<p>Content modeling is the process of defining the structure of your content. Each content type represents a distinct entity.</p>',
      published: true,
      'publish-date': '2024-02-01',
      'view-count': 89,
    },
    {
      title: 'API Auto-Generation Explained',
      body: '<p>When you create a content type, OrbitCMS automatically generates RESTful CRUD endpoints for managing entries of that type.</p>',
      published: false,
      'publish-date': null,
      'view-count': 0,
    },
  ];

  for (const entry of entries) {
    await entryRepo.save(
      entryRepo.create({ contentTypeId: blogPost.id, data: entry }),
    );
  }

  console.log('Seed data created: Blog Post content type with 3 entries');
  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
