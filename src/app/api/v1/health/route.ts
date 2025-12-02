import 'server-only'

import { NextResponse } from 'next/server'
import { apiKeyAuthMiddleware } from '@/infrastructure/middlewares'

type Params = {
    params: Promise<{}>
}

/**
 * Health check endpoint that requires API key authentication
 * Returns "Ok" if the API key is valid
 *
 * Usage:
 * curl -H "Authorization: Bearer sk_{public}_{private}" https://your-domain/api/v1/health
 */
export const GET = apiKeyAuthMiddleware(async (context, db, req, { params }: Params) => {
    return NextResponse.json({
        status: 'Ok',
    }, { status: 200 })
})
