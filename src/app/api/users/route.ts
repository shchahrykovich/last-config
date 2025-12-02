import 'server-only'

import { NextResponse } from 'next/server'
import { authMiddleware } from '@/infrastructure/middlewares'
import { createErrorResponse } from '@/infrastructure/api-requests'
import {
    type GetUsersResponse,
    type CreateUserResponse,
    CreateUserRequestSchema
} from './dto'
import { UserService } from '@/services/users/user-service'

export const GET = authMiddleware(async (currentUser, db) => {
    try {
        const userService = new UserService(db)
        const users = await userService.getUsersByTenantId(currentUser.tenantId)

        return NextResponse.json<GetUsersResponse>({ users }, { status: 200 })
    } catch (error) {
        return createErrorResponse(error, 'get_users_error')
    }
})

export const POST = authMiddleware(async (currentUser, db, req) => {
    try {
        const body = await req.json()
        const validatedData = CreateUserRequestSchema.parse(body)

        const userService = new UserService(db)
        const user = await userService.createUser({
            email: validatedData.email,
            password: validatedData.password,
            name: validatedData.name,
            tenantId: currentUser.tenantId,
        })

        return NextResponse.json<CreateUserResponse>({
            message: 'User created successfully',
            user,
        }, { status: 201 })
    } catch (error) {
        return createErrorResponse(error, 'create_user_error')
    }
})
