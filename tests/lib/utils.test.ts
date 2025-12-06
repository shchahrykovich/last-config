import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { env } from 'cloudflare:test'
import { getServerContext, getDB } from '@/lib/utils'
import { applyMigrations } from '../helpers/db-setup'

describe('lib/utils', () => {
    let testTenantId: number

    beforeAll(async () => {
        // Apply database migrations
        await applyMigrations()

        // Create a test tenant for database operations
        const db = await getDB()
        const tenant = await db.tenants.create({
            data: {
                isActive: true,
            }
        })
        testTenantId = tenant.id
        await db.$disconnect()
    })

    afterAll(async () => {
        // Cleanup: delete test data
        const db = await getDB()
        await db.tenants.deleteMany({
            where: { id: testTenantId }
        })
        await db.$disconnect()
    })

    describe('getServerContext', () => {
        it('should return a valid Cloudflare context', async () => {
            const context = await getServerContext()

            expect(context).toBeDefined()
            expect(context.env).toBeDefined()
        })

        it('should return context with DB binding', async () => {
            const context = await getServerContext()

            // Verify DB binding exists
            expect(context.env).toHaveProperty('DB')
            // @ts-ignore
            expect(context.env.DB).toBeDefined()
        })

        it('should return context with ASSETS binding', async () => {
            const context = await getServerContext()

            // Verify ASSETS binding exists (defined in wrangler.jsonc)
            expect(context.env).toHaveProperty('ASSETS')
        })
    })

    describe('getDB', () => {
        it('should return a PrismaClient instance', async () => {
            const db = await getDB()

            expect(db).toBeDefined()
            expect(db.$disconnect).toBeDefined()
            expect(typeof db.$disconnect).toBe('function')

            await db.$disconnect()
        })

        it('should return a working database connection', async () => {
            const db = await getDB()

            // Perform a simple query to verify connection works
            const tenants = await db.tenants.findMany({
                take: 1
            })

            expect(Array.isArray(tenants)).toBe(true)

            await db.$disconnect()
        })

        it('should allow creating records', async () => {
            const db = await getDB()

            const tenant = await db.tenants.create({
                data: {
                    isActive: true,
                }
            })

            expect(tenant).toBeDefined()
            expect(tenant.id).toBeDefined()
            expect(tenant.isActive).toBe(true)

            // Cleanup
            await db.tenants.delete({
                where: { id: tenant.id }
            })

            await db.$disconnect()
        })

        it('should allow reading records', async () => {
            const db = await getDB()

            // Read the test tenant created in beforeAll
            const tenant = await db.tenants.findUnique({
                where: { id: testTenantId }
            })

            expect(tenant).not.toBeNull()
            expect(tenant?.id).toBe(testTenantId)
            expect(tenant?.isActive).toBe(true)

            await db.$disconnect()
        })

        it('should allow updating records', async () => {
            const db = await getDB()

            // Update the test tenant
            const updatedTenant = await db.tenants.update({
                where: { id: testTenantId },
                data: { isActive: false }
            })

            expect(updatedTenant.isActive).toBe(false)

            // Restore original state
            await db.tenants.update({
                where: { id: testTenantId },
                data: { isActive: true }
            })

            await db.$disconnect()
        })

        it('should allow deleting records', async () => {
            const db = await getDB()

            // Create a temporary tenant to delete
            const tempTenant = await db.tenants.create({
                data: {
                    isActive: true,
                }
            })

            // Delete it
            await db.tenants.delete({
                where: { id: tempTenant.id }
            })

            // Verify it's deleted
            const deletedTenant = await db.tenants.findUnique({
                where: { id: tempTenant.id }
            })

            expect(deletedTenant).toBeNull()

            await db.$disconnect()
        })

        it('should support complex queries with joins', async () => {
            const db = await getDB()

            // Create a project for the test tenant
            const project = await db.projects.create({
                data: {
                    name: 'Test Project',
                    tenantId: testTenantId,
                }
            })

            // Query projects for a specific tenant
            const projects = await db.projects.findMany({
                where: {
                    tenantId: testTenantId
                }
            })

            expect(projects).toBeDefined()
            expect(Array.isArray(projects)).toBe(true)
            expect(projects.length).toBeGreaterThan(0)
            expect(projects[0].tenantId).toBe(testTenantId)

            // Cleanup
            await db.projects.delete({
                where: { id: project.id }
            })

            await db.$disconnect()
        })

        it('should support filtering and sorting', async () => {
            const db = await getDB()

            // Create multiple projects
            const project1 = await db.projects.create({
                data: {
                    name: 'Alpha Project',
                    tenantId: testTenantId,
                }
            })

            const project2 = await db.projects.create({
                data: {
                    name: 'Beta Project',
                    tenantId: testTenantId,
                }
            })

            // Query with filtering and sorting
            const projects = await db.projects.findMany({
                where: {
                    tenantId: testTenantId
                },
                orderBy: {
                    name: 'asc'
                }
            })

            expect(projects.length).toBeGreaterThanOrEqual(2)
            expect(projects[0].name).toBe('Alpha Project')

            // Cleanup
            await db.projects.deleteMany({
                where: {
                    id: { in: [project1.id, project2.id] }
                }
            })

            await db.$disconnect()
        })

        it('should support counting records', async () => {
            const db = await getDB()

            const count = await db.tenants.count()

            expect(typeof count).toBe('number')
            expect(count).toBeGreaterThan(0)

            await db.$disconnect()
        })

        it('should handle multiple concurrent connections', async () => {
            // Create multiple DB instances
            const [db1, db2, db3] = await Promise.all([
                getDB(),
                getDB(),
                getDB()
            ])

            // Perform concurrent queries
            const [tenant1, tenant2, tenant3] = await Promise.all([
                db1.tenants.findUnique({ where: { id: testTenantId } }),
                db2.tenants.findUnique({ where: { id: testTenantId } }),
                db3.tenants.findUnique({ where: { id: testTenantId } })
            ])

            expect(tenant1).not.toBeNull()
            expect(tenant2).not.toBeNull()
            expect(tenant3).not.toBeNull()
            expect(tenant1?.id).toBe(testTenantId)
            expect(tenant2?.id).toBe(testTenantId)
            expect(tenant3?.id).toBe(testTenantId)

            // Cleanup
            await Promise.all([
                db1.$disconnect(),
                db2.$disconnect(),
                db3.$disconnect()
            ])
        })
    })
})
