import 'server-only'

import { NextResponse } from 'next/server'
import { publicApiKeyAuthMiddleware } from '@/infrastructure/middlewares'
import { createErrorResponse } from '@/infrastructure/api-requests'
import { GetFeatureFlagRequestSchema, type GetFeatureFlagResponse } from '../../feature-flags/dto'
import { FeatureFlagService } from '@/services/feature-flags/feature-flag-service'

type Params = Record<string, never>

/**
 * Parse feature flag value based on its type
 */
function parseFeatureFlagValue(value: string, type: string): string | number | boolean {
    if (type === 'number') {
        const parsed = Number(value)
        return isNaN(parsed) ? value : parsed
    }

    if (type === 'boolean') {
        const lowerValue = value.toLowerCase().trim()
        if (lowerValue === 'true') return true
        if (lowerValue === 'false') return false
        // If not a valid boolean string, return as-is
        return value
    }

    // Default: return as string
    return value
}

export const GET = publicApiKeyAuthMiddleware(async (context, db, req, { params }: { params: Promise<Params> }) => {
    try {
        // Parse query parameters
        const { searchParams } = new URL(req.url)

        // Get names parameter (can be comma-separated or multiple query params)
        const namesParam = searchParams.get('names')
        let names: string[] = []

        if (namesParam) {
            // Support comma-separated names: ?names=flag1,flag2,flag3
            names = namesParam.split(',').map(name => name.trim()).filter(name => name.length > 0)
        } else {
            // Support multiple name params: ?name=flag1&name=flag2
            names = searchParams.getAll('name')
        }

        const userId = searchParams.get('userId') || undefined
        const userRole = searchParams.get('userRole') || undefined
        const userAccountId = searchParams.get('userAccountId') || undefined

        // Validate request
        const validatedData = GetFeatureFlagRequestSchema.parse({
            names,
            userId,
            userRole,
            userAccountId,
        })

        const featureFlagService = new FeatureFlagService(db)

        // Get PUBLIC feature flags only with priority-based lookup
        const featureFlags = await featureFlagService.getPublicFeatureFlagsByNamesWithPriority(
            context.projectId,
            context.tenantId,
            validatedData.names,
            validatedData.userId,
            validatedData.userRole,
            validatedData.userAccountId
        )

        // Map to public DTO (exclude internal fields) and parse values based on type
        const publicFeatureFlags = featureFlags.map(flag => ({
            name: flag.name,
            value: parseFeatureFlagValue(flag.value, flag.type),
        }))

        return NextResponse.json<GetFeatureFlagResponse>(
            { featureFlags: publicFeatureFlags },
            { status: 200 }
        )
    } catch (error) {
        return createErrorResponse(error, 'get_public_feature_flags_error')
    }
})
