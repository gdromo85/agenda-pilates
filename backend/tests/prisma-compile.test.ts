import { describe, it, expect } from 'vitest'
import prisma from '../src/prisma'

describe('prisma client', () => {
  it('can create a client and disconnect', async () => {
    expect(prisma).toBeDefined()
    await prisma.$connect()
    await prisma.$disconnect()
  })
})
