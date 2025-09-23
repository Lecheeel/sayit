import { PrismaClient } from '@prisma/client'

// 全局声明，防止在开发环境中创建多个 Prisma 实例
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma 