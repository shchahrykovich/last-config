import 'server-only'

import { NextResponse } from 'next/server'
import { authMiddleware } from '@/infrastructure/middlewares'
import { createErrorResponse } from '@/infrastructure/api-requests'
import {
    type GetFeatureFlagsResponse,
    type CreateFeatureFlagResponse,
    CreateFeatureFlagRequestSchema
} from './dto'
import { FeatureFlagService } from '@/services/feature-flags/feature-flag-service'

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

        const featureFlagService = new FeatureFlagService(db)

        // Verify project access
        const hasAccess = await featureFlagService.verifyProjectAccess(projectId, currentUser.tenantId)
        if (!hasAccess) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            )
        }

        const featureFlags = await featureFlagService.getFeatureFlagsByProjectId(projectId, currentUser.tenantId)
        return NextResponse.json<GetFeatureFlagsResponse>({ featureFlags }, { status: 200 })
    } catch (error) {
        return createErrorResponse(error, 'get_feature_flags_error')
    }
})

export const POST = authMiddleware(async (currentUser, db, req, { params }: Params) => {
    try {
        const { id } = await params
        const projectId = parseInt(id, 10)

        if (isNaN(projectId)) {
            return NextResponse.json(
                { error: 'Invalid project ID' },
                { status: 400 }
            )
        }

        const body = await req.json()
        const validatedData = CreateFeatureFlagRequestSchema.parse(body)

        const featureFlagService = new FeatureFlagService(db)

        // Verify project access
        const hasAccess = await featureFlagService.verifyProjectAccess(projectId, currentUser.tenantId)
        if (!hasAccess) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            )
        }

        const featureFlag = await featureFlagService.createFeatureFlag({
            name: validatedData.name,
            description: validatedData.description,
            type: validatedData.type,
            value: validatedData.value,
            userId: validatedData.userId,
            userRole: validatedData.userRole,
            userAccountId: validatedData.userAccountId,
            isPublic: validatedData.isPublic,
            projectId,
            tenantId: currentUser.tenantId,
        })

        return NextResponse.json<CreateFeatureFlagResponse>({
            message: 'Feature flag created successfully',
            featureFlag,
        }, { status: 201 })
    } catch (error) {
        return createErrorResponse(error, 'create_feature_flag_error')
    }
})
