import 'server-only'

import { NextResponse } from 'next/server'
import { authMiddleware } from '@/infrastructure/middlewares'
import { createErrorResponse } from '@/infrastructure/api-requests'
import { type GetProjectByIdResponse } from '../dto'
import { ProjectService } from '@/services/projects/project-service'

type Params = {
    params: Promise<{ id: string }>
}

export const GET = authMiddleware(async (currentUser, db, req, { params }: Params) => {
    try {
        const { id } = await params
        const projectId = parseInt(id, 10)

        if (isNaN(projectId)) {
            return NextResponse.json(
                { error: 'Invalid project ID' },
                { status: 400 }
            )
        }

        const projectService = new ProjectService(db)
        const project = await projectService.getProjectById(projectId, currentUser.tenantId)

        if (!project) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            )
        }

        return NextResponse.json<GetProjectByIdResponse>({ project }, { status: 200 })
    } catch (error) {
        return createErrorResponse(error, 'get_project_by_id_error')
    }
})
