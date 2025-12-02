import * as zod from 'zod'

// ============================================================================
// Request Schemas
// ============================================================================

export const CreateApiKeyRequestSchema = zod.object({
    // No fields needed - keys are auto-generated
})

export type CreateApiKeyRequest = zod.infer<typeof CreateApiKeyRequestSchema>

// ============================================================================
// Response Schemas
// ============================================================================

export const ApiKeyDtoSchema = zod.object({
    id: zod.number(),
    tenantId: zod.number(),
    projectId: zod.number(),
    public: zod.string(),
    private: zod.string(), // This is the hashed private key
    type: zod.string(),
    createdAt: zod.date(),
    updatedAt: zod.date(),
})

export type ApiKeyDto = zod.infer<typeof ApiKeyDtoSchema>

// Response when creating - includes the plain text key (only shown once)
export const CreateApiKeyResponseSchema = zod.object({
    message: zod.string(),
    apiKey: zod.object({
        id: zod.number(),
        tenantId: zod.number(),
        projectId: zod.number(),
        public: zod.string(),
        type: zod.string(),
        createdAt: zod.date(),
        updatedAt: zod.date(),
    }),
    // Full key in format sk_{public}_{private} - only returned on creation
    fullKey: zod.string(),
})

export type CreateApiKeyResponse = zod.infer<typeof CreateApiKeyResponseSchema>

// Response for listing keys - never includes private part
export const GetApiKeysResponseSchema = zod.object({
    apiKeys: zod.array(zod.object({
        id: zod.number(),
        tenantId: zod.number(),
        projectId: zod.number(),
        public: zod.string(),
        type: zod.string(),
        createdAt: zod.date(),
        updatedAt: zod.date(),
    })),
})

export type GetApiKeysResponse = zod.infer<typeof GetApiKeysResponseSchema>

// ============================================================================
// Client-Side Serialized Types
// ============================================================================

export type CreateApiKeyResponseSerialized = {
    message: string
    apiKey: {
        id: number
        tenantId: number
        projectId: number
        public: string
        type: string
        createdAt: string
        updatedAt: string
    }
    fullKey: string
}

export type GetApiKeysResponseSerialized = {
    apiKeys: Array<{
        id: number
        tenantId: number
        projectId: number
        public: string
        type: string
        createdAt: string
        updatedAt: string
    }>
}
