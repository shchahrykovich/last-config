import * as zod from 'zod'

// ============================================================================
// Prompt Body Schema - Cross-platform LLM format
// ============================================================================

export const PromptBodySchema = zod.object({
    model: zod.string().optional(),
    messages: zod.array(zod.object({
        role: zod.string(),
        content: zod.string(),
    })).optional(),
    temperature: zod.number().optional(),
    max_tokens: zod.number().optional(),
})

export type PromptBody = zod.infer<typeof PromptBodySchema>

// ============================================================================
// Request Schemas
// ============================================================================

export const CreatePromptRequestSchema = zod.object({
    name: zod.string().min(1, {
        message: 'Prompt name is required',
    }).max(255, {
        message: 'Prompt name must be less than 255 characters',
    }),
    body: PromptBodySchema,
})

export type CreatePromptRequest = zod.infer<typeof CreatePromptRequestSchema>

export const UpdatePromptRequestSchema = zod.object({
    name: zod.string().min(1).max(255).optional(),
    body: PromptBodySchema.optional(),
})

export type UpdatePromptRequest = zod.infer<typeof UpdatePromptRequestSchema>

// ============================================================================
// Response Schemas
// ============================================================================

export const PromptDtoSchema = zod.object({
    id: zod.number(),
    name: zod.string(),
    body: zod.string(), // Stored as JSON string in DB
    projectId: zod.number(),
    tenantId: zod.number(),
    createdAt: zod.date(),
    updatedAt: zod.date(),
})

export type PromptDto = zod.infer<typeof PromptDtoSchema>

export const GetPromptsResponseSchema = zod.object({
    prompts: zod.array(PromptDtoSchema),
})

export type GetPromptsResponse = zod.infer<typeof GetPromptsResponseSchema>

export const CreatePromptResponseSchema = zod.object({
    message: zod.string(),
    prompt: PromptDtoSchema,
})

export type CreatePromptResponse = zod.infer<typeof CreatePromptResponseSchema>

export const GetPromptByIdResponseSchema = zod.object({
    prompt: PromptDtoSchema,
})

export type GetPromptByIdResponse = zod.infer<typeof GetPromptByIdResponseSchema>

export const UpdatePromptResponseSchema = zod.object({
    message: zod.string(),
    prompt: PromptDtoSchema,
})

export type UpdatePromptResponse = zod.infer<typeof UpdatePromptResponseSchema>

// ============================================================================
// Client-Side Serialized Types (for use in client components)
// ============================================================================

export type PromptDtoSerialized = Omit<PromptDto, 'createdAt' | 'updatedAt'> & {
    createdAt: string
    updatedAt: string
}

export type GetPromptsResponseSerialized = {
    prompts: PromptDtoSerialized[]
}

export type CreatePromptResponseSerialized = {
    message: string
    prompt: PromptDtoSerialized
}

export type GetPromptByIdResponseSerialized = {
    prompt: PromptDtoSerialized
}

export type UpdatePromptResponseSerialized = {
    message: string
    prompt: PromptDtoSerialized
}
