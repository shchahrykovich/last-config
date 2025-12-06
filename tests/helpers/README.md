# Test Helpers

## `db-setup.ts`

Database setup utilities for tests.

### `applyMigrations()`

Applies all SQL migrations from `prisma/migrations/` to the test D1 database.

**How it works:**
1. Uses `import.meta.glob` to load migration files at build time (works in Workers environment where Node.js `fs` is unavailable)
2. Sorts migrations by filename (which includes numeric prefix for ordering)
3. Removes SQL comments (`--`) before processing
4. Executes each migration using D1's `batch()` API for better multi-line statement handling
5. Logs progress and warnings

**Usage:**
```typescript
import { applyMigrations } from './helpers/db-setup';

beforeAll(async () => {
  await applyMigrations();
  // ... rest of setup
});
```

**Features:**
- Automatic discovery of all `.sql` files in `prisma/migrations/`
- Removes SQL comments to avoid parsing errors
- Uses D1 batch API for reliable execution
- Idempotent: safe to run multiple times (warns on existing tables)
- Progress logging for debugging

**Example Output:**
```
Applying 14 migrations to test database...
  ✓ Applied migration: 0001_init.sql
  ✓ Applied migration: 0002_added-tenant.sql
  ⊘ Skipping empty migration: 0003_added-tables.sql
  ...
Migrations complete!
```

### `clearDatabase()`

Drops all user tables from the test database, providing a complete reset.

**How it works:**
1. Queries `sqlite_master` to dynamically discover all tables
2. Excludes SQLite internal tables (`sqlite_%`) and Cloudflare internal tables (`_cf_%`)
3. Temporarily disables foreign key constraints
4. Drops each table using `DROP TABLE IF EXISTS`
5. Re-enables foreign key constraints
6. Logs progress and warnings

**Usage:**
```typescript
import { clearDatabase } from './helpers/db-setup';

afterAll(async () => {
  await clearDatabase(); // Completely remove all tables
});
```

**Features:**
- **Dynamic table discovery**: No hardcoded table list - automatically finds all tables
- **Safe exclusions**: Skips Cloudflare internal tables that cannot be dropped
- **Foreign key handling**: Temporarily disables constraints to allow dropping tables with relationships
- **Complete reset**: Drops tables (not just data), perfect for clean test isolation

**Example Output:**
```
Dropping 11 tables...
  ✓ Dropped table: accounts
  ✓ Dropped table: users
  ✓ Dropped table: Tenants
  ✓ Dropped table: Projects
  ...
Database cleared!
```

**Note:** Most tests use `deleteMany()` in `afterAll()` to clean up data instead of dropping tables, but `clearDatabase()` is useful when you need a completely fresh schema.
