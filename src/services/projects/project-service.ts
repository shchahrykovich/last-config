import 'server-only'

import { PrismaClient } from "@prisma/client"

export class ProjectService {
    constructor(private db: PrismaClient) {}

    async getProjectsByTenantId(tenantId: number) {
        const projects = await this.db.projects.findMany({
            where: {
                tenantId
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return projects
    }

    async createProject(data: { name: string, tenantId: number }) {
        const project = await this.db.projects.create({
            data: {
                name: data.name,
                tenantId: data.tenantId,
            }
        })

        return project
    }

    async getProjectById(projectId: number, tenantId: number) {
        const project = await this.db.projects.findFirst({
            where: {
                id: projectId,
                tenantId
            }
        })

        return project
    }
}
