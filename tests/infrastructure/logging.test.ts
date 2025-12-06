import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logError, logInfo, loggingStore } from '@/infrastructure/logging'

describe('logging', () => {
    let consoleErrorSpy: any
    let consoleLogSpy: any

    beforeEach(() => {
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    })

    afterEach(() => {
        consoleErrorSpy.mockRestore()
        consoleLogSpy.mockRestore()
    })

    describe('logError', () => {
        it('should log error with default name', () => {
            const error = new Error('Test error')

            logError(error)

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'generic_error',
                expect.objectContaining({
                    error: error,
                    message: 'Test error',
                    stack: expect.any(String)
                })
            )
        })

        it('should log error with custom name', () => {
            const error = new Error('Database error')

            logError(error, 'database_error')

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'database_error',
                expect.objectContaining({
                    error: error,
                    message: 'Database error'
                })
            )
        })

        it('should include additional props', () => {
            const error = new Error('Validation error')
            const props = { userId: 123, field: 'email' }

            logError(error, 'validation_error', props)

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'validation_error',
                expect.objectContaining({
                    error: error,
                    message: 'Validation error',
                    userId: 123,
                    field: 'email'
                })
            )
        })

        it('should include context from loggingStore', () => {
            const error = new Error('Context error')
            const context = {
                userId: 'user-123',
                tenantId: 456,
                reqId: 'req-789'
            }

            loggingStore.run(context, () => {
                logError(error, 'context_error')
            })

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'context_error',
                expect.objectContaining({
                    error: error,
                    message: 'Context error',
                    userId: 'user-123',
                    tenantId: 456,
                    reqId: 'req-789'
                })
            )
        })

        it('should merge context and props', () => {
            const error = new Error('Merge test')
            const context = { userId: 'user-123', tenantId: 456 }
            const props = { action: 'delete', itemId: 789 }

            loggingStore.run(context, () => {
                logError(error, 'merge_error', props)
            })

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'merge_error',
                expect.objectContaining({
                    error: error,
                    message: 'Merge test',
                    userId: 'user-123',
                    tenantId: 456,
                    action: 'delete',
                    itemId: 789
                })
            )
        })

        it('should handle errors without message property', () => {
            const error = { code: 'ERR_001', details: 'Something went wrong' }

            logError(error, 'custom_error')

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'custom_error',
                expect.objectContaining({
                    error: error,
                    message: undefined
                })
            )
        })

        it('should work without context (empty store)', () => {
            const error = new Error('No context')

            logError(error, 'no_context_error')

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'no_context_error',
                expect.objectContaining({
                    error: error,
                    message: 'No context'
                })
            )
        })
    })

    describe('logInfo', () => {
        it('should log info message', () => {
            logInfo('User logged in')

            expect(consoleLogSpy).toHaveBeenCalledWith(
                'User logged in',
                {}
            )
        })

        it('should log info with props', () => {
            const props = { userId: 123, action: 'login' }

            logInfo('User action', props)

            expect(consoleLogSpy).toHaveBeenCalledWith(
                'User action',
                props
            )
        })

        it('should include context from loggingStore', () => {
            const context = {
                userId: 'user-456',
                tenantId: 789,
                reqId: 'req-abc'
            }

            loggingStore.run(context, () => {
                logInfo('Request processed')
            })

            expect(consoleLogSpy).toHaveBeenCalledWith(
                'Request processed',
                context
            )
        })

        it('should merge context and props', () => {
            const context = { userId: 'user-123', tenantId: 456 }
            const props = { status: 'success', duration: 150 }

            loggingStore.run(context, () => {
                logInfo('Operation completed', props)
            })

            expect(consoleLogSpy).toHaveBeenCalledWith(
                'Operation completed',
                {
                    userId: 'user-123',
                    tenantId: 456,
                    status: 'success',
                    duration: 150
                }
            )
        })

        it('should work without context (empty store)', () => {
            logInfo('Simple message')

            expect(consoleLogSpy).toHaveBeenCalledWith(
                'Simple message',
                {}
            )
        })

        it('should handle various prop types', () => {
            const props = {
                string: 'value',
                number: 123,
                boolean: true,
                array: [1, 2, 3],
                object: { nested: 'data' },
                null: null,
                undefined: undefined
            }

            logInfo('Complex props', props)

            expect(consoleLogSpy).toHaveBeenCalledWith(
                'Complex props',
                props
            )
        })
    })

    describe('loggingStore', () => {
        it('should isolate context between different runs', () => {
            const context1 = { userId: 'user-1' }
            const context2 = { userId: 'user-2' }

            loggingStore.run(context1, () => {
                logInfo('User 1 action')
            })

            loggingStore.run(context2, () => {
                logInfo('User 2 action')
            })

            expect(consoleLogSpy).toHaveBeenNthCalledWith(
                1,
                'User 1 action',
                context1
            )

            expect(consoleLogSpy).toHaveBeenNthCalledWith(
                2,
                'User 2 action',
                context2
            )
        })

        it('should handle nested loggingStore.run calls', () => {
            const outerContext = { level: 'outer' }
            const innerContext = { level: 'inner' }

            loggingStore.run(outerContext, () => {
                logInfo('Outer log')

                loggingStore.run(innerContext, () => {
                    logInfo('Inner log')
                })

                logInfo('Outer log again')
            })

            expect(consoleLogSpy).toHaveBeenNthCalledWith(
                1,
                'Outer log',
                outerContext
            )

            expect(consoleLogSpy).toHaveBeenNthCalledWith(
                2,
                'Inner log',
                innerContext
            )

            expect(consoleLogSpy).toHaveBeenNthCalledWith(
                3,
                'Outer log again',
                outerContext
            )
        })
    })
})
