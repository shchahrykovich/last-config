import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { env } from 'cloudflare:test'
import { PrismaD1 } from '@prisma/adapter-d1'
import { PrismaClient } from '@prisma/client'
import { FeatureFlagService } from '@/services/feature-flags/feature-flag-service'
import { applyMigrations } from '../../helpers/db-setup'

describe('FeatureFlagService', () => {
    let db: PrismaClient
    let featureFlagService: FeatureFlagService
    let tenantId: number
    let projectId: number

    beforeAll(async () => {
        await applyMigrations()

        const adapter = new PrismaD1(env.DB)
        db = new PrismaClient({ adapter })
        featureFlagService = new FeatureFlagService(db)

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
        await db.featureFlags.deleteMany({ where: { tenantId } })
        await db.projects.deleteMany({ where: { tenantId } })
        await db.tenants.deleteMany({ where: { id: tenantId } })
        await db.$disconnect()
    })

    describe('createFeatureFlag', () => {
        it('should create a feature flag with default values', async () => {
            const flag = await featureFlagService.createFeatureFlag({
                name: 'new_ui',
                projectId,
                tenantId
            })

            expect(flag).toBeDefined()
            expect(flag.name).toBe('new_ui')
            expect(flag.type).toBe('string')
            expect(flag.value).toBe('')
            expect(flag.isPublic).toBe(false)
            expect(flag.userId).toBe('')
            expect(flag.userRole).toBe('')
            expect(flag.userAccountId).toBe('')
        })

        it('should create a feature flag with all fields', async () => {
            const flag = await featureFlagService.createFeatureFlag({
                name: 'dark_mode',
                description: 'Enable dark mode',
                type: 'boolean',
                value: 'true',
                userId: 'user123',
                userRole: 'admin',
                userAccountId: 'acc456',
                isPublic: true,
                projectId,
                tenantId
            })

            expect(flag.name).toBe('dark_mode')
            expect(flag.description).toBe('Enable dark mode')
            expect(flag.type).toBe('boolean')
            expect(flag.value).toBe('true')
            expect(flag.userId).toBe('user123')
            expect(flag.userRole).toBe('admin')
            expect(flag.userAccountId).toBe('acc456')
            expect(flag.isPublic).toBe(true)
        })
    })

    describe('getFeatureFlagsByProjectId', () => {
        it('should retrieve all feature flags for a project', async () => {
            await featureFlagService.createFeatureFlag({
                name: 'feature1',
                projectId,
                tenantId
            })

            const flags = await featureFlagService.getFeatureFlagsByProjectId(projectId, tenantId)

            expect(flags.length).toBeGreaterThanOrEqual(1)
        })
    })

    describe('updateFeatureFlag', () => {
        it('should update feature flag', async () => {
            const flag = await featureFlagService.createFeatureFlag({
                name: 'beta_feature',
                value: 'false',
                projectId,
                tenantId
            })

            const updated = await featureFlagService.updateFeatureFlag(flag.id, tenantId, {
                value: 'true',
                description: 'Beta feature enabled'
            })

            expect(updated.value).toBe('true')
            expect(updated.description).toBe('Beta feature enabled')
        })

        it('should throw error for non-existent flag', async () => {
            await expect(
                featureFlagService.updateFeatureFlag(999999, tenantId, { value: 'test' })
            ).rejects.toThrow('Feature flag not found')
        })
    })

    describe('deleteFeatureFlag', () => {
        it('should delete a feature flag', async () => {
            const flag = await featureFlagService.createFeatureFlag({
                name: 'to_delete',
                projectId,
                tenantId
            })

            const result = await featureFlagService.deleteFeatureFlag(flag.id, tenantId)

            expect(result.success).toBe(true)

            const deleted = await featureFlagService.getFeatureFlagById(flag.id, tenantId)
            expect(deleted).toBeNull()
        })
    })

    describe('getFeatureFlagsByNamesWithPriority', () => {
        beforeAll(async () => {
            // Clear existing flags
            await db.featureFlags.deleteMany({ where: { projectId } })

            // Create flags with different priorities
            await featureFlagService.createFeatureFlag({
                name: 'premium_feature',
                value: 'default',
                userId: '',
                userRole: '',
                userAccountId: '',
                projectId,
                tenantId
            })

            await featureFlagService.createFeatureFlag({
                name: 'premium_feature',
                value: 'for_account',
                userId: '',
                userRole: '',
                userAccountId: 'acc123',
                projectId,
                tenantId
            })

            await featureFlagService.createFeatureFlag({
                name: 'premium_feature',
                value: 'for_user',
                userId: 'user456',
                userRole: 'admin',
                userAccountId: 'acc123',
                projectId,
                tenantId
            })
        })

        it('should return highest priority match', async () => {
            const flags = await featureFlagService.getFeatureFlagsByNamesWithPriority(
                projectId,
                tenantId,
                ['premium_feature'],
                'user456',
                'admin',
                'acc123'
            )

            expect(flags.length).toBe(1)
            expect(flags[0].value).toBe('for_user')
        })

        it('should fall back to account-level flag', async () => {
            const flags = await featureFlagService.getFeatureFlagsByNamesWithPriority(
                projectId,
                tenantId,
                ['premium_feature'],
                undefined,
                undefined,
                'acc123'
            )

            expect(flags.length).toBe(1)
            expect(flags[0].value).toBe('for_account')
        })

        it('should fall back to default flag', async () => {
            const flags = await featureFlagService.getFeatureFlagsByNamesWithPriority(
                projectId,
                tenantId,
                ['premium_feature']
            )

            expect(flags.length).toBe(1)
            expect(flags[0].value).toBe('default')
        })
    })

    describe('getPublicFeatureFlagsByNamesWithPriority', () => {
        beforeAll(async () => {
            await db.featureFlags.deleteMany({ where: { projectId } })

            await featureFlagService.createFeatureFlag({
                name: 'public_feature',
                value: 'public_default',
                isPublic: true,
                userId: '',
                userRole: '',
                userAccountId: '',
                projectId,
                tenantId
            })

            await featureFlagService.createFeatureFlag({
                name: 'private_feature',
                value: 'private',
                isPublic: false,
                projectId,
                tenantId
            })
        })

        it('should only return public flags', async () => {
            const flags = await featureFlagService.getPublicFeatureFlagsByNamesWithPriority(
                projectId,
                tenantId,
                ['public_feature', 'private_feature']
            )

            expect(flags.length).toBe(1)
            expect(flags[0].name).toBe('public_feature')
            expect(flags[0].isPublic).toBe(true)
        })
    })
})
