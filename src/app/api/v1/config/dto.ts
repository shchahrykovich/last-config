import * as zod from 'zod'

// ============================================================================
// Response Schemas
// ============================================================================

export const GetConfigResponseSchema = zod.record(zod.string(), zod.union([zod.string(), zod.number(), zod.boolean()]))

export type GetConfigResponse = zod.infer<typeof GetConfigResponseSchema>
