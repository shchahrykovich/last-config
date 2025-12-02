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
# Run tests (uses @cloudflare/vitest-pool-workers)
npx vitest

# Run specific test file
npx vitest tests/your-test-file.test.ts
```

Test configuration is in `vitest.config.ts` with:
- Global test timeout: 20 seconds
- File parallelism disabled
- Single worker mode
- Uses `wrangler.jsonc` for Cloudflare bindings

## Architecture

### Deployment Stack
- **Next.js 15** with React 19, App Router
- **@opennextjs/cloudflare** for deploying Next.js to Cloudflare Workers
- **Cloudflare D1** (SQLite) as database
- **Wrangler** for Cloudflare deployment configuration

### Database & ORM
- **Prisma** with D1 driver adapter (`@prisma/adapter-d1`)
- Database access via `getDB()` helper in `src/lib/utils.ts`
- Schema location: `prisma/schema.prisma`
- Migrations: `prisma/migrations/` (configured in `wrangler.jsonc`)

### Domain and Business logic
- Place domain services and business logic here src/services
- API must call domain services
- domain service is class

### Customer facing API
- use api key authentication
- - folder src/app/api/v1

### API
- folder src/app/api
- for each endpoint create dto.ts with request and response schema
- shared dtos is here src/app/api/shared-dto.ts
- you must use authMiddleware from src/infrastructure/middlewares.ts for requests

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
- **ApiKeys** - API keys scoped to tenant/project
- **Prompts** - Prompt library entries
- **PromptVersions** - Versioned prompts
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
