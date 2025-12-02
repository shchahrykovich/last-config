import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { env } from 'cloudflare:test'
import { PrismaD1 } from '@prisma/adapter-d1'
import { PrismaClient } from '@prisma/client'
import { ApiKeyService } from '@/services/api-keys/api-key-service'

describe('API Key Authentication Middleware', () => {
    let db: PrismaClient
    let apiKeyService: ApiKeyService
    let tenantId: number
    let projectId: number
    let validApiKey: string
    let validPublicKey: string

    beforeAll(async () => {
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

        // Create a valid API key for testing
        const result = await apiKeyService.createApiKey({
            projectId,
            tenantId,
        })
        validApiKey = result.fullKey
        validPublicKey = result.apiKey.public
    })

    afterAll(async () => {
        // Cleanup
        await db.apiKeys.deleteMany({ where: { tenantId } })
        await db.projects.deleteMany({ where: { tenantId } })
        await db.tenants.deleteMany({ where: { id: tenantId } })
        await db.$disconnect()
    })

    describe('GET /api/v1/health', () => {
        it('should return Ok with valid API key', async () => {
            const response = await env.ASSETS.fetch('http://localhost/api/v1/health', {
                headers: {
                    'Authorization': `Bearer ${validApiKey}`
                }
            })

            expect(response.status).toBe(200)

            const data = await response.json()
            expect(data.status).toBe('Ok')
            expect(data.message).toBe('API key authentication successful')
            expect(data.context.projectId).toBe(projectId)
            expect(data.context.tenantId).toBe(tenantId)
        })

        it('should return 401 with invalid API key', async () => {
            const response = await env.ASSETS.fetch('http://localhost/api/v1/health', {
                headers: {
                    'Authorization': `Bearer sk_invalid_key_here`
                }
            })

            expect(response.status).toBe(401)

            const data = await response.json()
            expect(data.error).toBeDefined()
        })

        it('should return 401 with wrong private key', async () => {
            const wrongKey = `sk_${validPublicKey}_wrongprivatekey123456789012`
            const response = await env.ASSETS.fetch('http://localhost/api/v1/health', {
                headers: {
                    'Authorization': `Bearer ${wrongKey}`
                }
            })

            expect(response.status).toBe(401)

            const data = await response.json()
            expect(data.error).toBe('Invalid API key')
        })

        it('should return 401 without Authorization header', async () => {
            const response = await env.ASSETS.fetch('http://localhost/api/v1/health')

            expect(response.status).toBe(401)

            const data = await response.json()
            expect(data.error).toBe('Missing Authorization header')
        })

        it('should return 401 with invalid Authorization format', async () => {
            const response = await env.ASSETS.fetch('http://localhost/api/v1/health', {
                headers: {
                    'Authorization': `Basic ${validApiKey}` // Wrong type
                }
            })

            expect(response.status).toBe(401)

            const data = await response.json()
            expect(data.error).toContain('Invalid Authorization format')
        })

        it('should return 401 with malformed API key', async () => {
            const response = await env.ASSETS.fetch('http://localhost/api/v1/health', {
                headers: {
                    'Authorization': 'Bearer invalid-format-key'
                }
            })

            expect(response.status).toBe(401)

            const data = await response.json()
            expect(data.error).toContain('Invalid API key format')
        })

        it('should return 401 with empty API key parts', async () => {
            const response = await env.ASSETS.fetch('http://localhost/api/v1/health', {
                headers: {
                    'Authorization': 'Bearer sk__' // Empty parts
                }
            })

            expect(response.status).toBe(401)

            const data = await response.json()
            expect(data.error).toBe('Invalid API key format')
        })
    })

    describe('API Key Format Validation', () => {
        it('should accept valid format sk_{public}_{private}', async () => {
            expect(validApiKey).toMatch(/^sk_[A-Za-z0-9_-]{16}_[A-Za-z0-9_-]{32}$/)
        })

        it('should reject keys without sk_ prefix', async () => {
            const response = await env.ASSETS.fetch('http://localhost/api/v1/health', {
                headers: {
                    'Authorization': 'Bearer abc_def_ghi'
                }
            })

            expect(response.status).toBe(401)
        })

        it('should reject keys with wrong number of parts', async () => {
            const response = await env.ASSETS.fetch('http://localhost/api/v1/health', {
                headers: {
                    'Authorization': 'Bearer sk_only_one_part'
                }
            })

            expect(response.status).toBe(401)
        })
    })
})
