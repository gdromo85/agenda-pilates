import { describe, it, expect } from 'vitest'
import prisma from '../src/prisma'

describe('prisma client', () => {
  it('exports a client-like object (compilation smoke test)', async () => {
    // Under Prisma v7 the client construction validates datasources. The
    // intent of this test is to ensure the client object is available / can
    // be imported. Avoid requiring a real DB here; integration tests should
    // exercise $connect/$disconnect against a real DATABASE_URL.
    expect(prisma).toBeDefined()
  })
})
