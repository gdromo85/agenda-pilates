import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import waitlistRouter from '../src/routes/waitlist'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    session: {
      findUnique: vi.fn(),
    },
    student: {
      findUnique: vi.fn(),
    },
    waitlistEntry: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('../src/prisma', () => ({
  default: prismaMock,
}))

function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/api', waitlistRouter)
  return app
}

describe('waitlist routes', () => {
  const sessionId = '6f0f7a4f-c7bb-4620-ac8a-1782fce4b8b9'
  const studentId = '3897d7e5-9f8d-409b-96a9-c803212f3cef'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates waitlist entry with next position', async () => {
    prismaMock.session.findUnique.mockResolvedValue({ id: sessionId })
    prismaMock.student.findUnique.mockResolvedValue({ id: studentId })
    prismaMock.waitlistEntry.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ position: 2 })
    prismaMock.waitlistEntry.create.mockResolvedValue({
      id: 'entry-id',
      sessionId,
      studentId,
      position: 3,
    })

    const response = await request(createApp())
      .post(`/api/sessions/${sessionId}/waitlist`)
      .send({ studentId })

    expect(response.status).toBe(201)
    expect(prismaMock.waitlistEntry.create).toHaveBeenCalledWith({
      data: {
        sessionId,
        studentId,
        position: 3,
      },
      include: { student: true },
    })
  })

  it('returns conflict when student already in waitlist', async () => {
    prismaMock.session.findUnique.mockResolvedValue({ id: sessionId })
    prismaMock.student.findUnique.mockResolvedValue({ id: studentId })
    prismaMock.waitlistEntry.findFirst.mockResolvedValue({ id: 'entry-id' })

    const response = await request(createApp())
      .post(`/api/sessions/${sessionId}/waitlist`)
      .send({ studentId })

    expect(response.status).toBe(409)
  })

  it('deletes entry and reorders session positions', async () => {
    prismaMock.waitlistEntry.delete.mockResolvedValue({
      id: 'entry-id',
      sessionId: 'session-id',
    })
    prismaMock.waitlistEntry.findMany.mockResolvedValue([
      { id: 'entry-a', position: 1 },
      { id: 'entry-b', position: 4 },
    ])
    prismaMock.$transaction.mockImplementation(async (arg: any) => {
      if (Array.isArray(arg)) return arg
      return arg(prismaMock)
    })

    const response = await request(createApp()).delete('/api/waitlist/entry-id')

    expect(response.status).toBe(200)
    expect(prismaMock.waitlistEntry.update).toHaveBeenCalledTimes(1)
    expect(prismaMock.waitlistEntry.update).toHaveBeenCalledWith({
      where: { id: 'entry-b' },
      data: { position: 2 },
    })
  })
})
