import 'server-only'

import { NextResponse } from 'next/server'
import { publicApiKeyAuthMiddleware } from '@/infrastructure/middlewares'
import { createErrorResponse } from '@/infrastructure/api-requests'
import { type GetConfigResponse } from '../../config/dto'
import { ConfigService } from '@/services/config/config-service'
import {parseConfigValue} from "@/services/value-parser";

type Params = Record<string, never>

export const GET = publicApiKeyAuthMiddleware(async (context, db, req, { params }: { params: Promise<Params> }) => {
    try {
        const configService = new ConfigService(db)

        // Get only PUBLIC configs for the project and tenant
        const configs = await configService.getConfigsByProjectId(
            context.projectId,
            context.tenantId,
            true // isPublic = true
        )

        // Map to object with config names as keys and parsed values
        const configObject = configs.reduce((acc, config) => {
            acc[config.name] = parseConfigValue(config.value, config.type)
            return acc
        }, {} as Record<string, string | number | boolean>)

        return NextResponse.json<GetConfigResponse>(
            configObject,
            { status: 200 }
        )
    } catch (error) {
        return createErrorResponse(error, 'get_public_configs_error')
    }
})
