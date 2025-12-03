import * as zod from 'zod'

// ============================================================================
// Request Schemas
// ============================================================================

export const CreateConfigRequestSchema = zod.object({
    name: zod.string().min(1, 'Name is required'),
    description: zod.string().optional(),
    type: zod.enum(['string', 'number', 'boolean']).default('string'),
    value: zod.string().optional(),
    isPublic: zod.boolean().default(false),
})

export type CreateConfigRequest = zod.infer<typeof CreateConfigRequestSchema>

export const UpdateConfigRequestSchema = zod.object({
    name: zod.string().min(1, 'Name is required').optional(),
    description: zod.string().optional(),
    type: zod.enum(['string', 'number', 'boolean']).optional(),
    value: zod.string().optional(),
    isPublic: zod.boolean().optional(),
})

export type UpdateConfigRequest = zod.infer<typeof UpdateConfigRequestSchema>

// ============================================================================
// Response Schemas
// ============================================================================

export const ConfigDtoSchema = zod.object({
    id: zod.number(),
    name: zod.string(),
    description: zod.string(),
    type: zod.string(),
    value: zod.string(),
    projectId: zod.number(),
    tenantId: zod.number(),
    isPublic: zod.boolean(),
    createdAt: zod.date(),
    updatedAt: zod.date(),
})

export type ConfigDto = zod.infer<typeof ConfigDtoSchema>

export const GetConfigsResponseSchema = zod.object({
    configs: zod.array(ConfigDtoSchema),
})

export type GetConfigsResponse = zod.infer<typeof GetConfigsResponseSchema>

export const GetConfigResponseSchema = zod.object({
    config: ConfigDtoSchema,
})

export type GetConfigResponse = zod.infer<typeof GetConfigResponseSchema>

export const CreateConfigResponseSchema = zod.object({
    message: zod.string(),
    config: ConfigDtoSchema,
})

export type CreateConfigResponse = zod.infer<typeof CreateConfigResponseSchema>

export const UpdateConfigResponseSchema = zod.object({
    message: zod.string(),
    config: ConfigDtoSchema,
})

export type UpdateConfigResponse = zod.infer<typeof UpdateConfigResponseSchema>

export const DeleteConfigResponseSchema = zod.object({
    message: zod.string(),
})

export type DeleteConfigResponse = zod.infer<typeof DeleteConfigResponseSchema>

// ============================================================================
// Client-Side Serialized Types
// ============================================================================

export type ConfigDtoSerialized = {
    id: number
    name: string
    description: string
    type: string
    value: string
    projectId: number
    tenantId: number
    isPublic: boolean
    createdAt: string
    updatedAt: string
}

export type GetConfigsResponseSerialized = {
    configs: ConfigDtoSerialized[]
}

export type GetConfigResponseSerialized = {
    config: ConfigDtoSerialized
}

export type CreateConfigResponseSerialized = {
    message: string
    config: ConfigDtoSerialized
}

export type UpdateConfigResponseSerialized = {
    message: string
    config: ConfigDtoSerialized
}
