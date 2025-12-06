import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { env } from 'cloudflare:test'
import { PrismaD1 } from '@prisma/adapter-d1'
import { PrismaClient } from '@prisma/client'
import { ApiKeyService } from '@/services/api-keys/api-key-service'
import * as bcrypt from 'bcryptjs'
import { applyMigrations } from '../../helpers/db-setup'

describe('ApiKeyService', () => {
    let db: PrismaClient
    let apiKeyService: ApiKeyService
    let tenantId: number
    let projectId: number

    beforeAll(async () => {
        // Apply database migrations
        await applyMigrations()

        // Initialize Prisma with D1 adapter
        const adapter = new PrismaD1(env.DB)
        db = new PrismaClient({ adapter })
        apiKeyService = new ApiKeyService(db)

        // Create test tenant
        const tenant = await db.tenants.create({
            data: {
                isActive: true,
            }
        })
        tenantId = tenant.id

        // Create test project
        const project = await db.projects.create({
            data: {
                name: 'Test Project',
                tenantId,
            }
        })
        projectId = project.id
    })

    afterAll(async () => {
        // Cleanup: delete test data
        await db.apiKeys.deleteMany({
            where: { tenantId }
        })
        await db.projects.deleteMany({
            where: { tenantId }
        })
        await db.tenants.deleteMany({
            where: { id: tenantId }
        })
        await db.$disconnect()
    })

    describe('createApiKey', () => {
        it('should create an API key with correct format', async () => {
            const result = await apiKeyService.createApiKey({
                projectId,
                tenantId,
            })

            expect(result).toBeDefined()
            expect(result.apiKey).toBeDefined()
            expect(result.fullKey).toBeDefined()

            // Verify full key format: sk_{public}_{private}
            expect(result.fullKey).toMatch(/^sk_[A-Za-z0-9_-]{16}_[A-Za-z0-9_-]{32}$/)

            // Verify the public part matches
            const [prefix, publicPart, privatePart] = result.fullKey.split('_')
            expect(prefix).toBe('sk')
            expect(publicPart).toBe(result.apiKey.public)
            expect(publicPart.length).toBe(16)
            expect(privatePart.length).toBe(32)

            // Verify the private key is hashed in DB
            expect(result.apiKey.private).not.toBe(privatePart)
            expect(result.apiKey.private.length).toBeGreaterThan(32) // bcrypt hashes are longer

            // Verify it's a valid bcrypt hash
            const isValidHash = await bcrypt.compare(privatePart, result.apiKey.private)
            expect(isValidHash).toBe(true)
        })

        it('should create unique API keys', async () => {
            const result1 = await apiKeyService.createApiKey({
                projectId,
                tenantId,
            })

            const result2 = await apiKeyService.createApiKey({
                projectId,
                tenantId,
            })

            expect(result1.fullKey).not.toBe(result2.fullKey)
            expect(result1.apiKey.public).not.toBe(result2.apiKey.public)
            expect(result1.apiKey.private).not.toBe(result2.apiKey.private)
        })

        it('should store API key with correct project and tenant', async () => {
            const result = await apiKeyService.createApiKey({
                projectId,
                tenantId,
            })

            expect(result.apiKey.projectId).toBe(projectId)
            expect(result.apiKey.tenantId).toBe(tenantId)
            expect(result.apiKey.type).toBe('secret')
        })
    })

    describe('verifyApiKey', () => {
        it('should verify a valid API key', async () => {
            const { apiKey, fullKey } = await apiKeyService.createApiKey({
                projectId,
                tenantId,
            })

            // Extract public and private parts from fullKey
            const [, publicPart, privatePart] = fullKey.split('_')

            const isValid = await apiKeyService.verifyApiKey(publicPart, privatePart)
            expect(isValid).toBe(true)
        })

        it('should reject an invalid private key', async () => {
            const { apiKey } = await apiKeyService.createApiKey({
                projectId,
                tenantId,
            })

            const isValid = await apiKeyService.verifyApiKey(apiKey.public, 'wrong_private_key')
            expect(isValid).toBe(false)
        })

        it('should reject a non-existent public key', async () => {
            const isValid = await apiKeyService.verifyApiKey('nonexistent_public', 'some_private')
            expect(isValid).toBe(false)
        })
    })

    describe('getApiKeysByProjectId', () => {
        it('should retrieve API keys for a project', async () => {
            // Create a few API keys
            await apiKeyService.createApiKey({ projectId, tenantId })
            await apiKeyService.createApiKey({ projectId, tenantId })

            const apiKeys = await apiKeyService.getApiKeysByProjectId(projectId, tenantId)

            expect(apiKeys).toBeDefined()
            expect(Array.isArray(apiKeys)).toBe(true)
            expect(apiKeys.length).toBeGreaterThanOrEqual(2)

            // Verify private keys are not included
            apiKeys.forEach(key => {
                expect(key.id).toBeDefined()
                expect(key.public).toBeDefined()
                expect(key.projectId).toBe(projectId)
                expect(key.tenantId).toBe(tenantId)
                expect(key.type).toBe('secret')
                expect((key as any).private).toBeUndefined() // private should not be in response
            })
        })

        it('should return empty array for project with no API keys', async () => {
            // Create a new project with no API keys
            const emptyProject = await db.projects.create({
                data: {
                    name: 'Empty Project',
                    tenantId,
                }
            })

            const apiKeys = await apiKeyService.getApiKeysByProjectId(emptyProject.id, tenantId)

            expect(apiKeys).toBeDefined()
            expect(Array.isArray(apiKeys)).toBe(true)
            expect(apiKeys.length).toBe(0)

            // Cleanup
            await db.projects.delete({
                where: { id: emptyProject.id }
            })
        })

        it('should not return API keys from different tenant', async () => {
            // Create another tenant and project
            const otherTenant = await db.tenants.create({
                data: { isActive: true }
            })
            const otherProject = await db.projects.create({
                data: {
                    name: 'Other Tenant Project',
                    tenantId: otherTenant.id,
                }
            })

            // Create an API key for the other tenant
            await apiKeyService.createApiKey({
                projectId: otherProject.id,
                tenantId: otherTenant.id,
            })

            // Try to get API keys with wrong tenant ID
            const apiKeys = await apiKeyService.getApiKeysByProjectId(otherProject.id, tenantId)

            expect(apiKeys).toBeDefined()
            expect(apiKeys.length).toBe(0)

            // Cleanup
            await db.apiKeys.deleteMany({ where: { tenantId: otherTenant.id } })
            await db.projects.delete({ where: { id: otherProject.id } })
            await db.tenants.delete({ where: { id: otherTenant.id } })
        })
    })

    describe('verifyProjectAccess', () => {
        it('should return true for valid project and tenant', async () => {
            const hasAccess = await apiKeyService.verifyProjectAccess(projectId, tenantId)
            expect(hasAccess).toBe(true)
        })

        it('should return false for invalid project', async () => {
            const hasAccess = await apiKeyService.verifyProjectAccess(99999, tenantId)
            expect(hasAccess).toBe(false)
        })

        it('should return false for wrong tenant', async () => {
            const otherTenant = await db.tenants.create({
                data: { isActive: true }
            })

            const hasAccess = await apiKeyService.verifyProjectAccess(projectId, otherTenant.id)
            expect(hasAccess).toBe(false)

            // Cleanup
            await db.tenants.delete({ where: { id: otherTenant.id } })
        })
    })

    describe('deleteApiKey', () => {
        it('should delete an API key', async () => {
            const { apiKey } = await apiKeyService.createApiKey({
                projectId,
                tenantId,
            })

            const deleted = await apiKeyService.deleteApiKey(apiKey.id, tenantId)
            expect(deleted).toBe(true)

            // Verify it's actually deleted
            const apiKeys = await db.apiKeys.findMany({
                where: { id: apiKey.id }
            })
            expect(apiKeys.length).toBe(0)
        })

        it('should not delete API key from different tenant', async () => {
            const { apiKey } = await apiKeyService.createApiKey({
                projectId,
                tenantId,
            })

            const otherTenant = await db.tenants.create({
                data: { isActive: true }
            })

            const deleted = await apiKeyService.deleteApiKey(apiKey.id, otherTenant.id)
            expect(deleted).toBe(false)

            // Verify it's still there
            const stillExists = await db.apiKeys.findFirst({
                where: { id: apiKey.id }
            })
            expect(stillExists).not.toBeNull()

            // Cleanup
            await db.tenants.delete({ where: { id: otherTenant.id } })
        })

        it('should return false for non-existent API key', async () => {
            const deleted = await apiKeyService.deleteApiKey(99999, tenantId)
            expect(deleted).toBe(false)
        })
    })

    describe('unique constraint on public key', () => {
        it('should not allow creating two API keys with the same public part', async () => {
            // Create first API key
            const { apiKey: firstKey } = await apiKeyService.createApiKey({
                projectId,
                tenantId,
            })

            // Try to create another API key with the same public part
            // We need to directly insert into DB to test the constraint
            const hashedPrivate = await bcrypt.hash('some_private_key', 10)

            await expect(
                db.apiKeys.create({
                    data: {
                        tenantId,
                        projectId,
                        public: firstKey.public, // Same public part
                        private: hashedPrivate,
                        type: 'secret',
                    }
                })
            ).rejects.toThrow()
        })

        it('should verify database has unique index on public field', async () => {
            // Query SQLite schema to verify unique index exists
            const indexInfo = await db.$queryRaw<Array<{ name: string }>>`
                SELECT name FROM sqlite_master
                WHERE type = 'index'
                AND tbl_name = 'ApiKeys'
                AND sql LIKE '%UNIQUE%public%'
            ` as Array<{ name: string }>

            expect(indexInfo.length).toBeGreaterThan(0)
            expect(indexInfo.some(idx => idx.name.includes('public'))).toBe(true)
        })

        it('should verify unique constraint is enforced in database', async () => {
            // Create an API key
            const { apiKey } = await apiKeyService.createApiKey({
                projectId,
                tenantId,
            })

            // Verify we can query it
            const found = await db.apiKeys.findUnique({
                where: { public: apiKey.public }
            })

            expect(found).not.toBeNull()
            expect(found?.public).toBe(apiKey.public)

            // Try to create a duplicate directly via Prisma
            const hashedPrivate = await bcrypt.hash('different_private_key', 10)

            await expect(
                db.apiKeys.create({
                    data: {
                        tenantId,
                        projectId,
                        public: apiKey.public, // Duplicate public key
                        private: hashedPrivate,
                        type: 'secret',
                    }
                })
            ).rejects.toThrow(/unique/i)
        })
    })
})
