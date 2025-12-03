import * as zod from 'zod'

// ============================================================================
// Request Schemas
// ============================================================================

export const GetFeatureFlagRequestSchema = zod.object({
    names: zod.array(zod.string()).min(1, 'At least one name is required'),
    userId: zod.string().optional(),
    userRole: zod.string().optional(),
    userAccountId: zod.string().optional(),
})

export type GetFeatureFlagRequest = zod.infer<typeof GetFeatureFlagRequestSchema>

// ============================================================================
// Response Schemas
// ============================================================================

export const GetFeatureFlagResponseSchema = zod.record(zod.string(), zod.union([zod.string(), zod.number(), zod.boolean()]))

export type GetFeatureFlagResponse = zod.infer<typeof GetFeatureFlagResponseSchema>
