import {getCloudflareContext} from "@opennextjs/cloudflare";
import {PrismaD1} from "@prisma/adapter-d1";
import { PrismaClient } from "@prisma/client";

export interface ServerEnv {
    DB: D1Database;
}

export async function getServerContext() {
    return await getCloudflareContext({async: true});
}

export async function getDB(): Promise<PrismaClient> {
    const context = await getServerContext();
    const env = context.env as unknown as ServerEnv;
    const adapter = new PrismaD1(env.DB);
    const prisma = new PrismaClient({adapter})

    return prisma;
}
