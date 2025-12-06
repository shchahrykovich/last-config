import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { env } from 'cloudflare:test'
import { PrismaD1 } from '@prisma/adapter-d1'
import { PrismaClient } from '@prisma/client'
import { UserService } from '@/services/users/user-service'
import * as bcrypt from 'bcryptjs'
import { applyMigrations } from '../../helpers/db-setup'

describe('UserService', () => {
    let db: PrismaClient
    let userService: UserService
    let tenantId: number
    let otherTenantId: number

    beforeAll(async () => {
        // Apply database migrations
        await applyMigrations()

        // Initialize Prisma with D1 adapter
        const adapter = new PrismaD1(env.DB)
        db = new PrismaClient({ adapter })
        userService = new UserService(db)

        // Create test tenants
        const tenant = await db.tenants.create({
            data: {
                isActive: true,
            }
        })
        tenantId = tenant.id

        const otherTenant = await db.tenants.create({
            data: {
                isActive: true,
            }
        })
        otherTenantId = otherTenant.id
    })

    afterAll(async () => {
        // Cleanup: delete test data
        await db.user.deleteMany({
            where: {
                OR: [
                    { tenantId },
                    { tenantId: otherTenantId }
                ]
            }
        })
        await db.tenants.deleteMany({
            where: {
                id: { in: [tenantId, otherTenantId] }
            }
        })
        await db.$disconnect()
    })

    describe('createUser', () => {
        it('should create a user with hashed password', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                name: 'Test User',
                tenantId
            }

            const user = await userService.createUser(userData)

            expect(user).toBeDefined()
            expect(user.id).toBeDefined()
            expect(user.email).toBe('test@example.com')
            expect(user.name).toBe('Test User')
            expect(user.tenantId).toBe(tenantId)
            expect(user.emailVerified).toBeNull()
            expect(user.image).toBeNull()
            expect((user as any).password).toBeUndefined() // password should not be in response

            // Verify password is hashed in database
            const dbUser = await db.user.findUnique({
                where: { id: user.id }
            })
            expect(dbUser?.password).toBeDefined()
            expect(dbUser?.password).not.toBe('password123')
            const isValidHash = await bcrypt.compare('password123', dbUser!.password!)
            expect(isValidHash).toBe(true)
        })

        it('should normalize email to lowercase', async () => {
            const user = await userService.createUser({
                email: 'Test@EXAMPLE.COM',
                password: 'password123',
                tenantId
            })

            expect(user.email).toBe('test@example.com')
        })

        it('should create user without name (optional)', async () => {
            const user = await userService.createUser({
                email: 'noname@example.com',
                password: 'password123',
                tenantId
            })

            expect(user.name).toBeNull()
        })

        it('should throw error when creating user with existing email', async () => {
            const userData = {
                email: 'duplicate@example.com',
                password: 'password123',
                tenantId
            }

            await userService.createUser(userData)

            // Try to create another user with same email
            await expect(
                userService.createUser(userData)
            ).rejects.toThrow('User with this email already exists')
        })

        it('should throw error when creating user with existing email (case insensitive)', async () => {
            await userService.createUser({
                email: 'casetest@example.com',
                password: 'password123',
                tenantId
            })

            // Try with different case
            await expect(
                userService.createUser({
                    email: 'CASETEST@EXAMPLE.COM',
                    password: 'password123',
                    tenantId
                })
            ).rejects.toThrow('User with this email already exists')
        })
    })

    describe('getUsersByTenantId', () => {
        it('should retrieve all users for a tenant', async () => {
            // Create multiple users for tenant
            await userService.createUser({
                email: 'user1@example.com',
                password: 'password123',
                name: 'User 1',
                tenantId
            })
            await userService.createUser({
                email: 'user2@example.com',
                password: 'password123',
                name: 'User 2',
                tenantId
            })

            const users = await userService.getUsersByTenantId(tenantId)

            expect(users).toBeDefined()
            expect(Array.isArray(users)).toBe(true)
            expect(users.length).toBeGreaterThanOrEqual(2)

            // Verify passwords are not included
            users.forEach(user => {
                expect(user.id).toBeDefined()
                expect(user.email).toBeDefined()
                expect(user.tenantId).toBe(tenantId)
                expect((user as any).password).toBeUndefined()
            })
        })

        it('should return users sorted by email', async () => {
            const users = await userService.getUsersByTenantId(tenantId)

            // Check if sorted alphabetically by email
            for (let i = 1; i < users.length; i++) {
                expect(users[i - 1].email.localeCompare(users[i].email)).toBeLessThanOrEqual(0)
            }
        })

        it('should not return users from other tenants', async () => {
            // Create user in other tenant
            await userService.createUser({
                email: 'othertenant@example.com',
                password: 'password123',
                tenantId: otherTenantId
            })

            const users = await userService.getUsersByTenantId(tenantId)

            // Should not include the user from other tenant
            const otherTenantUser = users.find(u => u.email === 'othertenant@example.com')
            expect(otherTenantUser).toBeUndefined()
        })

        it('should return empty array for tenant with no users', async () => {
            const emptyTenant = await db.tenants.create({
                data: { isActive: true }
            })

            const users = await userService.getUsersByTenantId(emptyTenant.id)

            expect(users).toBeDefined()
            expect(Array.isArray(users)).toBe(true)
            expect(users.length).toBe(0)

            // Cleanup
            await db.tenants.delete({ where: { id: emptyTenant.id } })
        })
    })

    describe('getUserById', () => {
        it('should retrieve user by ID and tenantId', async () => {
            const createdUser = await userService.createUser({
                email: 'getbyid@example.com',
                password: 'password123',
                name: 'Get By ID User',
                tenantId
            })

            const user = await userService.getUserById(createdUser.id, tenantId)

            expect(user).not.toBeNull()
            expect(user?.id).toBe(createdUser.id)
            expect(user?.email).toBe('getbyid@example.com')
            expect(user?.name).toBe('Get By ID User')
            expect(user?.tenantId).toBe(tenantId)
            expect((user as any)?.password).toBeUndefined()
        })

        it('should return null for non-existent user', async () => {
            const user = await userService.getUserById('non-existent-id', tenantId)
            expect(user).toBeNull()
        })

        it('should return null when user belongs to different tenant', async () => {
            const createdUser = await userService.createUser({
                email: 'wrongtenant@example.com',
                password: 'password123',
                tenantId
            })

            // Try to get with wrong tenant ID
            const user = await userService.getUserById(createdUser.id, otherTenantId)
            expect(user).toBeNull()
        })
    })

    describe('updateUser', () => {
        it('should update user name', async () => {
            const createdUser = await userService.createUser({
                email: 'update@example.com',
                password: 'password123',
                name: 'Original Name',
                tenantId
            })

            const updatedUser = await userService.updateUser(createdUser.id, tenantId, {
                name: 'Updated Name'
            })

            expect(updatedUser.name).toBe('Updated Name')
            expect(updatedUser.email).toBe('update@example.com') // unchanged
        })

        it('should update user email', async () => {
            const createdUser = await userService.createUser({
                email: 'oldemail@example.com',
                password: 'password123',
                tenantId
            })

            const updatedUser = await userService.updateUser(createdUser.id, tenantId, {
                email: 'newemail@example.com'
            })

            expect(updatedUser.email).toBe('newemail@example.com')
        })

        it('should normalize email to lowercase when updating', async () => {
            const createdUser = await userService.createUser({
                email: 'emailupdate@example.com',
                password: 'password123',
                tenantId
            })

            const updatedUser = await userService.updateUser(createdUser.id, tenantId, {
                email: 'NEWEMAIL@EXAMPLE.COM'
            })

            expect(updatedUser.email).toBe('newemail@example.com')
        })

        it('should update user password', async () => {
            const createdUser = await userService.createUser({
                email: 'passwordupdate@example.com',
                password: 'oldpassword',
                tenantId
            })

            await userService.updateUser(createdUser.id, tenantId, {
                password: 'newpassword'
            })

            // Verify new password is hashed correctly
            const dbUser = await db.user.findUnique({
                where: { id: createdUser.id }
            })
            const isValidHash = await bcrypt.compare('newpassword', dbUser!.password!)
            expect(isValidHash).toBe(true)

            // Verify old password no longer works
            const isOldPasswordValid = await bcrypt.compare('oldpassword', dbUser!.password!)
            expect(isOldPasswordValid).toBe(false)
        })

        it('should update multiple fields at once', async () => {
            const createdUser = await userService.createUser({
                email: 'multiupdate@example.com',
                password: 'password123',
                name: 'Old Name',
                tenantId
            })

            const updatedUser = await userService.updateUser(createdUser.id, tenantId, {
                name: 'New Name',
                email: 'newemail@example.com',
                password: 'newpassword'
            })

            expect(updatedUser.name).toBe('New Name')
            expect(updatedUser.email).toBe('newemail@example.com')

            // Verify password is updated
            const dbUser = await db.user.findUnique({
                where: { id: createdUser.id }
            })
            const isValidHash = await bcrypt.compare('newpassword', dbUser!.password!)
            expect(isValidHash).toBe(true)
        })

        it('should set name to null when updating with empty string', async () => {
            const createdUser = await userService.createUser({
                email: 'nullname@example.com',
                password: 'password123',
                name: 'Has Name',
                tenantId
            })

            const updatedUser = await userService.updateUser(createdUser.id, tenantId, {
                name: ''
            })

            expect(updatedUser.name).toBeNull()
        })

        it('should throw error when updating non-existent user', async () => {
            await expect(
                userService.updateUser('non-existent-id', tenantId, {
                    name: 'New Name'
                })
            ).rejects.toThrow('User not found')
        })

        it('should throw error when updating user from different tenant', async () => {
            const createdUser = await userService.createUser({
                email: 'wrongtenantupdate@example.com',
                password: 'password123',
                tenantId
            })

            await expect(
                userService.updateUser(createdUser.id, otherTenantId, {
                    name: 'New Name'
                })
            ).rejects.toThrow('User not found')
        })

        it('should throw error when updating email to one that already exists', async () => {
            await userService.createUser({
                email: 'existing@example.com',
                password: 'password123',
                tenantId
            })

            const otherUser = await userService.createUser({
                email: 'other@example.com',
                password: 'password123',
                tenantId
            })

            await expect(
                userService.updateUser(otherUser.id, tenantId, {
                    email: 'existing@example.com'
                })
            ).rejects.toThrow('Email is already taken')
        })

        it('should allow updating email to same email (case insensitive)', async () => {
            const createdUser = await userService.createUser({
                email: 'sameemail@example.com',
                password: 'password123',
                tenantId
            })

            // Should not throw error when "updating" to same email with different case
            const updatedUser = await userService.updateUser(createdUser.id, tenantId, {
                email: 'SAMEEMAIL@EXAMPLE.COM'
            })

            expect(updatedUser.email).toBe('sameemail@example.com')
        })
    })

    describe('deleteUser', () => {
        it('should delete a user', async () => {
            const createdUser = await userService.createUser({
                email: 'delete@example.com',
                password: 'password123',
                tenantId
            })

            const result = await userService.deleteUser(createdUser.id, tenantId)
            expect(result.success).toBe(true)

            // Verify user is actually deleted
            const deletedUser = await db.user.findUnique({
                where: { id: createdUser.id }
            })
            expect(deletedUser).toBeNull()
        })

        it('should throw error when deleting non-existent user', async () => {
            await expect(
                userService.deleteUser('non-existent-id', tenantId)
            ).rejects.toThrow('User not found')
        })

        it('should throw error when deleting user from different tenant', async () => {
            const createdUser = await userService.createUser({
                email: 'wrongtenantdelete@example.com',
                password: 'password123',
                tenantId
            })

            await expect(
                userService.deleteUser(createdUser.id, otherTenantId)
            ).rejects.toThrow('User not found')
        })
    })
})
