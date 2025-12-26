import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { env } from 'cloudflare:test'
import { PrismaD1 } from '@prisma/adapter-d1'
import { PrismaClient } from '@prisma/client'
import { PromptService } from '@/services/prompts/prompt-service'
import { applyMigrations } from '../../helpers/db-setup'

describe('PromptService', () => {
    let db: PrismaClient
    let promptService: PromptService
    let tenantId: number
    let projectId: number

    beforeAll(async () => {
        await applyMigrations()

        const adapter = new PrismaD1(env.DB)
        db = new PrismaClient({ adapter })
        promptService = new PromptService(db)

        const tenant = await db.tenants.create({
            data: { isActive: true }
        })
        tenantId = tenant.id

        const project = await db.projects.create({
            data: { name: 'Test Project', tenantId }
        })
        projectId = project.id
    })

    afterAll(async () => {
        await db.prompts.deleteMany({ where: { tenantId } })
        await db.projects.deleteMany({ where: { tenantId } })
        await db.tenants.deleteMany({ where: { id: tenantId } })
        await db.$disconnect()
    })

    describe('createPrompt', () => {
        it('should create a prompt with JSON body', async () => {
            const body = {
                model: 'gpt-4',
                systemMessage: 'You are a helpful assistant.',
                userMessage: 'How can I help you?',
            }

            const prompt = await promptService.createPrompt({
                name: 'Test Prompt',
                body,
                projectId,
                tenantId
            })

            expect(prompt).toBeDefined()
            expect(prompt.id).toBeDefined()
            expect(prompt.name).toBe('Test Prompt')
            expect(prompt.projectId).toBe(projectId)
            expect(prompt.tenantId).toBe(tenantId)
            expect(typeof prompt.body).toBe('string')
            expect(JSON.parse(prompt.body)).toEqual(body)
        })

        it('should allow creating a prompt without system message and model', async () => {
            const body = {
                userMessage: 'Plain text prompt without model',
            }

            const prompt = await promptService.createPrompt({
                name: 'No Model Prompt',
                body,
                projectId,
                tenantId
            })

            expect(JSON.parse(prompt.body)).toEqual(body)
        })
    })

    describe('getPromptsByProjectId', () => {
        it('should retrieve all prompts for a project', async () => {
            await promptService.createPrompt({
                name: 'List Prompt 1',
                body: { userMessage: 'Test user message', test: 'data1' },
                projectId,
                tenantId
            })

            const prompts = await promptService.getPromptsByProjectId(projectId, tenantId)

            expect(prompts).toBeDefined()
            expect(Array.isArray(prompts)).toBe(true)
            expect(prompts.length).toBeGreaterThanOrEqual(1)
        })
    })

    describe('updatePrompt', () => {
        it('should update prompt name and body', async () => {
            const prompt = await promptService.createPrompt({
                name: 'Update Prompt',
                body: { userMessage: 'Original', systemMessage: 'System', model: 'gpt-3.5-turbo' },
                projectId,
                tenantId
            })

            const newBody = { userMessage: 'Updated', systemMessage: 'New System', model: 'gpt-4' }
            const updated = await promptService.updatePrompt(
                prompt.id,
                projectId,
                tenantId,
                { name: 'Updated', body: newBody }
            )

            expect(updated).toBeDefined()
            expect(updated?.name).toBe('Updated')
            expect(JSON.parse(updated!.body)).toEqual(newBody)
        })

        it('should remove model and system message when they are omitted on update', async () => {
            const prompt = await promptService.createPrompt({
                name: 'Model Removal',
                body: { userMessage: 'Has model', systemMessage: 'System', model: 'gpt-4' },
                projectId,
                tenantId
            })

            const updated = await promptService.updatePrompt(
                prompt.id,
                projectId,
                tenantId,
                { body: { userMessage: 'No model now' } }
            )

            expect(updated).toBeDefined()
            expect(JSON.parse(updated!.body)).toEqual({ userMessage: 'No model now' })
        })

        it('should return null for non-existent prompt', async () => {
            const updated = await promptService.updatePrompt(
                999999,
                projectId,
                tenantId,
                { name: 'Does Not Exist' }
            )

            expect(updated).toBeNull()
        })
    })

    describe('deletePrompt', () => {
        it('should delete an existing prompt', async () => {
            const prompt = await promptService.createPrompt({
                name: 'Delete Me',
                body: { userMessage: 'To be removed' },
                projectId,
                tenantId
            })

            const deleted = await promptService.deletePrompt(prompt.id, projectId, tenantId)
            const fetched = await promptService.getPromptById(prompt.id, tenantId, projectId)

            expect(deleted).toBe(true)
            expect(fetched).toBeNull()
        })

        it('should return false when prompt does not exist', async () => {
            const deleted = await promptService.deletePrompt(999999, projectId, tenantId)
            expect(deleted).toBe(false)
        })
    })

    describe('verifyProjectAccess', () => {
        it('should return true for valid project', async () => {
            const hasAccess = await promptService.verifyProjectAccess(projectId, tenantId)
            expect(hasAccess).toBe(true)
        })

        it('should return false for invalid project', async () => {
            const hasAccess = await promptService.verifyProjectAccess(999999, tenantId)
            expect(hasAccess).toBe(false)
        })
    })
})
