import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
    createZodErrorResponse,
    createErrorResponse,
    createSuccessJsonResponse,
    createErrorJsonResponse,
    createNotFound,
    createOkResponse
} from '@/infrastructure/api-requests'
import * as zod from 'zod'

describe('api-requests', () => {
    let consoleErrorSpy: any

    beforeEach(() => {
        // Spy on console.error to capture logError output
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
        consoleErrorSpy.mockRestore()
    })

    describe('createZodErrorResponse', () => {
        it('should create a 400 response with Zod error details', async () => {
            const schema = zod.object({
                name: zod.string(),
                age: zod.number()
            })

            let zodError: zod.ZodError | null = null
            try {
                schema.parse({ name: 123, age: 'invalid' })
            } catch (error) {
                zodError = error as zod.ZodError
            }

            expect(zodError).not.toBeNull()

            const response = createZodErrorResponse(zodError!)

            expect(response.status).toBe(400)

            const json: any = await response.json()
            expect(json).toHaveProperty('error')
            expect(json.error).toBe('Invalid request data')
            expect(json).toHaveProperty('details')
        })
    })

    describe('createErrorResponse', () => {
        it('should handle Zod errors', async () => {
            const schema = zod.object({
                email: zod.string().email()
            })

            let zodError: zod.ZodError | null = null
            try {
                schema.parse({ email: 'invalid-email' })
            } catch (error) {
                zodError = error as zod.ZodError
            }

            const response = createErrorResponse(zodError!)

            expect(response.status).toBe(400)

            const json: any = await response.json()
            expect(json.error).toBe('Invalid request data')
        })

        it('should handle generic errors with default name', async () => {
            const error = new Error('Test error')

            const response = createErrorResponse(error)

            expect(response.status).toBe(500)
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'generic_error',
                expect.objectContaining({
                    error: error,
                    message: 'Test error'
                })
            )

            const json: any = await response.json()
            expect(json.error).toBe('Internal server error')
        })

        it('should handle generic errors with custom name', async () => {
            const error = new Error('Database connection failed')

            const response = createErrorResponse(error, 'database_error')

            expect(response.status).toBe(500)
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'database_error',
                expect.objectContaining({
                    error: error,
                    message: 'Database connection failed'
                })
            )
        })

        it('should include additional props in error log', async () => {
            const error = new Error('Test error')
            const props = { userId: 123, action: 'delete' }

            createErrorResponse(error, 'custom_error', props)

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'custom_error',
                expect.objectContaining({
                    error: error,
                    userId: 123,
                    action: 'delete'
                })
            )
        })
    })

    describe('createSuccessJsonResponse', () => {
        it('should create a 200 response by default', async () => {
            const data = { message: 'Success', id: 123 }

            const response = createSuccessJsonResponse(data)

            expect(response.status).toBe(200)

            const json = await response.json()
            expect(json).toEqual(data)
        })

        it('should create a response with custom status code', async () => {
            const data = { created: true }

            const response = createSuccessJsonResponse(data, 201)

            expect(response.status).toBe(201)

            const json = await response.json()
            expect(json).toEqual(data)
        })

        it('should handle null data', async () => {
            const response = createSuccessJsonResponse(null)

            expect(response.status).toBe(200)

            const json = await response.json()
            expect(json).toBeNull()
        })

        it('should handle array data', async () => {
            const data = [1, 2, 3, 4]

            const response = createSuccessJsonResponse(data)

            const json = await response.json()
            expect(json).toEqual(data)
        })
    })

    describe('createErrorJsonResponse', () => {
        it('should create a 401 response by default', async () => {
            const error = { error: 'Unauthorized' }

            const response = createErrorJsonResponse(error)

            expect(response.status).toBe(401)

            const json = await response.json()
            expect(json).toEqual(error)
        })

        it('should create a response with custom status code', async () => {
            const error = { error: 'Forbidden' }

            const response = createErrorJsonResponse(error, 403)

            expect(response.status).toBe(403)

            const json = await response.json()
            expect(json).toEqual(error)
        })

        it('should handle various error formats', async () => {
            const error = {
                error: 'Validation failed',
                details: ['Field is required', 'Invalid format']
            }

            const response = createErrorJsonResponse(error, 422)

            expect(response.status).toBe(422)

            const json = await response.json()
            expect(json).toEqual(error)
        })
    })

    describe('createNotFound', () => {
        it('should create a 404 response', async () => {
            const response = createNotFound()

            expect(response.status).toBe(404)

            const json = await response.json()
            expect(json).toEqual({ error: 'Not found' })
        })
    })

    describe('createOkResponse', () => {
        it('should create a 200 OK response', async () => {
            const response = createOkResponse()

            expect(response.status).toBe(200)

            const json = await response.json()
            expect(json).toEqual({ ok: true })
        })
    })
})
