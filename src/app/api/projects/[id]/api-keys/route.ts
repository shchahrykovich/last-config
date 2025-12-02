import 'server-only'

import { NextResponse } from 'next/server'
import { authMiddleware } from '@/infrastructure/middlewares'
import { createErrorResponse } from '@/infrastructure/api-requests'
import {
    type GetApiKeysResponse,
    type CreateApiKeyResponse
} from './dto'
import { ApiKeyService } from '@/services/api-keys/api-key-service'

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

        const apiKeyService = new ApiKeyService(db)

        // Verify project access
        const hasAccess = await apiKeyService.verifyProjectAccess(projectId, currentUser.tenantId)
        if (!hasAccess) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            )
        }

        const apiKeys = await apiKeyService.getApiKeysByProjectId(projectId, currentUser.tenantId)
        return NextResponse.json<GetApiKeysResponse>({ apiKeys }, { status: 200 })
    } catch (error) {
        return createErrorResponse(error, 'get_api_keys_error')
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

        const apiKeyService = new ApiKeyService(db)

        // Verify project access
        const hasAccess = await apiKeyService.verifyProjectAccess(projectId, currentUser.tenantId)
        if (!hasAccess) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            )
        }

        const { apiKey, fullKey } = await apiKeyService.createApiKey({
            projectId,
            tenantId: currentUser.tenantId,
        })

        // Return the API key without the hashed private field, but include the full key
        return NextResponse.json<CreateApiKeyResponse>({
            message: 'API key created successfully',
            apiKey: {
                id: apiKey.id,
                tenantId: apiKey.tenantId,
                projectId: apiKey.projectId,
                public: apiKey.public,
                type: apiKey.type,
                createdAt: apiKey.createdAt,
                updatedAt: apiKey.updatedAt,
            },
            fullKey, // This is the only time the full key will be returned
        }, { status: 201 })

    } catch (error) {
        return createErrorResponse(error, 'create_api_key_error')
    }
})
