import { PrismaClient } from '@prisma/client'

// Lazy init singleton for PrismaClient. Under Prisma v7 the constructor
// validates datasources immediately and will throw if DATABASE_URL is
// missing. For test runs we provide a tiny no-op stub when NODE_ENV === 'test'
// and DATABASE_URL is not set so unit tests that only import the module
// (or call $connect/$disconnect) don't fail during CI/local runs.

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

  // If DATABASE_URL is provided, pass it explicitly to the PrismaClient
  // constructor so we don't rely on schema-time datasource url (Prisma v7).
  if (process.env.DATABASE_URL) {
    // PrismaClient constructor typing is strict; cast to any to pass runtime datasources
    return new (PrismaClient as any)({ datasources: { db: { url: process.env.DATABASE_URL } } })
  }

  return new PrismaClient()
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
