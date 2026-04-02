import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { _prisma?: InstanceType<typeof PrismaClient> };

export function getDb(): InstanceType<typeof PrismaClient> {
  if (!globalForPrisma._prisma) {
    const adapter = new PrismaPg(process.env.DATABASE_URL!);
    globalForPrisma._prisma = new (PrismaClient as any)({ adapter });
  }
  return globalForPrisma._prisma!;
}

export const prisma = new Proxy({} as InstanceType<typeof PrismaClient>, {
  get(_target, prop) {
    return (getDb() as any)[prop];
  },
});
