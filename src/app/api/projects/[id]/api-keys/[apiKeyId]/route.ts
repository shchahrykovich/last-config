import 'server-only'

import { NextResponse } from 'next/server'
import { authMiddleware } from '@/infrastructure/middlewares'
import { createErrorResponse } from '@/infrastructure/api-requests'
import { ApiKeyService } from '@/services/api-keys/api-key-service'

type Params = {
    params: Promise<{ id: string; apiKeyId: string }>
}

export const DELETE = authMiddleware(async (currentUser, db, req, { params }: Params) => {
    try {
        const { apiKeyId } = await params
        const apiKeyIdNum = parseInt(apiKeyId, 10)

        if (isNaN(apiKeyIdNum)) {
            return NextResponse.json(
                { error: 'Invalid API key ID' },
                { status: 400 }
            )
        }

        const apiKeyService = new ApiKeyService(db)
        const deleted = await apiKeyService.deleteApiKey(apiKeyIdNum, currentUser.tenantId)

        if (!deleted) {
            return NextResponse.json(
                { error: 'API key not found' },
                { status: 404 }
            )
        }

        return NextResponse.json({
            message: 'API key deleted successfully'
        }, { status: 200 })

    } catch (error) {
        return createErrorResponse(error, 'delete_api_key_error')
    }
})
