import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { env } from 'cloudflare:test'
import { PrismaD1 } from '@prisma/adapter-d1'
import { PrismaClient } from '@prisma/client'
import { ApiKeyService } from '@/services/api-keys/api-key-service'
import { PromptService } from '@/services/prompts/prompt-service'

describe('V1 Prompts API', () => {
    let db: PrismaClient
    let apiKeyService: ApiKeyService
    let promptService: PromptService
    let tenantId: number
    let projectId: number
    let validApiKey: string
    let promptId: number

    beforeAll(async () => {
        // Initialize Prisma with D1 adapter
        const adapter = new PrismaD1(env.DB)
        db = new PrismaClient({ adapter })
        apiKeyService = new ApiKeyService(db)
        promptService = new PromptService(db)

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

        // Create a valid API key
        const result = await apiKeyService.createApiKey({
            projectId,
            tenantId,
        })
        validApiKey = result.fullKey

        // Create test prompts
        const prompt = await promptService.createPrompt({
            name: 'Test Prompt',
            body: {
                model: 'gpt-4',
                messages: [
                    { role: 'system', content: 'You are a helpful assistant.' }
                ]
            },
            projectId,
            tenantId,
        })
        promptId = prompt.id
    })

    afterAll(async () => {
        // Cleanup
        await db.prompts.deleteMany({ where: { tenantId } })
        await db.apiKeys.deleteMany({ where: { tenantId } })
        await db.projects.deleteMany({ where: { tenantId } })
        await db.tenants.deleteMany({ where: { id: tenantId } })
        await db.$disconnect()
    })

    describe('GET /api/v1/prompts', () => {
        it('should return all prompts for the project', async () => {
            const response = await env.ASSETS.fetch('http://localhost/api/v1/prompts', {
                headers: {
                    'Authorization': `Bearer ${validApiKey}`
                }
            })

            expect(response.status).toBe(200)

            const data = await response.json()
            expect(data.prompts).toBeDefined()
            expect(Array.isArray(data.prompts)).toBe(true)
            expect(data.prompts.length).toBeGreaterThan(0)

            // Check first prompt structure
            const prompt = data.prompts[0]
            expect(prompt.id).toBeDefined()
            expect(prompt.name).toBeDefined()
            expect(prompt.body).toBeDefined()
            expect(prompt.projectId).toBe(projectId)
            expect(prompt.createdAt).toBeDefined()
            expect(prompt.updatedAt).toBeDefined()

            // Verify body is parsed JSON (not string)
            expect(typeof prompt.body).toBe('object')
        })

        it('should return 401 without API key', async () => {
            const response = await env.ASSETS.fetch('http://localhost/api/v1/prompts')

            expect(response.status).toBe(401)
        })

        it('should return 401 with invalid API key', async () => {
            const response = await env.ASSETS.fetch('http://localhost/api/v1/prompts', {
                headers: {
                    'Authorization': 'Bearer sk_invalid_key'
                }
            })

            expect(response.status).toBe(401)
        })

        it('should only return prompts for the API key project', async () => {
            // Create another project with a prompt
            const otherProject = await db.projects.create({
                data: {
                    name: 'Other Project',
                    tenantId,
                }
            })

            await promptService.createPrompt({
                name: 'Other Prompt',
                body: { message: 'test' },
                projectId: otherProject.id,
                tenantId,
            })

            const response = await env.ASSETS.fetch('http://localhost/api/v1/prompts', {
                headers: {
                    'Authorization': `Bearer ${validApiKey}`
                }
            })

            expect(response.status).toBe(200)

            const data = await response.json()

            // Should only include prompts from our project
            data.prompts.forEach((prompt: any) => {
                expect(prompt.projectId).toBe(projectId)
            })

            // Cleanup
            await db.prompts.deleteMany({ where: { projectId: otherProject.id } })
            await db.projects.delete({ where: { id: otherProject.id } })
        })
    })

    describe('GET /api/v1/prompts/[id]', () => {
        it('should return a specific prompt by ID', async () => {
            const response = await env.ASSETS.fetch(`http://localhost/api/v1/prompts/${promptId}`, {
                headers: {
                    'Authorization': `Bearer ${validApiKey}`
                }
            })

            expect(response.status).toBe(200)

            const data = await response.json()
            expect(data.prompt).toBeDefined()
            expect(data.prompt.id).toBe(promptId)
            expect(data.prompt.name).toBe('Test Prompt')
            expect(data.prompt.projectId).toBe(projectId)

            // Verify body is parsed JSON
            expect(typeof data.prompt.body).toBe('object')
            expect(data.prompt.body.model).toBe('gpt-4')
            expect(data.prompt.body.messages).toBeDefined()
        })

        it('should return 404 for non-existent prompt', async () => {
            const response = await env.ASSETS.fetch('http://localhost/api/v1/prompts/99999', {
                headers: {
                    'Authorization': `Bearer ${validApiKey}`
                }
            })

            expect(response.status).toBe(404)

            const data = await response.json()
            expect(data.error).toBe('Prompt not found')
        })

        it('should return 400 for invalid prompt ID', async () => {
            const response = await env.ASSETS.fetch('http://localhost/api/v1/prompts/invalid', {
                headers: {
                    'Authorization': `Bearer ${validApiKey}`
                }
            })

            expect(response.status).toBe(400)

            const data = await response.json()
            expect(data.error).toBe('Invalid prompt ID')
        })

        it('should not return prompts from different projects', async () => {
            // Create another project with API key
            const otherProject = await db.projects.create({
                data: {
                    name: 'Other Project',
                    tenantId,
                }
            })

            const otherApiKeyResult = await apiKeyService.createApiKey({
                projectId: otherProject.id,
                tenantId,
            })

            const otherPrompt = await promptService.createPrompt({
                name: 'Other Project Prompt',
                body: { message: 'test' },
                projectId: otherProject.id,
                tenantId,
            })

            // Try to access other project's prompt with our API key
            const response = await env.ASSETS.fetch(`http://localhost/api/v1/prompts/${otherPrompt.id}`, {
                headers: {
                    'Authorization': `Bearer ${validApiKey}`
                }
            })

            expect(response.status).toBe(404)

            // Cleanup
            await db.prompts.deleteMany({ where: { projectId: otherProject.id } })
            await db.apiKeys.deleteMany({ where: { projectId: otherProject.id } })
            await db.projects.delete({ where: { id: otherProject.id } })
        })

        it('should return 401 without API key', async () => {
            const response = await env.ASSETS.fetch(`http://localhost/api/v1/prompts/${promptId}`)

            expect(response.status).toBe(401)
        })

        it('should return 401 with invalid API key', async () => {
            const response = await env.ASSETS.fetch(`http://localhost/api/v1/prompts/${promptId}`, {
                headers: {
                    'Authorization': 'Bearer sk_invalid_key'
                }
            })

            expect(response.status).toBe(401)
        })
    })
})
