import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { env } from 'cloudflare:test'
import { PrismaD1 } from '@prisma/adapter-d1'
import { PrismaClient } from '@prisma/client'
import { ConfigService } from '@/services/config/config-service'
import { applyMigrations } from '../../helpers/db-setup'

describe('ConfigService', () => {
    let db: PrismaClient
    let configService: ConfigService
    let tenantId: number
    let projectId: number

    beforeAll(async () => {
        await applyMigrations()

        const adapter = new PrismaD1(env.DB)
        db = new PrismaClient({ adapter })
        configService = new ConfigService(db)

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
        await db.configRecords.deleteMany({ where: { tenantId } })
        await db.projects.deleteMany({ where: { tenantId } })
        await db.tenants.deleteMany({ where: { id: tenantId } })
        await db.$disconnect()
    })

    describe('createConfig', () => {
        it('should create a config with default values', async () => {
            const config = await configService.createConfig({
                name: 'API_URL',
                projectId,
                tenantId
            })

            expect(config).toBeDefined()
            expect(config.name).toBe('API_URL')
            expect(config.type).toBe('string')
            expect(config.value).toBe('')
            expect(config.description).toBe('')
            expect(config.isPublic).toBe(false)
        })

        it('should create a config with all fields', async () => {
            const config = await configService.createConfig({
                name: 'MAX_RETRIES',
                description: 'Maximum retry attempts',
                type: 'number',
                value: '3',
                isPublic: true,
                projectId,
                tenantId
            })

            expect(config.name).toBe('MAX_RETRIES')
            expect(config.description).toBe('Maximum retry attempts')
            expect(config.type).toBe('number')
            expect(config.value).toBe('3')
            expect(config.isPublic).toBe(true)
        })
    })

    describe('getConfigsByProjectId', () => {
        beforeAll(async () => {
            await configService.createConfig({
                name: 'PUBLIC_KEY',
                isPublic: true,
                projectId,
                tenantId
            })
            await configService.createConfig({
                name: 'PRIVATE_KEY',
                isPublic: false,
                projectId,
                tenantId
            })
        })

        it('should retrieve all configs for a project', async () => {
            const configs = await configService.getConfigsByProjectId(projectId, tenantId)

            expect(configs.length).toBeGreaterThanOrEqual(2)
        })

        it('should filter by isPublic=true', async () => {
            const configs = await configService.getConfigsByProjectId(projectId, tenantId, true)

            expect(configs.every(c => c.isPublic === true)).toBe(true)
        })

        it('should filter by isPublic=false', async () => {
            const configs = await configService.getConfigsByProjectId(projectId, tenantId, false)

            expect(configs.every(c => c.isPublic === false)).toBe(true)
        })
    })

    describe('updateConfig', () => {
        it('should update config fields', async () => {
            const config = await configService.createConfig({
                name: 'TIMEOUT',
                value: '30',
                projectId,
                tenantId
            })

            const updated = await configService.updateConfig(config.id, tenantId, {
                value: '60',
                description: 'Request timeout in seconds'
            })

            expect(updated.value).toBe('60')
            expect(updated.description).toBe('Request timeout in seconds')
        })

        it('should throw error for non-existent config', async () => {
            await expect(
                configService.updateConfig(999999, tenantId, { value: 'test' })
            ).rejects.toThrow('Config not found')
        })
    })

    describe('deleteConfig', () => {
        it('should delete a config', async () => {
            const config = await configService.createConfig({
                name: 'TO_DELETE',
                projectId,
                tenantId
            })

            const result = await configService.deleteConfig(config.id, tenantId)

            expect(result.success).toBe(true)

            const deleted = await configService.getConfigById(config.id, tenantId)
            expect(deleted).toBeNull()
        })

        it('should throw error when deleting non-existent config', async () => {
            await expect(
                configService.deleteConfig(999999, tenantId)
            ).rejects.toThrow('Config not found')
        })
    })

    describe('verifyProjectAccess', () => {
        it('should return true for valid project', async () => {
            const hasAccess = await configService.verifyProjectAccess(projectId, tenantId)
            expect(hasAccess).toBe(true)
        })

        it('should return false for invalid project', async () => {
            const hasAccess = await configService.verifyProjectAccess(999999, tenantId)
            expect(hasAccess).toBe(false)
        })
    })
})
