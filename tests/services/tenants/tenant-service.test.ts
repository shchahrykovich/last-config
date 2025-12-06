import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { env } from 'cloudflare:test'
import { PrismaD1 } from '@prisma/adapter-d1'
import { PrismaClient } from '@prisma/client'
import { createTenant } from '@/services/tenants/tenant-service'
import { applyMigrations } from '../../helpers/db-setup'

describe('tenant-service', () => {
    let db: PrismaClient

    beforeAll(async () => {
        // Apply database migrations
        await applyMigrations()

        // Initialize Prisma with D1 adapter
        const adapter = new PrismaD1(env.DB)
        db = new PrismaClient({ adapter })
    })

    afterAll(async () => {
        // Cleanup: delete all test tenants
        await db.tenants.deleteMany({})
        await db.$disconnect()
    })

    describe('createTenant', () => {
        it('should create a tenant with isActive set to true', async () => {
            const tenant = await createTenant(db)

            expect(tenant).toBeDefined()
            expect(tenant.id).toBeDefined()
            expect(tenant.isActive).toBe(true)
            expect(typeof tenant.id).toBe('number')
        })

        it('should create multiple unique tenants', async () => {
            const tenant1 = await createTenant(db)
            const tenant2 = await createTenant(db)

            expect(tenant1.id).not.toBe(tenant2.id)
            expect(tenant1.isActive).toBe(true)
            expect(tenant2.isActive).toBe(true)
        })

        it('should persist tenant in database', async () => {
            const tenant = await createTenant(db)

            // Verify tenant can be retrieved from database
            const retrievedTenant = await db.tenants.findUnique({
                where: { id: tenant.id }
            })

            expect(retrievedTenant).not.toBeNull()
            expect(retrievedTenant?.id).toBe(tenant.id)
            expect(retrievedTenant?.isActive).toBe(true)
        })
    })
})
