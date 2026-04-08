import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as { _prisma?: InstanceType<typeof PrismaClient> };

export function getDb(): InstanceType<typeof PrismaClient> {
  if (!globalForPrisma._prisma) {
    const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
    const pool = new pg.Pool({ connectionString, max: 20, idleTimeoutMillis: 30000 });
    const adapter = new (PrismaPg as any)(pool);
    globalForPrisma._prisma = new (PrismaClient as any)({ adapter });
  }
  return globalForPrisma._prisma!;
}

export const prisma = new Proxy({} as InstanceType<typeof PrismaClient>, {
  get(_target, prop) {
    return (getDb() as any)[prop];
  },
});
