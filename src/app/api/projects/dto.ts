import * as zod from 'zod'

// ============================================================================
// Request Schemas
// ============================================================================

export const CreateProjectRequestSchema = zod.object({
    name: zod.string().min(1, {
        message: 'Project name is required',
    }).max(255, {
        message: 'Project name must be less than 255 characters',
    }),
})

export type CreateProjectRequest = zod.infer<typeof CreateProjectRequestSchema>

// ============================================================================
// Response Schemas
// ============================================================================

export const ProjectDtoSchema = zod.object({
    id: zod.number(),
    name: zod.string(),
    tenantId: zod.number(),
    createdAt: zod.date(),
    updatedAt: zod.date(),
})

export type ProjectDto = zod.infer<typeof ProjectDtoSchema>

export const GetProjectsResponseSchema = zod.object({
    projects: zod.array(ProjectDtoSchema),
})

export type GetProjectsResponse = zod.infer<typeof GetProjectsResponseSchema>

export const CreateProjectResponseSchema = zod.object({
    message: zod.string(),
    project: ProjectDtoSchema,
})

export type CreateProjectResponse = zod.infer<typeof CreateProjectResponseSchema>

export const GetProjectByIdResponseSchema = zod.object({
    project: ProjectDtoSchema,
})

export type GetProjectByIdResponse = zod.infer<typeof GetProjectByIdResponseSchema>

// ============================================================================
// Client-Side Serialized Types (for use in client components)
// ============================================================================
// When data is fetched via JSON API, Date objects are serialized to strings

export type ProjectDtoSerialized = Omit<ProjectDto, 'createdAt' | 'updatedAt'> & {
    createdAt: string
    updatedAt: string
}

export type GetProjectsResponseSerialized = {
    projects: ProjectDtoSerialized[]
}

export type CreateProjectResponseSerialized = {
    message: string
    project: ProjectDtoSerialized
}

export type GetProjectByIdResponseSerialized = {
    project: ProjectDtoSerialized
}
