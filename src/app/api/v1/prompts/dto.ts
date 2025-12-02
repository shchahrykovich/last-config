import * as zod from 'zod'

// ============================================================================
// Response Schemas for Customer-Facing API
// ============================================================================

export const PromptResponseSchema = zod.object({
    id: zod.number(),
    name: zod.string(),
    body: zod.unknown(), // Parsed JSON body
    projectId: zod.number(),
    createdAt: zod.date(),
    updatedAt: zod.date(),
})

export type PromptResponse = zod.infer<typeof PromptResponseSchema>

export const GetPromptByIdResponseSchema = PromptResponseSchema

export type GetPromptByIdResponse = zod.infer<typeof GetPromptByIdResponseSchema>

export const GetPromptsResponseSchema = zod.object({
    items: zod.array(PromptResponseSchema),
})

export type GetPromptsResponse = zod.infer<typeof GetPromptsResponseSchema>

// ============================================================================
// Client-Side Serialized Types
// ============================================================================

export type PromptResponseSerialized = {
    id: number
    name: string
    body: unknown
    projectId: number
    createdAt: string
    updatedAt: string
}

export type GetPromptByIdResponseSerialized = {
    prompt: PromptResponseSerialized
}

export type GetPromptsResponseSerialized = {
    prompts: PromptResponseSerialized[]
}
