import 'server-only'

import {NextResponse} from 'next/server'
import {authMiddlewareForProjects} from '@/infrastructure/middlewares'
import {createErrorResponse} from '@/infrastructure/api-requests'
import {type GetProjectByIdResponse} from '../dto'
import {ProjectService} from '@/services/projects/project-service'

export const GET = authMiddlewareForProjects(async (currentUser,
                                                    db,
                                                    req,
                                                    projectId) => {
    try {
        const projectService = new ProjectService(db)
        const project = await projectService.getProjectById(projectId, currentUser.tenantId)

        if (!project) {
            return NextResponse.json(
                {error: 'Project not found'},
                {status: 404}
            )
        }

        return NextResponse.json<GetProjectByIdResponse>({project}, {status: 200})
    } catch (error) {
        return createErrorResponse(error, 'get_project_by_id_error')
    }
})
