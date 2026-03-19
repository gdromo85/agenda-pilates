import { PrismaClient } from '@prisma/client'

// Note: Prisma v7 requires providing a datasource at runtime. The recommended
// pattern for PostgreSQL is to pass an adapter created by @prisma/adapter-pg
// backed by a `pg` Pool. We only construct the adapter when a DATABASE_URL is
// available. In test runs (NODE_ENV === 'test') with no DATABASE_URL we return
// a tiny stub so unit tests that import this module don't require a real DB.

let _prisma: PrismaClient | null = null

function createPrismaClient(): PrismaClient {
  // If running tests and no DATABASE_URL is set, return a lightweight stub
  // so tests that only assert the client exists do not require a real DB.
  if (process.env.NODE_ENV === 'test' && !process.env.DATABASE_URL) {
    const stub = {
      $connect: async () => {},
      $disconnect: async () => {},
    } as unknown as PrismaClient
    return stub
  }

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    // In non-test environments a DATABASE_URL is required.
    throw new Error('PrismaClient needs non-empty DATABASE_URL in this environment')
  }

  // Import adapter and pg only when actually needed to avoid loading extra
  // modules during lightweight test runs.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PrismaPg } = require('@prisma/adapter-pg')
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Pool } = require('pg')

  const pool = new Pool({ connectionString: databaseUrl })
  const adapter = new PrismaPg(pool)

  return new PrismaClient({ adapter })
}

export function getPrisma(): PrismaClient {
  if (!_prisma) _prisma = createPrismaClient()
  return _prisma
}

// Default export remains compatible with existing imports. We expose a proxy
// that lazily constructs the client on first property access.
const prismaProxy = new Proxy({} as PrismaClient, {
  get(_target, prop: PropertyKey) {
    const client = getPrisma()
    // @ts-ignore - forward runtime property access to client
    return (client as any)[prop]
  },
  set(_target, prop: PropertyKey, value: any) {
    const client = getPrisma()
    // @ts-ignore
    ;(client as any)[prop] = value
    return true
  },
})

export default prismaProxy
