import 'server-only'

import { NextResponse } from 'next/server'
import * as zod from 'zod'
import { authMiddleware } from '@/infrastructure/middlewares'
import { createErrorResponse } from '@/infrastructure/api-requests'
import {
    UpdatePromptRequestSchema,
    type GetPromptByIdResponse,
    type UpdatePromptResponse
} from '../dto'
import { PromptService } from '@/services/prompts/prompt-service'

type Params = {
    params: Promise<{ id: string; promptId: string }>
}

export const GET = authMiddleware(async (currentUser, db, req, { params }: Params) => {
    try {
        const { promptId } = await params
        const promptIdNum = parseInt(promptId, 10)

        if (isNaN(promptIdNum)) {
            return NextResponse.json(
                { error: 'Invalid prompt ID' },
                { status: 400 }
            )
        }

        const promptService = new PromptService(db)
        const prompt = await promptService.getPromptById(promptIdNum, currentUser.tenantId)

        if (!prompt) {
            return NextResponse.json(
                { error: 'Prompt not found' },
                { status: 404 }
            )
        }

        return NextResponse.json<GetPromptByIdResponse>({ prompt }, { status: 200 })
    } catch (error) {
        return createErrorResponse(error, 'get_prompt_by_id_error')
    }
})

export const PUT = authMiddleware(async (currentUser, db, req, { params }: Params) => {
    try {
        const { promptId } = await params
        const promptIdNum = parseInt(promptId, 10)

        if (isNaN(promptIdNum)) {
            return NextResponse.json(
                { error: 'Invalid prompt ID' },
                { status: 400 }
            )
        }

        const body = await req.json()
        const updateData = await UpdatePromptRequestSchema.parseAsync(body)

        const promptService = new PromptService(db)
        const prompt = await promptService.updatePrompt(
            promptIdNum,
            currentUser.tenantId,
            updateData
        )

        if (!prompt) {
            return NextResponse.json(
                { error: 'Prompt not found' },
                { status: 404 }
            )
        }

        return NextResponse.json<UpdatePromptResponse>({
            message: 'Prompt updated successfully',
            prompt
        }, { status: 200 })

    } catch (error) {
        if (error instanceof zod.ZodError) {
            return NextResponse.json(
                { error: 'Validation error', details: error.message },
                { status: 400 }
            )
        }

        return createErrorResponse(error, 'update_prompt_error')
    }
})
