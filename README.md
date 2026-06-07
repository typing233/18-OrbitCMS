# OrbitCMS

A Headless CMS that lets you visually define content models and auto-generates RESTful CRUD APIs.

## Tech Stack

- **Frontend**: React 18 + Vite + TypeScript + Ant Design
- **Backend**: NestJS + TypeORM + TypeScript
- **Database**: PostgreSQL 16 (JSONB content storage)
- **Dev Environment**: Docker Compose

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Start PostgreSQL
docker compose up -d postgres

# 3. Start backend (port 3000)
cd packages/backend
DATABASE_URL=postgresql://orbit:orbit_secret@localhost:5432/orbit_cms pnpm dev

# 4. Start frontend (port 5173)
cd packages/frontend
pnpm dev
```

Or run everything via Docker:

```bash
docker compose up
```

## Architecture

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────┐
│   Frontend  │────▶│  Backend (API)  │────▶│  PostgreSQL  │
│  React+Vite │     │    NestJS       │     │   JSONB      │
│  Port 5173  │     │   Port 3000     │     │  Port 5432   │
└─────────────┘     └─────────────────┘     └──────────────┘
```

## API Endpoints

### Content Type Management

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/content-types` | List all content types |
| GET | `/api/v1/content-types/:idOrSlug` | Get content type details |
| POST | `/api/v1/content-types` | Create content type |
| PUT | `/api/v1/content-types/:id` | Update content type |
| DELETE | `/api/v1/content-types/:id` | Delete content type |

### Dynamic Content API (auto-generated per content type)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/content/:slug` | List entries (paginated) |
| GET | `/api/v1/content/:slug/:id` | Get single entry |
| POST | `/api/v1/content/:slug` | Create entry |
| PUT | `/api/v1/content/:slug/:id` | Update entry |
| DELETE | `/api/v1/content/:slug/:id` | Delete entry |

### Other

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/health` | Health check |
| GET | `/api/docs` | Swagger documentation |

## Field Types

| Type | Description |
|------|-------------|
| `text` | Short/long text strings |
| `number` | Integer or decimal numbers |
| `richtext` | HTML rich text content |
| `boolean` | True/false values |
| `date` | ISO date strings |
| `json` | Arbitrary JSON objects |
| `relation` | Reference to other content type entries |

## Validation Rules

Fields support: `required`, `unique`, `minLength`, `maxLength`, `min`, `max`, `pattern` (regex).

## Seed Data

```bash
cd packages/backend
DATABASE_URL=postgresql://orbit:orbit_secret@localhost:5432/orbit_cms pnpm seed
```

Creates a sample "Blog Post" content type with example entries.

## Project Structure

```
packages/
├── backend/          NestJS API server
│   └── src/
│       ├── entities/         TypeORM entities
│       ├── modules/
│       │   ├── content-type/ Content type CRUD
│       │   ├── content/      Dynamic content API + validation
│       │   └── health/       Health check
│       └── common/           Shared DTOs, utils, filters
└── frontend/         React admin dashboard
    └── src/
        ├── pages/            Route pages
        ├── components/       Shared components (DynamicField)
        ├── api/              API client
        └── types/            TypeScript interfaces
```
