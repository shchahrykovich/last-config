import 'server-only'

import { NextResponse } from 'next/server'
import {authMiddleware, authMiddlewareForProjects} from '@/infrastructure/middlewares'
import { createErrorResponse } from '@/infrastructure/api-requests'
import {
    type GetFeatureFlagResponse,
    type UpdateFeatureFlagResponse,
    type DeleteFeatureFlagResponse,
    UpdateFeatureFlagRequestSchema
} from '../dto'
import { FeatureFlagService } from '@/services/feature-flags/feature-flag-service'

type Params = {
    params: Promise<{ id: string; featureFlagId: string }>
}

export const GET = authMiddlewareForProjects(async (currentUser,
                                                    db,
                                                    req,
                                                    projectId,
                                                    {params}: Params) => {
    try {
        const { featureFlagId } = await params
        const flagId = parseInt(featureFlagId, 10)

        if (isNaN(flagId)) {
            return NextResponse.json(
                { error: 'Invalid ID' },
                { status: 400 }
            )
        }

        const featureFlagService = new FeatureFlagService(db)

        // Verify project access
        const hasAccess = await featureFlagService.verifyProjectAccess(projectId, currentUser.tenantId)
        if (!hasAccess) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            )
        }

        const featureFlag = await featureFlagService.getFeatureFlagById(flagId, currentUser.tenantId)

        if (!featureFlag || featureFlag.projectId !== projectId) {
            return NextResponse.json(
                { error: 'Feature flag not found' },
                { status: 404 }
            )
        }

        return NextResponse.json<GetFeatureFlagResponse>({ featureFlag }, { status: 200 })
    } catch (error) {
        return createErrorResponse(error, 'get_feature_flag_error')
    }
})

export const PUT = authMiddlewareForProjects(async (currentUser,
                                                    db,
                                                    req,
                                                    projectId,
                                                    {params}: Params) => {
    try {
        const { featureFlagId } = await params
        const flagId = parseInt(featureFlagId, 10)

        if (isNaN(flagId)) {
            return NextResponse.json(
                { error: 'Invalid ID' },
                { status: 400 }
            )
        }

        const body = await req.json()
        const validatedData = UpdateFeatureFlagRequestSchema.parse(body)

        const featureFlagService = new FeatureFlagService(db)

        // Verify project access
        const hasAccess = await featureFlagService.verifyProjectAccess(projectId, currentUser.tenantId)
        if (!hasAccess) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            )
        }

        // Verify feature flag belongs to project
        const existingFlag = await featureFlagService.getFeatureFlagById(flagId, currentUser.tenantId)
        if (!existingFlag || existingFlag.projectId !== projectId) {
            return NextResponse.json(
                { error: 'Feature flag not found' },
                { status: 404 }
            )
        }

        const featureFlag = await featureFlagService.updateFeatureFlag(flagId, currentUser.tenantId, {
            name: validatedData.name,
            description: validatedData.description,
            type: validatedData.type,
            value: validatedData.value,
            userId: validatedData.userId,
            userRole: validatedData.userRole,
            userAccountId: validatedData.userAccountId,
            isPublic: validatedData.isPublic,
        })

        return NextResponse.json<UpdateFeatureFlagResponse>({
            message: 'Feature flag updated successfully',
            featureFlag,
        }, { status: 200 })
    } catch (error) {
        return createErrorResponse(error, 'update_feature_flag_error')
    }
})

export const DELETE = authMiddlewareForProjects(async (currentUser,
                                                       db,
                                                       req,
                                                       projectId,
                                                       {params}: Params) => {
    try {
        const { featureFlagId } = await params
        const flagId = parseInt(featureFlagId, 10)

        if (isNaN(flagId)) {
            return NextResponse.json(
                { error: 'Invalid ID' },
                { status: 400 }
            )
        }

        const featureFlagService = new FeatureFlagService(db)

        // Verify project access
        const hasAccess = await featureFlagService.verifyProjectAccess(projectId, currentUser.tenantId)
        if (!hasAccess) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            )
        }

        // Verify feature flag belongs to project
        const existingFlag = await featureFlagService.getFeatureFlagById(flagId, currentUser.tenantId)
        if (!existingFlag || existingFlag.projectId !== projectId) {
            return NextResponse.json(
                { error: 'Feature flag not found' },
                { status: 404 }
            )
        }

        await featureFlagService.deleteFeatureFlag(flagId, currentUser.tenantId)

        return NextResponse.json<DeleteFeatureFlagResponse>({
            message: 'Feature flag deleted successfully',
        }, { status: 200 })
    } catch (error) {
        return createErrorResponse(error, 'delete_feature_flag_error')
    }
})
