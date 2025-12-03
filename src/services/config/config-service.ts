import 'server-only'

import { PrismaClient } from "@prisma/client"

export class ConfigService {
    constructor(private db: PrismaClient) {}

    async verifyProjectAccess(projectId: number, tenantId: number): Promise<boolean> {
        const project = await this.db.projects.findFirst({
            where: {
                id: projectId,
                tenantId
            }
        })
        return !!project
    }

    async getConfigsByProjectId(projectId: number, tenantId: number, isPublic?: boolean) {
        const where: any = {
            projectId,
            tenantId
        }

        if (isPublic !== undefined) {
            where.isPublic = isPublic
        }

        const configs = await this.db.configRecords.findMany({
            where,
            orderBy: {
                createdAt: 'desc'
            }
        })

        return configs
    }

    async getConfigById(configId: number, tenantId: number) {
        const config = await this.db.configRecords.findFirst({
            where: {
                id: configId,
                tenantId
            }
        })

        return config
    }

    async createConfig(data: {
        name: string
        description?: string
        type?: string
        value?: string
        isPublic?: boolean
        projectId: number
        tenantId: number
    }) {
        const config = await this.db.configRecords.create({
            data: {
                name: data.name,
                description: data.description || '',
                type: data.type || 'string',
                value: data.value || '',
                isPublic: data.isPublic ?? false,
                projectId: data.projectId,
                tenantId: data.tenantId,
            }
        })

        return config
    }

    async updateConfig(configId: number, tenantId: number, data: {
        name?: string
        description?: string
        type?: string
        value?: string
        isPublic?: boolean
    }) {
        // Verify config exists and belongs to tenant
        const existingConfig = await this.getConfigById(configId, tenantId)
        if (!existingConfig) {
            throw new Error('Config not found')
        }

        const updateData: any = {}

        if (data.name !== undefined) {
            updateData.name = data.name
        }

        if (data.description !== undefined) {
            updateData.description = data.description
        }

        if (data.type !== undefined) {
            updateData.type = data.type
        }

        if (data.value !== undefined) {
            updateData.value = data.value
        }

        if (data.isPublic !== undefined) {
            updateData.isPublic = data.isPublic
        }

        const config = await this.db.configRecords.update({
            where: {
                id: configId,
                tenantId
            },
            data: updateData
        })

        return config
    }

    async deleteConfig(configId: number, tenantId: number) {
        // Verify config exists and belongs to tenant
        const existingConfig = await this.getConfigById(configId, tenantId)
        if (!existingConfig) {
            throw new Error('Config not found')
        }

        await this.db.configRecords.delete({
            where: {
                id: configId,
                tenantId
            }
        })

        return { success: true }
    }
}
