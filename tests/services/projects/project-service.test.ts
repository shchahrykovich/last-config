import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { env } from 'cloudflare:test'
import { PrismaD1 } from '@prisma/adapter-d1'
import { PrismaClient } from '@prisma/client'
import { ProjectService } from '@/services/projects/project-service'
import { applyMigrations } from '../../helpers/db-setup'

describe('ProjectService', () => {
    let db: PrismaClient
    let projectService: ProjectService
    let tenantId: number

    beforeAll(async () => {
        await applyMigrations()

        const adapter = new PrismaD1(env.DB)
        db = new PrismaClient({ adapter })
        projectService = new ProjectService(db)

        // Create test tenant
        const tenant = await db.tenants.create({
            data: { isActive: true }
        })
        tenantId = tenant.id
    })

    afterAll(async () => {
        await db.projects.deleteMany({ where: { tenantId } })
        await db.tenants.deleteMany({ where: { id: tenantId } })
        await db.$disconnect()
    })

    describe('createProject', () => {
        it('should create a project successfully', async () => {
            const project = await projectService.createProject({
                name: 'Test Project',
                tenantId
            })

            expect(project).toBeDefined()
            expect(project.id).toBeDefined()
            expect(project.name).toBe('Test Project')
            expect(project.tenantId).toBe(tenantId)
            expect(project.createdAt).toBeDefined()
            expect(project.updatedAt).toBeDefined()
        })

        it('should create multiple projects with unique IDs', async () => {
            const project1 = await projectService.createProject({
                name: 'Project 1',
                tenantId
            })

            const project2 = await projectService.createProject({
                name: 'Project 2',
                tenantId
            })

            expect(project1.id).not.toBe(project2.id)
            expect(project1.name).toBe('Project 1')
            expect(project2.name).toBe('Project 2')
        })
    })

    describe('getProjectsByTenantId', () => {
        beforeAll(async () => {
            // Create test projects
            await projectService.createProject({
                name: 'List Project 1',
                tenantId
            })
            await projectService.createProject({
                name: 'List Project 2',
                tenantId
            })
        })

        it('should retrieve all projects for a tenant', async () => {
            const projects = await projectService.getProjectsByTenantId(tenantId)

            expect(projects).toBeDefined()
            expect(Array.isArray(projects)).toBe(true)
            expect(projects.length).toBeGreaterThanOrEqual(2)
        })

        it('should return projects ordered by createdAt desc', async () => {
            const projects = await projectService.getProjectsByTenantId(tenantId)

            // Check that projects are ordered from newest to oldest
            for (let i = 0; i < projects.length - 1; i++) {
                const current = new Date(projects[i].createdAt)
                const next = new Date(projects[i + 1].createdAt)
                expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime())
            }
        })

        it('should return empty array for tenant with no projects', async () => {
            const emptyTenant = await db.tenants.create({
                data: { isActive: true }
            })

            const projects = await projectService.getProjectsByTenantId(emptyTenant.id)

            expect(projects).toEqual([])

            await db.tenants.delete({ where: { id: emptyTenant.id } })
        })

        it('should not return projects from other tenants', async () => {
            // Create another tenant with a project
            const otherTenant = await db.tenants.create({
                data: { isActive: true }
            })

            await projectService.createProject({
                name: 'Other Tenant Project',
                tenantId: otherTenant.id
            })

            // Get projects for original tenant
            const projects = await projectService.getProjectsByTenantId(tenantId)

            // Should not include the other tenant's project
            const otherTenantProject = projects.find(
                p => p.name === 'Other Tenant Project'
            )
            expect(otherTenantProject).toBeUndefined()

            // Cleanup
            await db.projects.deleteMany({ where: { tenantId: otherTenant.id } })
            await db.tenants.delete({ where: { id: otherTenant.id } })
        })
    })

    describe('getProjectById', () => {
        let testProjectId: number

        beforeAll(async () => {
            const project = await projectService.createProject({
                name: 'Get By ID Project',
                tenantId
            })
            testProjectId = project.id
        })

        it('should retrieve a project by ID and tenant ID', async () => {
            const project = await projectService.getProjectById(testProjectId, tenantId)

            expect(project).toBeDefined()
            expect(project?.id).toBe(testProjectId)
            expect(project?.name).toBe('Get By ID Project')
            expect(project?.tenantId).toBe(tenantId)
        })

        it('should return null for non-existent project ID', async () => {
            const project = await projectService.getProjectById(999999, tenantId)

            expect(project).toBeNull()
        })

        it('should return null when project exists but tenant ID does not match', async () => {
            const otherTenant = await db.tenants.create({
                data: { isActive: true }
            })

            const project = await projectService.getProjectById(testProjectId, otherTenant.id)

            expect(project).toBeNull()

            await db.tenants.delete({ where: { id: otherTenant.id } })
        })

        it('should enforce tenant isolation', async () => {
            // Create project in another tenant
            const otherTenant = await db.tenants.create({
                data: { isActive: true }
            })

            const otherProject = await projectService.createProject({
                name: 'Other Tenant Isolated Project',
                tenantId: otherTenant.id
            })

            // Try to access with wrong tenant ID
            const result = await projectService.getProjectById(otherProject.id, tenantId)

            expect(result).toBeNull()

            // Cleanup
            await db.projects.deleteMany({ where: { tenantId: otherTenant.id } })
            await db.tenants.delete({ where: { id: otherTenant.id } })
        })
    })
})
