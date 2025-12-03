import 'server-only'

import { NextResponse } from 'next/server'
import * as zod from 'zod'
import {authMiddleware, authMiddlewareForProjects} from '@/infrastructure/middlewares'
import { createErrorResponse } from '@/infrastructure/api-requests'
import {
    CreatePromptRequestSchema,
    type GetPromptsResponse,
    type CreatePromptResponse
} from './dto'
import { PromptService } from '@/services/prompts/prompt-service'

export const GET = authMiddlewareForProjects(async (currentUser,
                                                    db,
                                                    req,
                                                    projectId) => {
    try {
        const promptService = new PromptService(db)

        // Verify project access
        const hasAccess = await promptService.verifyProjectAccess(projectId, currentUser.tenantId)
        if (!hasAccess) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            )
        }

        const prompts = await promptService.getPromptsByProjectId(projectId, currentUser.tenantId)
        return NextResponse.json<GetPromptsResponse>({ prompts }, { status: 200 })
    } catch (error) {
        return createErrorResponse(error, 'get_prompts_error')
    }
})

export const POST = authMiddlewareForProjects(async (currentUser,
                                                     db,
                                                     req,
                                                     projectId) => {
    try {
        const promptService = new PromptService(db)

        // Verify project access
        const hasAccess = await promptService.verifyProjectAccess(projectId, currentUser.tenantId)
        if (!hasAccess) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            )
        }

        const body = await req.json()
        const { name, body: promptBody } = await CreatePromptRequestSchema.parseAsync(body)

        const prompt = await promptService.createPrompt({
            name,
            body: promptBody,
            projectId,
            tenantId: currentUser.tenantId,
        })

        return NextResponse.json<CreatePromptResponse>({
            message: 'Prompt created successfully',
            prompt
        }, { status: 201 })

    } catch (error) {
        if (error instanceof zod.ZodError) {
            return NextResponse.json(
                { error: 'Validation error', details: error.message },
                { status: 400 }
            )
        }

        return createErrorResponse(error, 'create_prompt_error')
    }
})
