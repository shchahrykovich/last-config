import { env } from 'cloudflare:test';

// Use Vite's import.meta.glob to load migration files at build time
// This works in the Workers environment where fs is not available
// @ts-ignore
const migrations = import.meta.glob('../../prisma/migrations/*.sql', {
    query: '?raw',
    import: 'default',
    eager: true,
}) as Record<string, string>;

/**
 * Apply database migrations to the test D1 database
 * This reads SQL migration files and executes them in order
 */
export async function applyMigrations() {
    // Get migration files sorted by name (which includes the number prefix)
    const migrationEntries = Object.entries(migrations).sort(([a], [b]) => a.localeCompare(b));

    console.log(`Applying ${migrationEntries.length} migrations to test database...`);

    for (const [filepath, sql] of migrationEntries) {
        const filename = filepath.split('/').pop() || filepath;
        const sqlContent = sql.trim();

        // Skip empty migration files
        if (!sqlContent) {
            console.log(`  ⊘ Skipping empty migration: ${filename}`);
            continue;
        }

        try {
            // Remove comments and split by semicolon
            const statements = sqlContent
                .split('\n')
                // Remove single-line comments
                .map(line => {
                    const commentIndex = line.indexOf('--');
                    return commentIndex >= 0 ? line.substring(0, commentIndex) : line;
                })
                .join('\n')
                // Split by semicolon
                .split(';')
                .map(s => s.trim())
                // Filter empty statements
                .filter(s => s.length > 0);

            // Execute all statements as a batch for better handling of multi-line statements
            if (statements.length > 0) {
                const batch = statements.map(stmt => env.DB.prepare(stmt));
                await env.DB.batch(batch);
            }

            console.log(`  ✓ Applied migration: ${filename}`);
        } catch (error) {
            // Some migrations might fail if tables already exist
            // Log but continue - this is OK for idempotent migrations
            console.log(`  ⚠ Warning applying ${filename}:`, (error as Error).message);
        }
    }

    console.log('Migrations complete!');
}

/**
 * Clear all tables from test database
 * Dynamically fetches all tables from the database and drops them
 * Useful for complete cleanup between test runs
 */
export async function clearDatabase() {
    try {
        // Get all user tables from the database
        // Exclude sqlite internal tables and Cloudflare internal tables (_cf_*)
        const result = await env.DB.prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'"
        ).all<{ name: string }>();

        const tables = result.results || [];

        if (tables.length === 0) {
            console.log('No tables to drop');
            return;
        }

        console.log(`Dropping ${tables.length} tables...`);

        // Disable foreign key constraints temporarily to allow dropping tables
        await env.DB.exec('PRAGMA foreign_keys = OFF');

        // Drop each table
        for (const { name } of tables) {
            try {
                await env.DB.exec(`DROP TABLE IF EXISTS "${name}"`);
                console.log(`  ✓ Dropped table: ${name}`);
            } catch (error) {
                console.log(`  ⚠ Warning dropping ${name}:`, (error as Error).message);
            }
        }

        // Re-enable foreign key constraints
        await env.DB.exec('PRAGMA foreign_keys = ON');

        console.log('Database cleared!');
    } catch (error) {
        console.error('Error clearing database:', error);
        throw error;
    }
}
