import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '../src/prisma'
import { createReminderForSession } from '../src/services/reminderService'

// This test requires a real DATABASE_URL. Skip if not configured.
const describeIfDb = process.env.DATABASE_URL ? describe : describe.skip

describeIfDb('reminderService', () => {
  let session: any

  beforeAll(async () => {
    const instructor = await prisma.instructor.create({ data: { name: 'T', email: 't@example.com', timezone: 'UTC' } })
    session = await prisma.session.create({ data: { instructorId: instructor.id, startUtc: new Date(Date.now() + 3600 * 1000), endUtc: new Date(Date.now() + 7200 * 1000), status: 'scheduled' } })
  })

  afterAll(async () => {
    await prisma.reminderJob.deleteMany({ where: {} })
    await prisma.session.deleteMany({ where: {} })
    await prisma.instructor.deleteMany({ where: {} })
  })

  it('creates a reminder job idempotently', async () => {
    const j1 = await createReminderForSession(prisma as any, session, 15)
    expect(j1).toBeDefined()
    const j2 = await createReminderForSession(prisma as any, session, 15)
    expect(j2?.id).toBe(j1.id)
  })
})
