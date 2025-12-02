import 'server-only'

import { PrismaClient } from "@prisma/client";

export async function createTenant(db: PrismaClient) {
    const tenant = await db.tenants.create({
        data: {
            isActive: true,
        }
    });

    return tenant;
}
