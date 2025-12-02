import 'server-only'

import { PrismaClient } from "@prisma/client"
import * as bcrypt from "bcryptjs"
import * as crypto from "crypto"

export class ApiKeyService {
    constructor(private db: PrismaClient) {}

    /**
     * Generates a cryptographically secure random string
     */
    private generateSecureRandomString(length: number): string {
        return crypto.randomBytes(length).toString('base64url').slice(0, length)
    }

    /**
     * Generates a new API key pair
     * @returns Object containing public key, private key, and full key in format sk_{public}_{private}
     */
    private async generateApiKey(): Promise<{
        publicKey: string
        privateKey: string
        fullKey: string
        hashedPrivateKey: string
    }> {
        // Generate secure random strings
        // Public part: 16 characters
        // Private part: 32 characters
        const publicKey = this.generateSecureRandomString(16)
        const privateKey = this.generateSecureRandomString(32)

        // Create full key in format sk_{public}_{private}
        const fullKey = `sk_${publicKey}_${privateKey}`

        // Hash the private key for storage
        const hashedPrivateKey = await bcrypt.hash(privateKey, 10)

        return {
            publicKey,
            privateKey,
            fullKey,
            hashedPrivateKey,
        }
    }

    /**
     * Creates a new API key for a project
     */
    async createApiKey(data: {
        projectId: number
        tenantId: number
    }) {
        const { publicKey, fullKey, hashedPrivateKey } = await this.generateApiKey()

        const apiKey = await this.db.apiKeys.create({
            data: {
                tenantId: data.tenantId,
                projectId: data.projectId,
                public: publicKey,
                private: hashedPrivateKey,
                type: 'secret', // Type of API key
            }
        })

        return {
            apiKey,
            fullKey, // Return the full key only once - it won't be retrievable later
        }
    }

    /**
     * Verifies if a provided API key matches the stored hash
     */
    async verifyApiKey(publicKey: string, privateKey: string): Promise<boolean> {
        const apiKey = await this.db.apiKeys.findFirst({
            where: {
                public: publicKey,
            }
        })

        if (!apiKey) {
            return false
        }

        return await bcrypt.compare(privateKey, apiKey.private)
    }

    /**
     * Gets all API keys for a project (without private parts)
     */
    async getApiKeysByProjectId(projectId: number, tenantId: number) {
        const apiKeys = await this.db.apiKeys.findMany({
            where: {
                projectId,
                tenantId,
            },
            select: {
                id: true,
                tenantId: true,
                projectId: true,
                public: true,
                type: true,
                createdAt: true,
                updatedAt: true,
                // Explicitly exclude private field
            },
            orderBy: {
                createdAt: 'desc',
            }
        })

        return apiKeys
    }

    /**
     * Verifies project access for tenant
     */
    async verifyProjectAccess(projectId: number, tenantId: number): Promise<boolean> {
        const project = await this.db.projects.findFirst({
            where: {
                id: projectId,
                tenantId,
            }
        })

        return project !== null
    }

    /**
     * Deletes an API key
     */
    async deleteApiKey(apiKeyId: number, tenantId: number): Promise<boolean> {
        const result = await this.db.apiKeys.deleteMany({
            where: {
                id: apiKeyId,
                tenantId,
            }
        })

        return result.count > 0
    }
}
