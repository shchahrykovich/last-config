import 'server-only'

import { NextResponse } from 'next/server'
import { secretApiKeyAuthMiddleware } from '@/infrastructure/middlewares'
import { createErrorResponse } from '@/infrastructure/api-requests'
import type { GetPromptByIdResponse } from '../dto'

type Params = {
    params: Promise<{ id: string }>
}

/**
 * Get a prompt by ID
 * Requires API key authentication
 * Returns the prompt if it belongs to the same project as the API key
 *
 * Usage:
 * curl -H "Authorization: sk_{public}_{private}" \
 *      https://your-domain/api/v1/prompts/123
 */
export const GET = secretApiKeyAuthMiddleware(async (context, db, req, { params }: Params) => {
    try {
        const { id } = await params
        const promptId = parseInt(id, 10)

        if (isNaN(promptId)) {
            return NextResponse.json(
                { error: 'Invalid prompt ID' },
                { status: 400 }
            )
        }

        // Fetch the prompt
        const prompt = await db.prompts.findFirst({
            where: {
                id: promptId,
                projectId: context.projectId,
                tenantId: context.tenantId,
            }
        })

        if (!prompt) {
            return NextResponse.json(
                { error: 'Prompt not found' },
                { status: 404 }
            )
        }

        // Parse the body JSON string
        let parsedBody: unknown
        try {
            parsedBody = JSON.parse(prompt.body)
        } catch (error) {
            parsedBody = prompt.body
        }

        return NextResponse.json<GetPromptByIdResponse>({
            id: prompt.id,
            name: prompt.name,
            body: parsedBody,
            projectId: prompt.projectId,
            createdAt: prompt.createdAt,
            updatedAt: prompt.updatedAt,
        }, { status: 200 })

    } catch (error) {
        return createErrorResponse(error, 'get_prompt_by_id_error')
    }
})
