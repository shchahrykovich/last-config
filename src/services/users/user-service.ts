import 'server-only'

import { PrismaClient } from "@prisma/client"
import * as bcrypt from "bcryptjs"

export class UserService {
    constructor(private db: PrismaClient) {}

    async getUsersByTenantId(tenantId: number) {
        const users = await this.db.user.findMany({
            where: {
                tenantId
            },
            orderBy: {
                email: 'asc'
            },
            select: {
                id: true,
                email: true,
                name: true,
                tenantId: true,
                emailVerified: true,
                image: true,
            }
        })

        return users
    }

    async getUserById(userId: string, tenantId: number) {
        const user = await this.db.user.findFirst({
            where: {
                id: userId,
                tenantId
            },
            select: {
                id: true,
                email: true,
                name: true,
                tenantId: true,
                emailVerified: true,
                image: true,
            }
        })

        return user
    }

    async createUser(data: {
        email: string
        password: string
        name?: string
        tenantId: number
    }) {
        // Normalize email to lowercase
        const normalizedEmail = data.email.toLowerCase()

        // Check if user with this email already exists
        const existingUser = await this.db.user.findUnique({
            where: {
                email: normalizedEmail
            }
        })

        if (existingUser) {
            throw new Error('User with this email already exists')
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(data.password, 10)

        const user = await this.db.user.create({
            data: {
                email: normalizedEmail,
                password: hashedPassword,
                name: data.name || null,
                tenantId: data.tenantId,
            },
            select: {
                id: true,
                email: true,
                name: true,
                tenantId: true,
                emailVerified: true,
                image: true,
            }
        })

        return user
    }

    async updateUser(userId: string, tenantId: number, data: {
        name?: string
        email?: string
        password?: string
    }) {
        // Verify user exists and belongs to tenant
        const existingUser = await this.getUserById(userId, tenantId)
        if (!existingUser) {
            throw new Error('User not found')
        }

        // Normalize email to lowercase if provided
        const normalizedEmail = data.email ? data.email.toLowerCase() : undefined

        // If email is being updated, check it's not taken by another user
        if (normalizedEmail && normalizedEmail !== existingUser.email) {
            const emailTaken = await this.db.user.findFirst({
                where: {
                    email: normalizedEmail,
                    id: { not: userId }
                }
            })

            if (emailTaken) {
                throw new Error('Email is already taken')
            }
        }

        const updateData: any = {}

        if (data.name !== undefined) {
            updateData.name = data.name || null
        }

        if (normalizedEmail) {
            updateData.email = normalizedEmail
        }

        if (data.password) {
            updateData.password = await bcrypt.hash(data.password, 10)
        }

        const user = await this.db.user.update({
            where: {
                id: userId,
                tenantId
            },
            data: updateData,
            select: {
                id: true,
                email: true,
                name: true,
                tenantId: true,
                emailVerified: true,
                image: true,
            }
        })

        return user
    }

    async deleteUser(userId: string, tenantId: number) {
        // Verify user exists and belongs to tenant
        const existingUser = await this.getUserById(userId, tenantId)
        if (!existingUser) {
            throw new Error('User not found')
        }

        await this.db.user.delete({
            where: {
                id: userId,
                tenantId
            }
        })

        return { success: true }
    }
}
