import { PrismaClient } from '@prisma/client'
import { seedProduction } from './seed-prod'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  dbSynced?: boolean
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}

// Trigger production database seeding/syncing asynchronously on startup
if (typeof window === 'undefined' && !globalForPrisma.dbSynced) {
  globalForPrisma.dbSynced = true
  seedProduction().catch((err) => {
    console.error('Failed to run production DB seed/sync:', err)
  })
}