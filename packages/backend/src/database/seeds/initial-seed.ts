import { DataSource } from 'typeorm';
import * as crypto from 'crypto';
import { ContentType } from '../../entities/content-type.entity';
import { FieldDefinition } from '../../entities/field-definition.entity';
import { ContentEntry } from '../../entities/content-entry.entity';
import { Tenant } from '../../entities/tenant.entity';
import { User } from '../../entities/user.entity';
import { Role } from '../../entities/role.entity';
import { Permission, PermissionAction } from '../../entities/permission.entity';
import { AuditLog } from '../../entities/audit-log.entity';
import { MediaAsset } from '../../entities/media-asset.entity';
import { ContentVersion } from '../../entities/content-version.entity';
import { FieldType } from '../../common/enums/field-type.enum';

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL || 'postgresql://orbit:orbit_secret@localhost:5432/orbit_cms',
    entities: [ContentType, FieldDefinition, ContentEntry, Tenant, User, Role, Permission, AuditLog, MediaAsset, ContentVersion],
    synchronize: true,
  });

  await dataSource.initialize();
  console.log('Connected to database');

  const tenantRepo = dataSource.getRepository(Tenant);
  const userRepo = dataSource.getRepository(User);
  const roleRepo = dataSource.getRepository(Role);
  const permRepo = dataSource.getRepository(Permission);
  const contentTypeRepo = dataSource.getRepository(ContentType);
  const fieldDefRepo = dataSource.getRepository(FieldDefinition);
  const entryRepo = dataSource.getRepository(ContentEntry);

  // Create default tenant
  let tenant = await tenantRepo.findOne({ where: { slug: 'default' } });
  if (!tenant) {
    tenant = await tenantRepo.save(tenantRepo.create({
      name: 'Default',
      slug: 'default',
      settings: {},
    }));
    console.log('Created default tenant');
  }

  // Create default roles
  const rolesDefs = [
    { name: 'Administrator', slug: 'admin', description: 'Full system access', isSystem: true },
    { name: 'Editor', slug: 'editor', description: 'Can create and edit content', isSystem: true },
    { name: 'Auditor', slug: 'auditor', description: 'Read-only access with audit log visibility', isSystem: true },
    { name: 'Viewer', slug: 'viewer', description: 'Read-only access to published content', isSystem: true },
  ];

  const roles: Record<string, Role> = {};
  for (const def of rolesDefs) {
    let role = await roleRepo.findOne({ where: { slug: def.slug, tenantId: tenant.id } });
    if (!role) {
      role = await roleRepo.save(roleRepo.create({ ...def, tenantId: tenant.id }));
    }
    roles[def.slug] = role;
  }
  console.log('Roles created/verified');

  // Create permissions for roles
  const permDefs = [
    { resource: 'content', action: PermissionAction.CREATE },
    { resource: 'content', action: PermissionAction.READ },
    { resource: 'content', action: PermissionAction.UPDATE },
    { resource: 'content', action: PermissionAction.DELETE },
    { resource: 'content', action: PermissionAction.PUBLISH },
    { resource: 'content-type', action: PermissionAction.MANAGE },
    { resource: 'media', action: PermissionAction.CREATE },
    { resource: 'media', action: PermissionAction.READ },
    { resource: 'media', action: PermissionAction.DELETE },
    { resource: 'user', action: PermissionAction.MANAGE },
  ];

  const perms: Permission[] = [];
  for (const def of permDefs) {
    let perm = await permRepo.findOne({ where: { resource: def.resource, action: def.action } });
    if (!perm) {
      perm = await permRepo.save(permRepo.create({ ...def, conditions: null, fieldRestrictions: null }));
    }
    perms.push(perm);
  }

  // Assign permissions: admin gets all, editor gets content+media
  const adminRole = roles['admin'];
  adminRole.permissions = perms;
  await roleRepo.save(adminRole);

  const editorRole = roles['editor'];
  editorRole.permissions = perms.filter(p =>
    (p.resource === 'content' && p.action !== PermissionAction.DELETE) ||
    (p.resource === 'media' && p.action !== PermissionAction.DELETE)
  );
  await roleRepo.save(editorRole);

  // Create admin user
  let adminUser = await userRepo.findOne({ where: { email: 'admin@orbit.cms', tenantId: tenant.id } });
  if (!adminUser) {
    adminUser = userRepo.create({
      email: 'admin@orbit.cms',
      passwordHash: hashPassword('admin123'),
      displayName: 'Admin',
      tenantId: tenant.id,
      isActive: true,
    });
    adminUser = await userRepo.save(adminUser);
    adminUser.roles = [roles['admin']];
    await userRepo.save(adminUser);
    console.log('Admin user created (admin@orbit.cms / admin123)');
  }

  // Create demo editor user
  let editorUser = await userRepo.findOne({ where: { email: 'editor@orbit.cms', tenantId: tenant.id } });
  if (!editorUser) {
    editorUser = userRepo.create({
      email: 'editor@orbit.cms',
      passwordHash: hashPassword('editor123'),
      displayName: 'Content Editor',
      tenantId: tenant.id,
      isActive: true,
    });
    editorUser = await userRepo.save(editorUser);
    editorUser.roles = [roles['editor']];
    await userRepo.save(editorUser);
    console.log('Editor user created (editor@orbit.cms / editor123)');
  }

  // Create blog post content type
  const existing = await contentTypeRepo.findOne({ where: { slug: 'blog-posts' } });
  if (!existing) {
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
      { name: 'Publish Date', slug: 'publish-date', fieldType: FieldType.DATE, validations: { showWhen: { field: 'published', value: true } }, sortOrder: 3 },
      { name: 'View Count', slug: 'view-count', fieldType: FieldType.NUMBER, validations: { min: 0 }, sortOrder: 4 },
      { name: 'SEO Metadata', slug: 'seo', fieldType: FieldType.JSON, validations: { nestedFields: [
        { id: 'seo-title', name: 'Meta Title', slug: 'metaTitle', fieldType: FieldType.TEXT, validations: { maxLength: 60 }, sortOrder: 0 },
        { id: 'seo-desc', name: 'Meta Description', slug: 'metaDescription', fieldType: FieldType.TEXT, validations: { maxLength: 160 }, sortOrder: 1 },
      ] }, sortOrder: 5 },
    ];

    for (const f of fields) {
      await fieldDefRepo.save(
        fieldDefRepo.create({ ...f, contentTypeId: blogPost.id, relationConfig: null }),
      );
    }

    const entries = [
      {
        title: 'Getting Started with OrbitCMS',
        body: '<p>OrbitCMS is a headless content management system.</p>',
        published: true,
        'publish-date': '2024-01-15',
        'view-count': 142,
      },
      {
        title: 'Understanding Content Modeling',
        body: '<p>Content modeling defines the structure of your content.</p>',
        published: true,
        'publish-date': '2024-02-01',
        'view-count': 89,
      },
    ];

    for (const entry of entries) {
      await entryRepo.save(
        entryRepo.create({ contentTypeId: blogPost.id, data: entry, tenantId: tenant.id }),
      );
    }

    console.log('Blog Post content type with entries created');
  }

  console.log('Seed complete!');
  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
