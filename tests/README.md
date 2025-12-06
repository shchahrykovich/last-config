# Testing Guide

This project uses [Vitest](https://vitest.dev/) with the [@cloudflare/vitest-pool-workers](https://developers.cloudflare.com/workers/testing/vitest-integration/) package for testing Cloudflare Workers.

## Quick Start

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run a specific test file
npx vitest tests/value-parser.test.ts
```

## Test Organization

Tests are organized into two categories:

### Unit Tests (`tests/*.test.ts`)
- Fast tests for pure functions, services, and database operations
- Run by default with `npx vitest`
- Examples:
  - `value-parser.test.ts` - Pure function tests (no dependencies)
  - `api-key-service.test.ts` - Database service tests (with migration setup)

### Integration Tests (`tests/integration/**/*.test.ts`)
- Tests requiring Next.js HTTP endpoints
- **Currently skipped** due to WASM/OpenNext incompatibilities
- See Integration Tests section below for details

## Setup

The test configuration is in `vitest.config.ts` and uses settings from `wrangler.jsonc`.

### TypeScript Configuration

- `tests/tsconfig.json` - Extends main tsconfig and adds types for `cloudflare:test`
- `tests/env.d.ts` - Declares `ProvidedEnv` interface extending `Env` from Cloudflare bindings

### Server-Only Package

The `server-only` package is mocked in tests via Vite alias:
- `tests/mocks/server-only.ts` - No-op mock that allows importing server-only modules in tests

## Running Tests

```bash
# Run all tests (integration tests excluded by default)
npm test
# or
npx vitest run

# Run tests in watch mode (re-runs on file changes)
npm run test:watch
# or
npx vitest

# Run tests with coverage report
npm run test:coverage
# or
npx vitest run --coverage

# Run specific test file
npx vitest tests/value-parser.test.ts

# Run integration tests (requires special setup, see below)
npx vitest tests/integration
```

## Known Limitations

### Next.js Integration Tests

Tests that use `SELF.fetch()` or `env.ASSETS.fetch()` with Next.js endpoints are located in `tests/integration/` and are excluded by default because:

1. **WASM Module Issues**: Next.js's `@vercel/og` package tries to load WASM modules (`resvg.wasm`) which are not supported in the Cloudflare Workers test environment
2. **OpenNext Initialization Conflicts**: The OpenNext adapter has Symbol redefinition issues when loaded in tests
3. **Database Schema**: Tests require D1 database migrations to be applied

These are fundamental incompatibilities between Next.js and the Cloudflare Workers test runtime. The recommended approach is to test the underlying service functions directly instead of making HTTP requests to Next.js endpoints.

Files in `tests/integration/`:
- `health-endpoint.test.ts`
- `api-key-auth-middleware.test.ts`
- `v1-prompts-api.test.ts`
- `api-key-service.test.ts`

## Writing Tests

### Unit Tests

Unit tests test individual functions or modules in isolation:

```typescript
import { describe, it, expect } from "vitest";
import { myFunction } from "@/services/my-service";

describe("myFunction", () => {
  it("should do something", () => {
    const result = myFunction("input");
    expect(result).toBe("expected output");
  });
});
```

**Example:** See `tests/value-parser.test.ts`

### Integration Tests with SELF (Limited Support)

The `SELF` fetcher from `cloudflare:test` allows you to test API endpoints:

```typescript
import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";

describe("API Endpoint", () => {
  it("should return expected response", async () => {
    const response = await SELF.fetch("http://example.com/api/endpoint");
    expect(response.status).toBe(200);
  });
});
```

**Example:** See `tests/integration/health-endpoint.test.ts` (currently skipped)

**Important Limitation:** Tests using `SELF.fetch()` with Next.js endpoints do NOT work due to:
- WASM module loading issues (`@vercel/og/resvg.wasm`)
- OpenNext initialization conflicts
- These tests are located in `tests/integration/` and excluded from default runs

**Alternative:** Test service functions directly instead of making HTTP requests to Next.js endpoints.

### Database Tests

Database tests automatically apply migrations using the `applyMigrations()` helper:

```typescript
import { env } from "cloudflare:test";
import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll } from "vitest";
import { applyMigrations } from "./helpers/db-setup";

describe("Database Test", () => {
  let db: PrismaClient;

  beforeAll(async () => {
    // Apply all migrations to set up the schema
    await applyMigrations();

    // Initialize Prisma with D1 adapter
    const adapter = new PrismaD1(env.DB);
    db = new PrismaClient({ adapter });

    // Create test data...
  });

  afterAll(async () => {
    // Clean up test data
    await db.$disconnect();
  });

  it("should interact with database", async () => {
    // Test database operations
  });
});
```

**Key Features:**
1. **Automatic Schema Setup**: `applyMigrations()` reads all SQL migration files from `prisma/migrations/` and applies them using `import.meta.glob`
2. **Works in Workers Environment**: Uses Vite's build-time imports instead of Node.js `fs` module
3. **Idempotent**: Safe to run multiple times (logs warnings for existing tables)

**Example:** See `tests/api-key-service.test.ts` for a complete database test with 15 test cases

### Execution Context for Worker Tests

When testing Worker fetch handlers directly:

```typescript
import {
  env,
  createExecutionContext,
  waitOnExecutionContext,
} from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../src/worker";

describe("Worker", () => {
  it("should handle request", async () => {
    const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;
    const request = new IncomingRequest("http://example.com/");
    const ctx = createExecutionContext();

    const response = await worker.fetch(request, env, ctx);

    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(200);
  });
});
```

**Example:** See `tests/example-unit-test.test.ts`

## Test Organization

```
tests/
├── README.md                     # This file
├── tsconfig.json                 # TypeScript config for tests
├── env.d.ts                      # Environment types
├── helpers/                      # Test utilities
│   └── db-setup.ts               # Database migration helper
├── mocks/                        # Mock modules
│   └── server-only.ts            # server-only package mock
├── value-parser.test.ts          # Pure function tests (8 tests)
├── api-key-service.test.ts       # Database service tests (15 tests)
└── integration/                  # Skipped Next.js integration tests
    ├── README.md
    ├── health-endpoint.test.ts
    ├── api-key-auth-middleware.test.ts
    ├── v1-prompts-api.test.ts
    └── api-key-service.test.ts (old version)
```

## Best Practices

1. **Use descriptive test names** - Test names should clearly describe what is being tested
2. **One assertion per test** - Each test should verify one specific behavior
3. **Clean up after tests** - Always clean up test data in `afterAll` or `afterEach`
4. **Avoid test interdependencies** - Tests should be able to run in any order
5. **Mock external dependencies** - Use mocks for external APIs, databases, etc. when appropriate
6. **Test edge cases** - Include tests for error conditions, empty inputs, boundary values, etc.

## Cloudflare Bindings

Tests have access to all bindings defined in `wrangler.jsonc`:

- `env.DB` - D1 database binding
- `env.ASSETS` - Static assets binding
- `env.AUTH_SECRET` - Environment secrets

Additional test-only bindings can be added in `vitest.config.ts` under `poolOptions.workers.miniflare`.

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Cloudflare Workers Testing Guide](https://developers.cloudflare.com/workers/testing/vitest-integration/)
- [Cloudflare Workers Testing Recipes](https://developers.cloudflare.com/workers/testing/vitest-integration/recipes/)
