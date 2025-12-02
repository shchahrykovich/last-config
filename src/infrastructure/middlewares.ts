import 'server-only'
import {NextRequest, NextResponse} from "next/server";
import {auth} from "@/app/auth";
import {getDB} from "@/lib/utils";
import {createErrorResponse} from "@/infrastructure/api-requests";
import {loggingStore} from "@/infrastructure/logging";
import {v7 as uuidv7} from "uuid";
import {PrismaClient, User, ApiKeys} from "@prisma/client";
import * as bcrypt from "bcryptjs";

export type AuthHandlerWithParams<T, P = unknown> = (currentUser: User,
                                                     db: PrismaClient,
                                                     req: NextRequest,
                                                     {params}: { params: Promise<P> }) => Promise<T>;

export function authMiddleware<T, P>(handler: AuthHandlerWithParams<T, P>) {
    return async (req: NextRequest, {params}: { params: Promise<P> }) => {
        let currentUser: User | null = null;

        try {
            const session = await auth();
            if (!session?.user?.id) {
                return NextResponse.json({error: 'Unauthorized'}, {status: 401});
            }

            const db = await getDB();

            currentUser = await db.user.findUnique({
                where: {id: session.user.id},
            }) as User;

            if (!currentUser) {
                return NextResponse.json({error: 'User not found'}, {status: 404});
            }

            return loggingStore.run({
                userId: currentUser?.id,
                tenantId: currentUser?.tenantId,
                method: req.method,
                url: req.url,
                reqId: uuidv7(),
            }, () => {
                return handler(currentUser!, db, req, {params});
            });
        } catch (error) {
            return createErrorResponse(error, 'generic_error');
        }
    }
}

// ============================================================================
// API Key Authentication Middleware
// ============================================================================

export type ApiKeyAuthContext = {
    apiKey: ApiKeys;
    projectId: number;
    tenantId: number;
};

export type ApiKeyAuthHandler<T, P = unknown> = (
    context: ApiKeyAuthContext,
    db: PrismaClient,
    req: NextRequest,
    {params}: { params: Promise<P> }
) => Promise<T>;

/**
 * Middleware for API key authentication
 * Expects Authorization header with format: Bearer sk_{public}_{private}
 */
export function secretApiKeyAuthMiddleware<T, P>(handler: ApiKeyAuthHandler<T, P>) {
    return async (req: NextRequest, {params}: { params: Promise<P> }) => {
        try {
            // Extract API key from Authorization header
            const authHeader = req.headers.get('Authorization');
            if (!authHeader) {
                return NextResponse.json({error: 'Missing Authorization header'}, {status: 401});
            }

            // Check if it's a Bearer token
            const apiKey = authHeader.trim();

            // Parse API key format: sk_{public}_{private}
            const parts = apiKey.split('_');
            if (parts.length !== 3 || parts[0] !== 'sk') {
                return NextResponse.json({error: 'Invalid API key format. Expected: sk_{public}_{private}'}, {status: 401});
            }

            const [, publicKey, privateKey] = parts;

            if (!publicKey || !privateKey) {
                return NextResponse.json({error: 'Invalid API key format'}, {status: 401});
            }

            const db = await getDB();

            // Look up API key by public part
            const apiKeyRecord = await db.apiKeys.findFirst({
                where: {
                    public: publicKey,
                }
            });

            if (!apiKeyRecord) {
                return NextResponse.json({error: 'Invalid API key'}, {status: 401});
            }

            // Verify private key using bcrypt
            const isValid = await bcrypt.compare(privateKey, apiKeyRecord.private);
            if (!isValid) {
                return NextResponse.json({error: 'Invalid API key'}, {status: 401});
            }

            // Create context with API key information
            const context: ApiKeyAuthContext = {
                apiKey: apiKeyRecord,
                projectId: apiKeyRecord.projectId,
                tenantId: apiKeyRecord.tenantId,
            };

            return loggingStore.run({
                tenantId: apiKeyRecord.tenantId,
                projectId: apiKeyRecord.projectId,
                apiKeyId: apiKeyRecord.id,
                method: req.method,
                url: req.url,
                reqId: uuidv7(),
            }, () => {
                return handler(context, db, req, {params});
            });
        } catch (error) {
            return createErrorResponse(error, 'api_key_auth_error');
        }
    }
}

// ============================================================================
// Public API Key Authentication Middleware
// ============================================================================

/**
 * Middleware for public API key authentication
 * Expects Authorization header with format: pk_{public}
 * Public keys can be safely used in client-side code
 */
export function publicApiKeyAuthMiddleware<T, P>(handler: ApiKeyAuthHandler<T, P>) {
    return async (req: NextRequest, {params}: { params: Promise<P> }) => {
        try {
            // Extract API key from Authorization header
            const authHeader = req.headers.get('Authorization');
            if (!authHeader) {
                return NextResponse.json({error: 'Missing Authorization header'}, {status: 401});
            }

            const apiKey = authHeader.trim();

            // Parse API key format: pk_{public}
            const parts = apiKey.split('_');
            if (parts.length !== 2 || parts[0] !== 'pk') {
                return NextResponse.json({error: 'Invalid API key format. Expected: pk_{public}'}, {status: 401});
            }

            const [, publicKey] = parts;

            if (!publicKey) {
                return NextResponse.json({error: 'Invalid API key format'}, {status: 401});
            }

            const db = await getDB();

            // Look up public API key
            const apiKeyRecord = await db.apiKeys.findFirst({
                where: {
                    public: publicKey,
                    type: 'public',
                }
            });

            if (!apiKeyRecord) {
                return NextResponse.json({error: 'Invalid API key'}, {status: 401});
            }

            // Create context with API key information
            const context: ApiKeyAuthContext = {
                apiKey: apiKeyRecord,
                projectId: apiKeyRecord.projectId,
                tenantId: apiKeyRecord.tenantId,
            };

            return loggingStore.run({
                tenantId: apiKeyRecord.tenantId,
                projectId: apiKeyRecord.projectId,
                apiKeyId: apiKeyRecord.id,
                method: req.method,
                url: req.url,
                reqId: uuidv7(),
            }, () => {
                return handler(context, db, req, {params});
            });
        } catch (error) {
            return createErrorResponse(error, 'public_api_key_auth_error');
        }
    }
}
