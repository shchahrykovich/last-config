import 'server-only'

import { PrismaClient } from "@prisma/client"
import * as bcrypt from "bcryptjs"
import * as crypto from "crypto"

export class ApiKeyService {
    constructor(private db: PrismaClient) {}

    /**
     * Generates a cryptographically secure random string
     * Ensures no underscores are present to avoid conflicts with key format delimiters
     */
    private generateSecureRandomString(length: number): string {
        // Generate base64url string and replace underscores with hyphens
        // This prevents conflicts with the sk_{public}_{private} format
        return crypto.randomBytes(length).toString('base64url').slice(0, length).replace(/_/g, '-')
    }

    /**
     * Generates a new secret API key pair
     * @returns Object containing public key, private key, and full key in format sk_{public}_{private}
     */
    private async generateSecretApiKey(): Promise<{
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
     * Generates a new public API key
     * @returns Object containing public key and full key in format pk_{public}
     */
    private generatePublicApiKey(): {
        publicKey: string
        fullKey: string
    } {
        // Generate secure random string for public part
        // Public part: 32 characters (longer since it's the only part)
        const publicKey = this.generateSecureRandomString(32)

        // Create full key in format pk_{public}
        const fullKey = `pk_${publicKey}`

        return {
            publicKey,
            fullKey,
        }
    }

    /**
     * Creates a new API key for a project
     */
    async createApiKey(data: {
        projectId: number
        tenantId: number
        type: 'secret' | 'public'
    }) {
        if (data.type === 'public') {
            // Generate public API key
            const { publicKey, fullKey } = this.generatePublicApiKey()

            const apiKey = await this.db.apiKeys.create({
                data: {
                    tenantId: data.tenantId,
                    projectId: data.projectId,
                    public: publicKey,
                    private: '', // No private key for public API keys
                    type: 'public',
                }
            })

            return {
                apiKey,
                fullKey, // Return the full key only once - it won't be retrievable later
            }
        } else {
            // Generate secret API key
            const { publicKey, fullKey, hashedPrivateKey } = await this.generateSecretApiKey()

            const apiKey = await this.db.apiKeys.create({
                data: {
                    tenantId: data.tenantId,
                    projectId: data.projectId,
                    public: publicKey,
                    private: hashedPrivateKey,
                    type: 'secret',
                }
            })

            return {
                apiKey,
                fullKey, // Return the full key only once - it won't be retrievable later
            }
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
    async deleteApiKey(apiKeyId: number, tenantId: number, projectId: number): Promise<boolean> {
        const result = await this.db.apiKeys.deleteMany({
            where: {
                id: apiKeyId,
                projectId,
                tenantId,
            }
        })

        return result.count > 0
    }
}
