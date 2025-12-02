import 'server-only'

import { NextResponse } from 'next/server'
import { authMiddleware } from '@/infrastructure/middlewares'
import { createErrorResponse } from '@/infrastructure/api-requests'
import {
    type GetUserResponse,
    type UpdateUserResponse,
    type DeleteUserResponse,
    UpdateUserRequestSchema
} from '../dto'
import { UserService } from '@/services/users/user-service'

type Params = {
    params: Promise<{ id: string }>
}

export const GET = authMiddleware(async (currentUser, db, req, { params }: Params) => {
    try {
        const { id } = await params

        const userService = new UserService(db)
        const user = await userService.getUserById(id, currentUser.tenantId)

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            )
        }

        return NextResponse.json<GetUserResponse>({ user }, { status: 200 })
    } catch (error) {
        return createErrorResponse(error, 'get_user_error')
    }
})

export const PUT = authMiddleware(async (currentUser, db, req, { params }: Params) => {
    try {
        const { id } = await params
        const body = await req.json()
        const validatedData = UpdateUserRequestSchema.parse(body)

        const userService = new UserService(db)
        const user = await userService.updateUser(id, currentUser.tenantId, {
            name: validatedData.name,
            email: validatedData.email,
            password: validatedData.password,
        })

        return NextResponse.json<UpdateUserResponse>({
            message: 'User updated successfully',
            user,
        }, { status: 200 })
    } catch (error) {
        return createErrorResponse(error, 'update_user_error')
    }
})

export const DELETE = authMiddleware(async (currentUser, db, req, { params }: Params) => {
    try {
        const { id } = await params

        // Prevent users from deleting themselves
        if (id === currentUser.id) {
            return NextResponse.json(
                { error: 'Cannot delete your own user account' },
                { status: 400 }
            )
        }

        const userService = new UserService(db)
        await userService.deleteUser(id, currentUser.tenantId)

        return NextResponse.json<DeleteUserResponse>({
            message: 'User deleted successfully',
        }, { status: 200 })
    } catch (error) {
        return createErrorResponse(error, 'delete_user_error')
    }
})
