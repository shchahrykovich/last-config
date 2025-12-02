import 'server-only'

import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/utils'
import bcrypt from 'bcryptjs'
import * as zod from 'zod'
import {createTenant} from "@/services/tenants/tenant-service";
import {logError, logInfo} from "@/infrastructure/logging";

const SignUpSchema = zod.object({
    email: zod.string().email({
        message: 'Invalid email address',
    }),
    password: zod.string().min(8, {
        message: 'Password must be at least 8 characters long',
    }),
})

export async function POST(request: NextRequest) {
    try {
        logInfo('sign_up_request');
        const body = await request.json()
        const { email, password } = await SignUpSchema.parseAsync(body)

        // Normalize email to lowercase
        const normalizedEmail = email.toLowerCase()

        const db = await getDB();

        if (process.env.ALLOW_TO_CREATE_MORE_THAN_ONE_TENANT !== 'true') {
            const existingTenants = await db.tenants.count();
            if (existingTenants > 0) {
                return NextResponse.json(
                    { error: 'Sign-ups are disabled' },
                    { status: 403 }
                )
            }
        }

        const existingUser = await db.user.findUnique({
            where: { email: normalizedEmail }
        });

        if (existingUser) {
            return NextResponse.json(
                { error: 'User with this email already exists' },
                { status: 400 }
            )
        }

        const tenant = await createTenant(db);

        // Use async bcrypt hash
        const hashedPassword = await bcrypt.hash(password, 10)

        // Create the user
        const user = await db.user.create({
            data: {
                email: normalizedEmail,
                password: hashedPassword,
                tenantId: tenant.id,
            }
        })

        // Return success response without password
        return NextResponse.json({
            message: 'User created successfully',
            user: {
                id: user.id,
                email: user.email,
                tenantId: user.tenantId,
            }
        }, { status: 201 })

    } catch (error) {
        if (error instanceof zod.ZodError) {
            return NextResponse.json(
                { error: 'Validation error', details: 'none' },
                { status: 400 }
            )
        }

        logError(error, 'sign_up_error');
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
