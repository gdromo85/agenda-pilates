import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import enrollmentsRouter from '../src/routes/enrollments'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    session: {
      findUnique: vi.fn(),
    },
    enrollment: {
      create: vi.fn(),
    },
    waitlistEntry: {
      findFirst: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
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
  app.use('/api/enrollments', enrollmentsRouter)
  return app
}

describe('enrollments route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns session_full when group session has no capacity', async () => {
    prismaMock.session.findUnique.mockResolvedValue({
      id: 'session-id',
      status: 'scheduled',
      capacitySnapshot: 2,
      template: { isGroup: true },
      enrollments: [{ id: 'e1' }, { id: 'e2' }],
    })

    const response = await request(createApp())
      .post('/api/enrollments')
      .send({ sessionId: '6f0f7a4f-c7bb-4620-ac8a-1782fce4b8b9', studentId: '3897d7e5-9f8d-409b-96a9-c803212f3cef' })

    expect(response.status).toBe(409)
    expect(response.body).toEqual({ error: 'session_full' })
  })

  it('removes student from waitlist after creating enrollment', async () => {
    prismaMock.session.findUnique.mockResolvedValue({
      id: 'session-id',
      status: 'scheduled',
      capacitySnapshot: 4,
      template: { isGroup: true },
      enrollments: [{ id: 'e1' }],
    })
    prismaMock.waitlistEntry.findFirst.mockResolvedValue({ id: 'wait-id', sessionId: 'session-id' })
    prismaMock.waitlistEntry.findMany.mockResolvedValue([
      { id: 'w2', position: 2 },
      { id: 'w3', position: 4 },
    ])
    prismaMock.enrollment.create.mockResolvedValue({ id: 'enrollment-id' })
    prismaMock.$transaction.mockImplementation(async (arg: any) => {
      if (Array.isArray(arg)) return arg
      return arg(prismaMock)
    })

    const response = await request(createApp())
      .post('/api/enrollments')
      .send({ sessionId: '6f0f7a4f-c7bb-4620-ac8a-1782fce4b8b9', studentId: '3897d7e5-9f8d-409b-96a9-c803212f3cef' })

    expect(response.status).toBe(201)
    expect(prismaMock.waitlistEntry.delete).toHaveBeenCalledWith({ where: { id: 'wait-id' } })
    expect(prismaMock.waitlistEntry.update).toHaveBeenCalledWith({
      where: { id: 'w3' },
      data: { position: 2 },
    })
  })
})
