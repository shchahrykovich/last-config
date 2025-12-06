import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { env } from 'cloudflare:test'
import { PrismaD1 } from '@prisma/adapter-d1'
import { PrismaClient } from '@prisma/client'
import { secretApiKeyAuthMiddleware, publicApiKeyAuthMiddleware, ApiKeyAuthContext } from '@/infrastructure/middlewares'
import { applyMigrations } from '../helpers/db-setup'
import { NextRequest, NextResponse } from 'next/server'
import { ApiKeyService } from '@/services/api-keys/api-key-service'

describe('middlewares', () => {
    let db: PrismaClient
    let apiKeyService: ApiKeyService
    let tenantId: number
    let projectId: number
    let secretApiKey: { fullKey: string; apiKey: any }
    let publicApiKey: { fullKey: string; apiKey: any }

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

        // Create secret API key
        secretApiKey = await apiKeyService.createApiKey({
            projectId,
            tenantId,
            type: 'secret',
        })

        // Create public API key
        publicApiKey = await apiKeyService.createApiKey({
            projectId,
            tenantId,
            type: 'public',
        })
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

    describe('secretApiKeyAuthMiddleware', () => {
        it('should authenticate with valid secret API key', async () => {
            const mockHandler = async (
                context: ApiKeyAuthContext,
                db: PrismaClient,
                req: NextRequest
            ) => {
                expect(context.tenantId).toBe(tenantId)
                expect(context.projectId).toBe(projectId)
                expect(context.apiKey.id).toBeDefined()
                expect(context.apiKey.type).toBe('secret')

                return NextResponse.json({ success: true })
            }

            const middleware = secretApiKeyAuthMiddleware(mockHandler)

            const request = new NextRequest('https://example.com/api/test', {
                headers: {
                    'Authorization': secretApiKey.fullKey
                }
            })

            const response = await middleware(request, { params: Promise.resolve({}) })

            expect(response.status).toBe(200)
            const json: any = await response.json()
            expect(json.success).toBe(true)
        })

        it('should reject request without Authorization header', async () => {
            const mockHandler = async () => {
                return NextResponse.json({ success: true })
            }

            const middleware = secretApiKeyAuthMiddleware(mockHandler)

            const request = new NextRequest('https://example.com/api/test')

            const response = await middleware(request, { params: Promise.resolve({}) })

            expect(response.status).toBe(401)
            const json: any = await response.json()
            expect(json.error).toBe('Missing Authorization header')
        })

        it('should reject invalid API key format', async () => {
            const mockHandler = async () => {
                return NextResponse.json({ success: true })
            }

            const middleware = secretApiKeyAuthMiddleware(mockHandler)

            const request = new NextRequest('https://example.com/api/test', {
                headers: {
                    'Authorization': 'invalid_format'
                }
            })

            const response = await middleware(request, { params: Promise.resolve({}) })

            expect(response.status).toBe(401)
            const json: any = await response.json()
            expect(json.error).toContain('Invalid API key format')
        })

        it('should reject API key with wrong prefix', async () => {
            const mockHandler = async () => {
                return NextResponse.json({ success: true })
            }

            const middleware = secretApiKeyAuthMiddleware(mockHandler)

            const request = new NextRequest('https://example.com/api/test', {
                headers: {
                    'Authorization': 'pk_test_12345'
                }
            })

            const response = await middleware(request, { params: Promise.resolve({}) })

            expect(response.status).toBe(401)
            const json: any = await response.json()
            expect(json.error).toContain('Invalid API key format')
        })

        it('should reject non-existent API key', async () => {
            const mockHandler = async () => {
                return NextResponse.json({ success: true })
            }

            const middleware = secretApiKeyAuthMiddleware(mockHandler)

            const request = new NextRequest('https://example.com/api/test', {
                headers: {
                    'Authorization': 'sk_nonexistent_12345678901234567890123456789012'
                }
            })

            const response = await middleware(request, { params: Promise.resolve({}) })

            expect(response.status).toBe(401)
            const json: any = await response.json()
            expect(json.error).toBe('Invalid API key')
        })

        it('should reject API key with wrong private part', async () => {
            const mockHandler = async () => {
                return NextResponse.json({ success: true })
            }

            const middleware = secretApiKeyAuthMiddleware(mockHandler)

            const [, publicPart] = secretApiKey.fullKey.split('_')
            const wrongKey = `sk_${publicPart}_wrongprivatekey1234567890123456`

            const request = new NextRequest('https://example.com/api/test', {
                headers: {
                    'Authorization': wrongKey
                }
            })

            const response = await middleware(request, { params: Promise.resolve({}) })

            expect(response.status).toBe(401)
            const json: any = await response.json()
            expect(json.error).toBe('Invalid API key')
        })

        it('should pass request info to handler', async () => {
            let capturedRequest: any= null

            const mockHandler = async (
                context: ApiKeyAuthContext,
                db: PrismaClient,
                req: NextRequest
            ) => {
                capturedRequest = req
                return NextResponse.json({ success: true })
            }

            const middleware = secretApiKeyAuthMiddleware(mockHandler)

            const request = new NextRequest('https://example.com/api/test?param=value', {
                headers: {
                    'Authorization': secretApiKey.fullKey
                },
                method: 'POST'
            })

            await middleware(request, { params: Promise.resolve({}) })

            expect(capturedRequest).not.toBeNull()
            expect(capturedRequest?.url).toContain('/api/test?param=value')
            expect(capturedRequest?.method).toBe('POST')
        })
    })

    describe('publicApiKeyAuthMiddleware', () => {
        it('should authenticate with valid public API key', async () => {
            const mockHandler = async (
                context: ApiKeyAuthContext,
                db: PrismaClient,
                req: NextRequest
            ) => {
                expect(context.tenantId).toBe(tenantId)
                expect(context.projectId).toBe(projectId)
                expect(context.apiKey.id).toBeDefined()
                expect(context.apiKey.type).toBe('public')

                return NextResponse.json({ success: true })
            }

            const middleware = publicApiKeyAuthMiddleware(mockHandler)

            const request = new NextRequest('https://example.com/api/test', {
                headers: {
                    'Authorization': publicApiKey.fullKey
                }
            })

            const response = await middleware(request, { params: Promise.resolve({}) })

            expect(response.status).toBe(200)
            const json: any = await response.json()
            expect(json.success).toBe(true)
        })

        it('should reject request without Authorization header', async () => {
            const mockHandler = async () => {
                return NextResponse.json({ success: true })
            }

            const middleware = publicApiKeyAuthMiddleware(mockHandler)

            const request = new NextRequest('https://example.com/api/test')

            const response = await middleware(request, { params: Promise.resolve({}) })

            expect(response.status).toBe(401)
            const json: any = await response.json()
            expect(json.error).toBe('Missing Authorization header')
        })

        it('should reject invalid API key format', async () => {
            const mockHandler = async () => {
                return NextResponse.json({ success: true })
            }

            const middleware = publicApiKeyAuthMiddleware(mockHandler)

            const request = new NextRequest('https://example.com/api/test', {
                headers: {
                    'Authorization': 'invalid-key'
                }
            })

            const response = await middleware(request, { params: Promise.resolve({}) })

            expect(response.status).toBe(401)
            const json: any = await response.json()
            expect(json.error).toContain('Invalid API key format')
        })

        it('should reject API key with wrong prefix', async () => {
            const mockHandler = async () => {
                return NextResponse.json({ success: true })
            }

            const middleware = publicApiKeyAuthMiddleware(mockHandler)

            const request = new NextRequest('https://example.com/api/test', {
                headers: {
                    'Authorization': 'sk_test_12345_67890'
                }
            })

            const response = await middleware(request, { params: Promise.resolve({}) })

            expect(response.status).toBe(401)
            const json: any = await response.json()
            expect(json.error).toContain('Invalid API key format')
        })

        it('should reject non-existent public API key', async () => {
            const mockHandler = async () => {
                return NextResponse.json({ success: true })
            }

            const middleware = publicApiKeyAuthMiddleware(mockHandler)

            const request = new NextRequest('https://example.com/api/test', {
                headers: {
                    'Authorization': 'pk_nonexistentkey1'
                }
            })

            const response = await middleware(request, { params: Promise.resolve({}) })

            expect(response.status).toBe(401)
            const json: any = await response.json()
            expect(json.error).toBe('Invalid API key')
        })

        it('should not accept secret key for public endpoint', async () => {
            const mockHandler = async () => {
                return NextResponse.json({ success: true })
            }

            const middleware = publicApiKeyAuthMiddleware(mockHandler)

            const request = new NextRequest('https://example.com/api/test', {
                headers: {
                    'Authorization': secretApiKey.fullKey
                }
            })

            const response = await middleware(request, { params: Promise.resolve({}) })

            expect(response.status).toBe(401)
            const json: any = await response.json()
            expect(json.error).toContain('Invalid API key format')
        })
    })
})
