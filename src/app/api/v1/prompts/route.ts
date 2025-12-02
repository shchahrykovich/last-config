import 'server-only'

import { NextResponse } from 'next/server'
import { apiKeyAuthMiddleware } from '@/infrastructure/middlewares'
import { createErrorResponse } from '@/infrastructure/api-requests'
import type { GetPromptsResponse } from './dto'

type Params = {
    params: Promise<{}>
}

/**
 * List all prompts for the project associated with the API key
 * Requires API key authentication
 *
 * Usage:
 * curl -H "Authorization: Bearer sk_{public}_{private}" \
 *      https://your-domain/api/v1/prompts
 */
export const GET = apiKeyAuthMiddleware(async (context, db, req, { params }: Params) => {
    try {
        // Fetch all prompts for this project and tenant
        const prompts = await db.prompts.findMany({
            where: {
                projectId: context.projectId,
                tenantId: context.tenantId,
            },
            orderBy: {
                createdAt: 'desc',
            }
        })

        // Parse the body JSON strings
        const parsedPrompts = prompts.map(prompt => {
            let parsedBody: unknown
            try {
                parsedBody = JSON.parse(prompt.body)
            } catch (error) {
                parsedBody = prompt.body
            }

            return {
                id: prompt.id,
                name: prompt.name,
                body: parsedBody,
                projectId: prompt.projectId,
                createdAt: prompt.createdAt,
                updatedAt: prompt.updatedAt,
            }
        })

        return NextResponse.json<GetPromptsResponse>({
            prompts: parsedPrompts
        }, { status: 200 })

    } catch (error) {
        return createErrorResponse(error, 'get_prompts_error')
    }
})
