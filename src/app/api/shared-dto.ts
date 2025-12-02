import zod from "zod"

// ============================================================================
// Error Response Schema
// ============================================================================

export const ErrorResponseSchema = zod.object({
    error: zod.string(),
    details: zod.string().optional(),
})

export type ErrorResponse = zod.infer<typeof ErrorResponseSchema>