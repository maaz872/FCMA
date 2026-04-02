import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeonHttp } from "@prisma/adapter-neon";
import { neon } from "@neondatabase/serverless";

const globalForPrisma = globalThis as unknown as { _prisma?: InstanceType<typeof PrismaClient> };

export function getDb(): InstanceType<typeof PrismaClient> {
  if (!globalForPrisma._prisma) {
    const sql = neon(process.env.DATABASE_URL!);
    const adapter = new (PrismaNeonHttp as any)(sql);
    globalForPrisma._prisma = new (PrismaClient as any)({ adapter });
  }
  return globalForPrisma._prisma!;
}

export const prisma = new Proxy({} as InstanceType<typeof PrismaClient>, {
  get(_target, prop) {
    return (getDb() as any)[prop];
  },
});
