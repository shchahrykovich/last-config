import { env } from 'cloudflare:test'

// Mock for @opennextjs/cloudflare in tests
// The real package requires OpenNext initialization which is not available in test environment
// In tests, we provide the Cloudflare context directly from the Workers pool

export async function getCloudflareContext(options?: { async: boolean }) {
    return {
        env,
        ctx: {},
        cf: {}
    }
}
