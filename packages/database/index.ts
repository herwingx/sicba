import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';

/// Instancia global de Prisma Client para evitar múltiples conexiones en desarrollo.
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
