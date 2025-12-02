import 'server-only'

import { NextRequest, NextResponse } from 'next/server'
import * as zod from 'zod'
import { authMiddleware } from '@/infrastructure/middlewares'
import { createErrorResponse } from '@/infrastructure/api-requests'
import { CreateProjectRequestSchema, type GetProjectsResponse, type CreateProjectResponse } from './dto'
import { ProjectService } from '@/services/projects/project-service'

export const GET = authMiddleware(async (currentUser, db, req) => {
    const projectService = new ProjectService(db)
    const projects = await projectService.getProjectsByTenantId(currentUser.tenantId)
    return NextResponse.json<GetProjectsResponse>({ projects }, { status: 200 })
})

export const POST = authMiddleware(async (currentUser, db, req) => {
    try {
        const body = await req.json()
        const { name } = await CreateProjectRequestSchema.parseAsync(body)

        const projectService = new ProjectService(db)
        const project = await projectService.createProject({
            name,
            tenantId: currentUser.tenantId,
        })

        return NextResponse.json<CreateProjectResponse>({
            message: 'Project created successfully',
            project
        }, { status: 201 })

    } catch (error) {
        if (error instanceof zod.ZodError) {
            return NextResponse.json(
                { error: 'Validation error', details: error.message },
                { status: 400 }
            )
        }

        return createErrorResponse(error, 'create_project_error')
    }
})
