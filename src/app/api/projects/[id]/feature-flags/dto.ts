import * as zod from 'zod'

// ============================================================================
// Request Schemas
// ============================================================================

export const CreateFeatureFlagRequestSchema = zod.object({
    name: zod.string().min(1, 'Name is required'),
    description: zod.string().optional(),
    type: zod.enum(['string', 'number', 'boolean']).default('string'),
    value: zod.string().optional(),
    userId: zod.string().optional(),
    userRole: zod.string().optional(),
    userAccountId: zod.string().optional(),
    isPublic: zod.boolean().default(false),
})

export type CreateFeatureFlagRequest = zod.infer<typeof CreateFeatureFlagRequestSchema>

export const UpdateFeatureFlagRequestSchema = zod.object({
    name: zod.string().min(1, 'Name is required').optional(),
    description: zod.string().optional(),
    type: zod.enum(['string', 'number', 'boolean']).optional(),
    value: zod.string().optional(),
    userId: zod.string().optional(),
    userRole: zod.string().optional(),
    userAccountId: zod.string().optional(),
    isPublic: zod.boolean().optional(),
})

export type UpdateFeatureFlagRequest = zod.infer<typeof UpdateFeatureFlagRequestSchema>

// ============================================================================
// Response Schemas
// ============================================================================

export const FeatureFlagDtoSchema = zod.object({
    id: zod.number(),
    name: zod.string(),
    description: zod.string(),
    type: zod.string(),
    value: zod.string(),
    userId: zod.string(),
    userRole: zod.string(),
    userAccountId: zod.string(),
    projectId: zod.number(),
    tenantId: zod.number(),
    isPublic: zod.boolean(),
    createdAt: zod.date(),
    updatedAt: zod.date(),
})

export type FeatureFlagDto = zod.infer<typeof FeatureFlagDtoSchema>

export const GetFeatureFlagsResponseSchema = zod.object({
    featureFlags: zod.array(FeatureFlagDtoSchema),
})

export type GetFeatureFlagsResponse = zod.infer<typeof GetFeatureFlagsResponseSchema>

export const GetFeatureFlagResponseSchema = zod.object({
    featureFlag: FeatureFlagDtoSchema,
})

export type GetFeatureFlagResponse = zod.infer<typeof GetFeatureFlagResponseSchema>

export const CreateFeatureFlagResponseSchema = zod.object({
    message: zod.string(),
    featureFlag: FeatureFlagDtoSchema,
})

export type CreateFeatureFlagResponse = zod.infer<typeof CreateFeatureFlagResponseSchema>

export const UpdateFeatureFlagResponseSchema = zod.object({
    message: zod.string(),
    featureFlag: FeatureFlagDtoSchema,
})

export type UpdateFeatureFlagResponse = zod.infer<typeof UpdateFeatureFlagResponseSchema>

export const DeleteFeatureFlagResponseSchema = zod.object({
    message: zod.string(),
})

export type DeleteFeatureFlagResponse = zod.infer<typeof DeleteFeatureFlagResponseSchema>

// ============================================================================
// Client-Side Serialized Types
// ============================================================================

export type FeatureFlagDtoSerialized = {
    id: number
    name: string
    description: string
    type: string
    value: string
    userId: string
    userRole: string
    userAccountId: string
    projectId: number
    tenantId: number
    isPublic: boolean
    createdAt: string
    updatedAt: string
}

export type GetFeatureFlagsResponseSerialized = {
    featureFlags: FeatureFlagDtoSerialized[]
}

export type GetFeatureFlagResponseSerialized = {
    featureFlag: FeatureFlagDtoSerialized
}

export type CreateFeatureFlagResponseSerialized = {
    message: string
    featureFlag: FeatureFlagDtoSerialized
}

export type UpdateFeatureFlagResponseSerialized = {
    message: string
    featureFlag: FeatureFlagDtoSerialized
}
