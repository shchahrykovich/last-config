import 'server-only'

import { NextResponse } from 'next/server'
import {authMiddleware, authMiddlewareForProjects} from '@/infrastructure/middlewares'
import { createErrorResponse } from '@/infrastructure/api-requests'
import {
    type GetConfigsResponse,
    type CreateConfigResponse,
    CreateConfigRequestSchema
} from './dto'
import { ConfigService } from '@/services/config/config-service'

type Params = {
    params: Promise<{ id: string }>
}

export const GET = authMiddlewareForProjects(async (currentUser,
                                                    db,
                                                    req,
                                                    projectId) => {
    try {
        const configService = new ConfigService(db)

        // Verify project access
        const hasAccess = await configService.verifyProjectAccess(projectId, currentUser.tenantId)
        if (!hasAccess) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            )
        }

        // Get isPublic filter from query params
        const { searchParams } = new URL(req.url)
        const isPublicParam = searchParams.get('isPublic')
        const isPublic = isPublicParam !== null ? isPublicParam === 'true' : undefined

        const configs = await configService.getConfigsByProjectId(projectId, currentUser.tenantId, isPublic)
        return NextResponse.json<GetConfigsResponse>({ configs }, { status: 200 })
    } catch (error) {
        return createErrorResponse(error, 'get_configs_error')
    }
})

export const POST = authMiddlewareForProjects(async (currentUser,
                                                     db,
                                                     req,
                                                     projectId) => {
    try {
        const body = await req.json()
        const validatedData = CreateConfigRequestSchema.parse(body)

        const configService = new ConfigService(db)

        // Verify project access
        const hasAccess = await configService.verifyProjectAccess(projectId, currentUser.tenantId)
        if (!hasAccess) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            )
        }

        const config = await configService.createConfig({
            name: validatedData.name,
            description: validatedData.description,
            type: validatedData.type,
            value: validatedData.value,
            isPublic: validatedData.isPublic,
            projectId,
            tenantId: currentUser.tenantId,
        })

        return NextResponse.json<CreateConfigResponse>({
            message: 'Config created successfully',
            config,
        }, { status: 201 })
    } catch (error) {
        return createErrorResponse(error, 'create_config_error')
    }
})
