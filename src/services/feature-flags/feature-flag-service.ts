import 'server-only'

import { PrismaClient } from "@prisma/client"

export class FeatureFlagService {
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

    async getFeatureFlagsByProjectId(projectId: number, tenantId: number) {
        const featureFlags = await this.db.featureFlags.findMany({
            where: {
                projectId,
                tenantId
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return featureFlags
    }

    async getFeatureFlagById(featureFlagId: number, tenantId: number) {
        const featureFlag = await this.db.featureFlags.findFirst({
            where: {
                id: featureFlagId,
                tenantId
            }
        })

        return featureFlag
    }

    async createFeatureFlag(data: {
        name: string
        description?: string
        type?: string
        value?: string
        userId?: string
        userRole?: string
        userAccountId?: string
        isPublic?: boolean
        projectId: number
        tenantId: number
    }) {
        const featureFlag = await this.db.featureFlags.create({
            data: {
                name: data.name,
                description: data.description || '',
                type: data.type || 'string',
                value: data.value || '',
                userId: data.userId || '',
                userRole: data.userRole || '',
                userAccountId: data.userAccountId || '',
                isPublic: data.isPublic ?? false,
                projectId: data.projectId,
                tenantId: data.tenantId,
            }
        })

        return featureFlag
    }

    async updateFeatureFlag(featureFlagId: number, tenantId: number, data: {
        name?: string
        description?: string
        type?: string
        value?: string
        userId?: string
        userRole?: string
        userAccountId?: string
        isPublic?: boolean
    }) {
        // Verify feature flag exists and belongs to tenant
        const existingFeatureFlag = await this.getFeatureFlagById(featureFlagId, tenantId)
        if (!existingFeatureFlag) {
            throw new Error('Feature flag not found')
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

        if (data.userId !== undefined) {
            updateData.userId = data.userId
        }

        if (data.userRole !== undefined) {
            updateData.userRole = data.userRole
        }

        if (data.userAccountId !== undefined) {
            updateData.userAccountId = data.userAccountId
        }

        if (data.isPublic !== undefined) {
            updateData.isPublic = data.isPublic
        }

        const featureFlag = await this.db.featureFlags.update({
            where: {
                id: featureFlagId,
                tenantId
            },
            data: updateData
        })

        return featureFlag
    }

    async deleteFeatureFlag(featureFlagId: number, tenantId: number) {
        // Verify feature flag exists and belongs to tenant
        const existingFeatureFlag = await this.getFeatureFlagById(featureFlagId, tenantId)
        if (!existingFeatureFlag) {
            throw new Error('Feature flag not found')
        }

        await this.db.featureFlags.delete({
            where: {
                id: featureFlagId,
                tenantId
            }
        })

        return { success: true }
    }

    async getFeatureFlagsByNamesWithPriority(
        projectId: number,
        tenantId: number,
        names: string[],
        userId?: string,
        userRole?: string,
        userAccountId?: string
    ) {
        const results: any[] = []

        for (const name of names) {
            let featureFlag = null

            // Priority 1: Match all (name + userId + userRole + userAccountId)
            if (userId && userRole && userAccountId) {
                featureFlag = await this.db.featureFlags.findFirst({
                    where: {
                        name,
                        projectId,
                        tenantId,
                        userId,
                        userRole,
                        userAccountId,
                    }
                })
            }

            // Priority 2: Match name + userRole + userAccountId
            if (!featureFlag && userRole && userAccountId) {
                featureFlag = await this.db.featureFlags.findFirst({
                    where: {
                        name,
                        projectId,
                        tenantId,
                        userId: '',
                        userRole,
                        userAccountId,
                    }
                })
            }

            // Priority 3: Match name + userAccountId
            if (!featureFlag && userAccountId) {
                featureFlag = await this.db.featureFlags.findFirst({
                    where: {
                        name,
                        projectId,
                        tenantId,
                        userId: '',
                        userRole: '',
                        userAccountId,
                    }
                })
            }

            // Priority 4: Match name only
            if (!featureFlag) {
                featureFlag = await this.db.featureFlags.findFirst({
                    where: {
                        name,
                        projectId,
                        tenantId,
                        userId: '',
                        userRole: '',
                        userAccountId: '',
                    }
                })
            }

            // Add to results if found
            if (featureFlag) {
                results.push(featureFlag)
            }
        }

        return results
    }

    async getPublicFeatureFlagsByNamesWithPriority(
        projectId: number,
        tenantId: number,
        names: string[],
        userId?: string,
        userRole?: string,
        userAccountId?: string
    ) {
        const results: any[] = []

        for (const name of names) {
            let featureFlag = null

            // Priority 1: Match all (name + userId + userRole + userAccountId) + isPublic
            if (userId && userRole && userAccountId) {
                featureFlag = await this.db.featureFlags.findFirst({
                    where: {
                        name,
                        projectId,
                        tenantId,
                        userId,
                        userRole,
                        userAccountId,
                        isPublic: true,
                    }
                })
            }

            // Priority 2: Match name + userRole + userAccountId + isPublic
            if (!featureFlag && userRole && userAccountId) {
                featureFlag = await this.db.featureFlags.findFirst({
                    where: {
                        name,
                        projectId,
                        tenantId,
                        userId: '',
                        userRole,
                        userAccountId,
                        isPublic: true,
                    }
                })
            }

            // Priority 3: Match name + userAccountId + isPublic
            if (!featureFlag && userAccountId) {
                featureFlag = await this.db.featureFlags.findFirst({
                    where: {
                        name,
                        projectId,
                        tenantId,
                        userId: '',
                        userRole: '',
                        userAccountId,
                        isPublic: true,
                    }
                })
            }

            // Priority 4: Match name only + isPublic
            if (!featureFlag) {
                featureFlag = await this.db.featureFlags.findFirst({
                    where: {
                        name,
                        projectId,
                        tenantId,
                        userId: '',
                        userRole: '',
                        userAccountId: '',
                        isPublic: true,
                    }
                })
            }

            // Add to results if found
            if (featureFlag) {
                results.push(featureFlag)
            }
        }

        return results
    }
}
