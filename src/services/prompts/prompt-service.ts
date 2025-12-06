import 'server-only'

import { PrismaClient } from "@prisma/client"
import type { PromptBody } from "@/app/api/projects/[id]/prompts/dto"

export class PromptService {
    constructor(private db: PrismaClient) {}

    async getPromptsByProjectId(projectId: number, tenantId: number) {
        const prompts = await this.db.prompts.findMany({
            where: {
                projectId,
                tenantId
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return prompts
    }

    async createPrompt(data: {
        name: string
        body: PromptBody
        projectId: number
        tenantId: number
    }) {
        const prompt = await this.db.prompts.create({
            data: {
                name: data.name,
                body: JSON.stringify(data.body), // Store as JSON string
                projectId: data.projectId,
                tenantId: data.tenantId,
            }
        })

        return prompt
    }

    async verifyProjectAccess(projectId: number, tenantId: number): Promise<boolean> {
        const project = await this.db.projects.findFirst({
            where: {
                id: projectId,
                tenantId
            }
        })

        return project !== null
    }

    async getPromptById(promptId: number, tenantId: number, projectId: number) {
        const prompt = await this.db.prompts.findFirst({
            where: {
                id: promptId,
                tenantId,
                projectId
            }
        })

        return prompt
    }

    async updatePrompt(
        promptId: number,
        projectId: number,
        tenantId: number,
        data: {
            name?: string
            body?: PromptBody
        }
    ) {
        const updateData: any = {}

        if (data.name !== undefined) {
            updateData.name = data.name
        }
        if (data.body !== undefined) {
            updateData.body = JSON.stringify(data.body)
        }

        const prompt = await this.db.prompts.updateMany({
            where: {
                id: promptId,
                tenantId,
                projectId
            },
            data: updateData
        })

        if (prompt.count === 0) {
            return null
        }

        return await this.getPromptById(promptId, tenantId, projectId)
    }

    async deletePrompt(
        promptId: number,
        projectId: number,
        tenantId: number
    ) {
        const result = await this.db.prompts.deleteMany({
            where: {
                id: promptId,
                projectId,
                tenantId
            }
        })

        return result.count > 0
    }
}
