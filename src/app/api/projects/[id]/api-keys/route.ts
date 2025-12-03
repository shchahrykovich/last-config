import 'server-only'

import {NextResponse} from 'next/server'
import {authMiddlewareForProjects} from '@/infrastructure/middlewares'
import {createErrorResponse} from '@/infrastructure/api-requests'
import {
    type GetApiKeysResponse,
    type CreateApiKeyResponse
} from './dto'
import {ApiKeyService} from '@/services/api-keys/api-key-service'

export const GET = authMiddlewareForProjects(async (currentUser,
                                                    db,
                                                    req,
                                                    projectId) => {
    try {
        const apiKeyService = new ApiKeyService(db)

        // Verify project access
        const hasAccess = await apiKeyService.verifyProjectAccess(projectId, currentUser.tenantId)
        if (!hasAccess) {
            return NextResponse.json(
                {error: 'Project not found'},
                {status: 404}
            )
        }

        const apiKeys = await apiKeyService.getApiKeysByProjectId(projectId, currentUser.tenantId)
        return NextResponse.json<GetApiKeysResponse>({apiKeys}, {status: 200})
    } catch (error) {
        return createErrorResponse(error, 'get_api_keys_error')
    }
})

export const POST = authMiddlewareForProjects(async (currentUser,
                                                     db,
                                                     req,
                                                     projectId) => {
    try {
        // Parse request body
        const body: { type: 'secret' | 'public' } = await req.json()
        const {type} = body

        const apiKeyService = new ApiKeyService(db)

        // Verify project access
        const hasAccess = await apiKeyService.verifyProjectAccess(projectId, currentUser.tenantId)
        if (!hasAccess) {
            return NextResponse.json(
                {error: 'Project not found'},
                {status: 404}
            )
        }

        const {apiKey, fullKey} = await apiKeyService.createApiKey({
            projectId,
            tenantId: currentUser.tenantId,
            type: type || 'secret', // Default to secret if not provided
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
        }, {status: 201})

    } catch (error) {
        return createErrorResponse(error, 'create_api_key_error')
    }
})
