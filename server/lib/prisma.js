import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: process.env.DATABASE_URL
      ? {
          db: {
            url: process.env.DATABASE_URL,
          },
        }
      : undefined,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (!globalForPrisma.prisma) globalForPrisma.prisma = prisma

/**
 * Executes a database promise with a strict timeout to prevent thread stalling
 * when remote database connections are latent or unreachable.
 * @template T
 * @param {Promise<T>} promise
 * @param {number} [timeoutMs=1200]
 * @returns {Promise<T>}
 */
export async function withDbTimeout(promise, timeoutMs = 1200) {
  let timer
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Prisma operation timed out after ${timeoutMs}ms`)), timeoutMs)
  })
  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    clearTimeout(timer)
  }
}

export default prisma
