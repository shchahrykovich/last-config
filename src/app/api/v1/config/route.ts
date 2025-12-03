import 'server-only'

import { NextResponse } from 'next/server'
import { secretApiKeyAuthMiddleware } from '@/infrastructure/middlewares'
import { createErrorResponse } from '@/infrastructure/api-requests'
import { type GetConfigResponse } from './dto'
import { ConfigService } from '@/services/config/config-service'
import {parseConfigValue} from "@/services/value-parser";

type Params = Record<string, never>

export const GET = secretApiKeyAuthMiddleware(async (context, db, req, { params }: { params: Promise<Params> }) => {
    try {
        const configService = new ConfigService(db)

        // Get all configs for the project and tenant
        const configs = await configService.getConfigsByProjectId(
            context.projectId,
            context.tenantId
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
        return createErrorResponse(error, 'get_configs_error')
    }
})
