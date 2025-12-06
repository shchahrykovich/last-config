import {defineWorkersConfig} from "@cloudflare/vitest-pool-workers/config";
import path from "path";

export default defineWorkersConfig({
    test: {
        globals: true,
        testTimeout: 20000,
        fileParallelism: false,
        // Exclude integration tests by default (they require special setup)
        // Run with: npx vitest tests/integration
        exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/.{idea,git,cache,output,temp}/**',
            '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
            '**/tests/integration/**', // Exclude integration tests requiring Next.js/database setup
        ],
        poolOptions: {
            workers: {
                singleWorker: false,
                isolate: true,
                wrangler: {configPath: "./wrangler.jsonc"},
            },
        },
        // coverage: {
        //     provider: 'istanbul',
        //     reporter: ['text', 'text-summary'],
        // },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
            // Mock server-only package for tests
            "server-only": path.resolve(__dirname, "./tests/mocks/server-only.ts"),
            // Mock @opennextjs/cloudflare package for tests
            "@opennextjs/cloudflare": path.resolve(__dirname, "./tests/mocks/opennextjs-cloudflare.ts"),
        },
    },
});

