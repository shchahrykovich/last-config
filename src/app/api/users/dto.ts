import * as zod from 'zod'

// ============================================================================
// Request Schemas
// ============================================================================

export const CreateUserRequestSchema = zod.object({
    email: zod.string().email(),
    password: zod.string().min(6),
    name: zod.string().optional(),
})

export type CreateUserRequest = zod.infer<typeof CreateUserRequestSchema>

export const UpdateUserRequestSchema = zod.object({
    name: zod.string().optional(),
    email: zod.string().email().optional(),
    password: zod.string().min(6).optional(),
})

export type UpdateUserRequest = zod.infer<typeof UpdateUserRequestSchema>

// ============================================================================
// Response Schemas
// ============================================================================

export const UserDtoSchema = zod.object({
    id: zod.string(),
    email: zod.string(),
    name: zod.string().nullable(),
    tenantId: zod.number(),
    emailVerified: zod.date().nullable(),
    image: zod.string().nullable(),
})

export type UserDto = zod.infer<typeof UserDtoSchema>

export const GetUsersResponseSchema = zod.object({
    users: zod.array(UserDtoSchema),
})

export type GetUsersResponse = zod.infer<typeof GetUsersResponseSchema>

export const GetUserResponseSchema = zod.object({
    user: UserDtoSchema,
})

export type GetUserResponse = zod.infer<typeof GetUserResponseSchema>

export const CreateUserResponseSchema = zod.object({
    message: zod.string(),
    user: UserDtoSchema,
})

export type CreateUserResponse = zod.infer<typeof CreateUserResponseSchema>

export const UpdateUserResponseSchema = zod.object({
    message: zod.string(),
    user: UserDtoSchema,
})

export type UpdateUserResponse = zod.infer<typeof UpdateUserResponseSchema>

export const DeleteUserResponseSchema = zod.object({
    message: zod.string(),
})

export type DeleteUserResponse = zod.infer<typeof DeleteUserResponseSchema>

// ============================================================================
// Client-Side Serialized Types
// ============================================================================

export type UserDtoSerialized = {
    id: string
    email: string
    name: string | null
    tenantId: number
    emailVerified: string | null
    image: string | null
}

export type GetUsersResponseSerialized = {
    users: UserDtoSerialized[]
}

export type GetUserResponseSerialized = {
    user: UserDtoSerialized
}

export type CreateUserResponseSerialized = {
    message: string
    user: UserDtoSerialized
}

export type UpdateUserResponseSerialized = {
    message: string
    user: UserDtoSerialized
}
