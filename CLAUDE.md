# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Next.js application for configuration management (feature flags, configuration, prompt library) deployed to Cloudflare Workers using OpenNext. The app is multi-tenant with Prisma ORM managing a D1 database (SQLite on Cloudflare).

## Development Commands

```bash
# Development
npm run dev              # Start Next.js dev server with Turbopack

# Building and Deployment
npm run build            # Build Next.js application
npm run deploy           # Build and deploy to Cloudflare
npm run upload           # Build and upload to Cloudflare (without deployment)
npm run preview          # Build and preview locally with Cloudflare

# Code Quality
npm run lint             # Run ESLint

# Database
# Use Prisma migrations directly - migrations are in prisma/migrations/
# Migrations are applied to D1 database defined in wrangler.jsonc
```

## Testing

Tests are run using Vitest with Cloudflare Workers pool:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npx vitest tests/your-test-file.test.ts
```

Test configuration is in `vitest.config.ts` with:
- Global test timeout: 20 seconds
- File parallelism disabled
- Isolated worker mode (each test file runs in separate runtime)
- Uses `wrangler.jsonc` for Cloudflare bindings
- Integration tests excluded by default (Next.js/OpenNext incompatibilities)

### How to Write Tests

**Prefer End-to-End Tests with Database**
- Use real database connections with Cloudflare D1 in tests
- Tests should use `PrismaClient` with D1 adapter to interact with actual database
- Migrations are automatically applied via `applyMigrations()` helper from `tests/helpers/db-setup.ts`
- Example pattern:
```typescript
import { env } from 'cloudflare:test'
import { PrismaD1 } from '@prisma/adapter-d1'
import { PrismaClient } from '@prisma/client'
import { applyMigrations } from '../helpers/db-setup'

describe('MyService', () => {
    let db: PrismaClient

    beforeAll(async () => {
        await applyMigrations()
        const adapter = new PrismaD1(env.DB)
        db = new PrismaClient({ adapter })
    })

    afterAll(async () => {
        // Cleanup test data
        await db.$disconnect()
    })
})
```

**CRITICAL: Test Multi-Tenant Leakages**
Every test for services/APIs that handle tenant data MUST verify tenant isolation:
- Create data for multiple tenants
- Verify that queries with one `tenantId` NEVER return data from another tenant
- Test that users cannot access/modify data from other tenants
- Example:
```typescript
it('should not return data from different tenant', async () => {
    // Create data for tenant A
    const tenantA = await db.tenants.create({ data: { isActive: true }})
    const projectA = await db.projects.create({
        data: { name: 'Project A', tenantId: tenantA.id }
    })

    // Create data for tenant B
    const tenantB = await db.tenants.create({ data: { isActive: true }})

    // Query with tenant B - should NOT see tenant A's data
    const projects = await service.getProjects(tenantB.id)
    expect(projects).not.toContainEqual(expect.objectContaining({ id: projectA.id }))
    expect(projects.length).toBe(0)
})
```

**Test Permissions and Access Control**
- Test that operations properly enforce tenant/project access
- Test that API key authentication works correctly
- Test both success and failure cases
- Example:
```typescript
it('should reject access with wrong tenant', async () => {
    const project = await db.projects.create({
        data: { name: 'Project', tenantId: tenant1.id }
    })

    // Try to access with wrong tenant
    await expect(
        service.getProject(project.id, tenant2.id)
    ).rejects.toThrow('Not found')
})

it('should reject invalid API key', async () => {
    const response = await middleware(request, { params: Promise.resolve({}) })
    expect(response.status).toBe(401)
})
```

**CRITICAL: Always Verify Database State**
After performing any operation that modifies data, always verify the database state directly:
- Query the database to confirm data was properly persisted
- Check that relationships are correctly established
- Verify that data isolation is maintained (no leakage between tenants)
- Confirm that updates/deletes actually affected the database
- Example:
```typescript
it('should create prompt and persist to database', async () => {
    const prompt = await service.createPrompt({
        name: 'Test Prompt',
        body: { role: 'system', content: 'Hello' },
        projectId,
        tenantId
    })

    // Verify in database
    const dbPrompt = await db.prompts.findUnique({
        where: { id: prompt.id }
    })
    expect(dbPrompt).not.toBeNull()
    expect(dbPrompt?.name).toBe('Test Prompt')
    expect(dbPrompt?.tenantId).toBe(tenantId)
    expect(JSON.parse(dbPrompt?.body || '{}')).toEqual({
        role: 'system',
        content: 'Hello'
    })
})

it('should update user and reflect in database', async () => {
    const user = await service.createUser({
        email: 'test@example.com',
        password: 'password',
        tenantId
    })

    await service.updateUser(user.id, tenantId, {
        name: 'Updated Name'
    })

    // Verify the update persisted
    const dbUser = await db.user.findUnique({
        where: { id: user.id }
    })
    expect(dbUser?.name).toBe('Updated Name')
})

