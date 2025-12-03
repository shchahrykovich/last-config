import 'server-only'

import {NextResponse} from 'next/server'
import {authMiddleware, authMiddlewareForProjects} from '@/infrastructure/middlewares'
import {createErrorResponse} from '@/infrastructure/api-requests'
import {
    type GetConfigResponse,
    type UpdateConfigResponse,
    type DeleteConfigResponse,
    UpdateConfigRequestSchema
} from '../dto'
import {ConfigService} from '@/services/config/config-service'

type Params = {
    params: Promise<{ id: string; configId: string }>
}

export const GET = authMiddlewareForProjects(async (currentUser,
                                                    db,
                                                    req,
                                                    projectId,
                                                    {params}: Params) => {
    try {
        const {configId} = await params
        const cfgId = parseInt(configId, 10)

        if (isNaN(cfgId)) {
            return NextResponse.json(
                {error: 'Invalid ID'},
                {status: 400}
            )
        }

        const configService = new ConfigService(db)

        // Verify project access
        const hasAccess = await configService.verifyProjectAccess(projectId, currentUser.tenantId)
        if (!hasAccess) {
            return NextResponse.json(
                {error: 'Project not found'},
                {status: 404}
            )
        }

        const config = await configService.getConfigById(cfgId, currentUser.tenantId)

        if (!config || config.projectId !== projectId) {
            return NextResponse.json(
                {error: 'Config not found'},
                {status: 404}
            )
        }

        return NextResponse.json<GetConfigResponse>({config}, {status: 200})
    } catch (error) {
        return createErrorResponse(error, 'get_config_error')
    }
})

export const PUT = authMiddlewareForProjects(async (currentUser,
                                                    db,
                                                    req,
                                                    projectId,
                                                    {params}: Params) => {
    try {
        const {configId} = await params
        const cfgId = parseInt(configId, 10)

        if (isNaN(cfgId)) {
            return NextResponse.json(
                {error: 'Invalid ID'},
                {status: 400}
            )
        }

        const body = await req.json()
        const validatedData = UpdateConfigRequestSchema.parse(body)

        const configService = new ConfigService(db)

        // Verify project access
        const hasAccess = await configService.verifyProjectAccess(projectId, currentUser.tenantId)
        if (!hasAccess) {
            return NextResponse.json(
                {error: 'Project not found'},
                {status: 404}
            )
        }

        // Verify config belongs to project
        const existingConfig = await configService.getConfigById(cfgId, currentUser.tenantId)
        if (!existingConfig || existingConfig.projectId !== projectId) {
            return NextResponse.json(
                {error: 'Config not found'},
                {status: 404}
            )
        }

        const config = await configService.updateConfig(cfgId, currentUser.tenantId, {
            name: validatedData.name,
            description: validatedData.description,
            type: validatedData.type,
            value: validatedData.value,
            isPublic: validatedData.isPublic,
        })

        return NextResponse.json<UpdateConfigResponse>({
            message: 'Config updated successfully',
            config,
        }, {status: 200})
    } catch (error) {
        return createErrorResponse(error, 'update_config_error')
    }
})

export const DELETE = authMiddlewareForProjects(async (currentUser,
                                                       db,
                                                       req,
                                                       projectId,
                                                       {params}: Params) => {
    try {
        const {configId} = await params
        const cfgId = parseInt(configId, 10)

        if (isNaN(cfgId)) {
            return NextResponse.json(
                {error: 'Invalid ID'},
                {status: 400}
            )
        }

        const configService = new ConfigService(db)

        // Verify project access
        const hasAccess = await configService.verifyProjectAccess(projectId, currentUser.tenantId)
        if (!hasAccess) {
            return NextResponse.json(
                {error: 'Project not found'},
                {status: 404}
            )
        }

        // Verify config belongs to project
        const existingConfig = await configService.getConfigById(cfgId, currentUser.tenantId)
        if (!existingConfig || existingConfig.projectId !== projectId) {
            return NextResponse.json(
                {error: 'Config not found'},
                {status: 404}
            )
        }

        await configService.deleteConfig(cfgId, currentUser.tenantId)

        return NextResponse.json<DeleteConfigResponse>({
            message: 'Config deleted successfully',
        }, {status: 200})
    } catch (error) {
        return createErrorResponse(error, 'delete_config_error')
    }
})