it('should delete record from database', async () => {
    const project = await service.createProject({
        name: 'To Delete',
        tenantId
    })

    await service.deleteProject(project.id, tenantId)

    // Verify deletion in database
    const dbProject = await db.projects.findUnique({
        where: { id: project.id }
    })
    expect(dbProject).toBeNull()
})
```

**Test Organization**
- Place tests in `tests/` directory mirroring `src/` structure
- Service tests: `tests/services/[service-name]/[service-name].test.ts`
- Infrastructure tests: `tests/infrastructure/[file-name].test.ts`
- Lib tests: `tests/lib/[file-name].test.ts`

**Test Cleanup**
- Always clean up test data in `afterAll` hooks
- Delete in reverse dependency order (child records before parent records)
- Use `deleteMany` with `tenantId` filter for efficient cleanup

**Current Test Coverage**
- 143 tests across 12 test files
- Services: api-keys, config, feature-flags, projects, prompts, tenants, users, value-parser
- Infrastructure: api-requests, logging, middlewares
- Lib: utils

## Architecture

### Deployment Stack
- **Next.js 16** with React 19, App Router
- **@opennextjs/cloudflare** for deploying Next.js to Cloudflare Workers
- **Cloudflare D1** (SQLite) as database
- **Wrangler** for Cloudflare deployment configuration

### Database & ORM
- **Prisma** with D1 driver adapter (`@prisma/adapter-d1`)
- Database access via `getDB()` helper in `src/lib/utils.ts`
- Schema location: `prisma/schema.prisma`
- Migrations: `prisma/migrations/` (configured in `wrangler.jsonc`)

### Domain and Business Logic
- Place domain services and business logic in `src/services`
- API must call domain services
- Domain service is class

### Customer Facing API
- Use API key authentication
- Located in `src/app/api/v1`

### API Structure
- Located in `src/app/api`
- For each endpoint create `dto.ts` with request and response schema
- Shared DTOs in `src/app/api/shared-dto.ts`
- Use `authMiddleware` from `src/infrastructure/middlewares.ts` for authenticated requests
- Use `secretApiKeyAuthMiddleware` from `src/infrastructure/middlewares.ts` for secret API key authentication (backend only, format: `sk_{public}_{private}`)
- Use `publicApiKeyAuthMiddleware` from `src/infrastructure/middlewares.ts` for public API key authentication (can be used in frontend, format: `pk_{public}`)

### Authentication
- **NextAuth v5** (beta) with Prisma adapter
- Credentials provider (email/password with bcrypt)
- JWT session strategy (30 day expiry)
- Auth configuration: `src/app/auth.ts`
- Middleware: `src/middleware.ts` with whitelist for public routes

### Cloudflare Context
Access Cloudflare bindings via `getCloudflareContext()`:
```typescript
import { getCloudflareContext } from "@opennextjs/cloudflare"
const context = await getCloudflareContext({ async: true })
const env = context.env as ServerEnv
```

Required bindings in `wrangler.jsonc`:
- `DB` - D1 database binding
- `ASSETS` - Static assets binding
- `AUTH_SECRET` - Secret for NextAuth (generate with `openssl rand -hex 32`)

Environment variables:
- `GITHUB_URL` - Repository URL
- `ALLOW_TO_CREATE_MORE_THAN_ONE_TENANT` - Multi-tenant flag

### Multi-Tenant Architecture
- All main entities (Projects, ApiKeys, Prompts, etc.) have `tenantId` field
- Users are linked to tenants via `User.tenantId`
- Tenant service: `src/services/tenant-service.ts`

### Data Models
Core entities in `prisma/schema.prisma`:
- **Tenants** - Tenant organizations
- **Projects** - Projects within tenants
- **ApiKeys** - API keys scoped to tenant/project (supports two types):
  - **Secret keys** (`sk_{public}_{private}`) - For backend use only, private part is bcrypt hashed
  - **Public keys** (`pk_{public}`) - Can be safely used in frontend code, no private part
- **Prompts** - Prompt library entries
- **PromptVersions** - Versioned prompts
- **FeatureFlags** - Feature flags
- **User/Account/Session** - NextAuth models

### UI Framework
- **Ant Design** for React with Next.js registry
- Components use Ant Design components
- Layout structure: `src/app/layout.tsx`, `src/components/AppLayout.tsx`

### Logging
Custom logging utilities in `src/infrastructure/logging.ts`:
- `logError()` - Structured error logging with AsyncLocalStorage context
- `logInfo()` - Info logging with context

## Important Files

- `wrangler.jsonc` - Cloudflare Workers config (bindings, routes, D1 database)
- `open-next.config.ts` - OpenNext configuration for Cloudflare
- `next.config.ts` - Next.js config with Cloudflare dev mode initialization
- `prisma.config.ts` - Prisma config pointing to schema directory
- `vitest.config.ts` - Test configuration with Cloudflare Workers pool
- `src/lib/utils.ts` - Core utilities (DB access, Cloudflare context)
- `src/middleware.ts` - Auth middleware with route protection

## Key Patterns

### Server-Only Code
Files with authentication, database access, and sensitive logic use `'server-only'` directive:
```typescript
import 'server-only'
```

### Database Access
Always use the `getDB()` helper which properly initializes Prisma with D1 adapter:
```typescript
import { getDB } from '@/lib/utils'
const db = await getDB()
```

### Path Aliases
Project uses `@/*` alias for `src/*` directory (configured in tsconfig and vitest config).
