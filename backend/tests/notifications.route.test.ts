import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import notificationsRouter from '../src/routes/notifications'

const { prismaMock, sendgridMock } = vi.hoisted(() => ({
  prismaMock: {
    session: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
  sendgridMock: {
    setApiKey: vi.fn(),
    send: vi.fn(),
  },
}))

vi.mock('../src/prisma', () => ({
  default: prismaMock,
}))

vi.mock('@sendgrid/mail', () => ({
  default: sendgridMock,
}))

function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/notifications', notificationsRouter)
  return app
}

describe('notifications routes', () => {
  const sessionId = '6f0f7a4f-c7bb-4620-ac8a-1782fce4b8b9'
  const student1Id = '3897d7e5-9f8d-409b-96a9-c803212f3cef'
  const student2Id = '6fd2c4ee-5a04-4fa5-8a7b-0a4df1fcd3a8'

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SENDGRID_API_KEY = 'test-key'
    process.env.SENDGRID_FROM_EMAIL = 'no-reply@test.dev'
  })

  it('lists pending session notifications in range', async () => {
    prismaMock.session.findMany.mockResolvedValue([
      {
        id: 'session-1',
        startUtc: new Date('2026-03-25T10:00:00.000Z'),
        template: { title: 'Pilates Mat' },
        enrollments: [
          {
            student: {
              id: student1Id,
              name: 'Ana',
              email: 'ana@test.dev',
              phone: '+541111111111',
            },
          },
        ],
      },
    ])

    const response = await request(createApp())
      .get('/api/notifications/pending')
      .query({
        fromUtc: '2026-03-25T00:00:00.000Z',
        toUtc: '2026-03-26T00:00:00.000Z',
      })

    expect(response.status).toBe(200)
    expect(response.body).toEqual([
      {
        sessionId: 'session-1',
        classTitle: 'Pilates Mat',
        startUtc: '2026-03-25T10:00:00.000Z',
        students: [
          {
            id: student1Id,
            name: 'Ana',
            email: 'ana@test.dev',
            phone: '+541111111111',
          },
        ],
      },
    ])
    expect(prismaMock.session.findMany).toHaveBeenCalledTimes(1)
  })

  it('sends reminder to all active enrollments when studentIds are omitted', async () => {
    prismaMock.session.findUnique.mockResolvedValue({
      id: sessionId,
      startUtc: new Date('2026-03-25T10:00:00.000Z'),
      template: { title: 'Pilates Mat' },
      enrollments: [
        { student: { id: student1Id, name: 'Ana', email: 'ana@test.dev', phone: null } },
        { student: { id: student2Id, name: 'Beto', email: 'beto@test.dev', phone: null } },
      ],
    })
    sendgridMock.send.mockResolvedValue([{ statusCode: 202 }])

    const response = await request(createApp())
      .post('/api/notifications/send')
      .send({ sessionId })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ sent: 2, failed: 0 })
    expect(sendgridMock.send).toHaveBeenCalledTimes(2)
  })

  it('sends reminder only to selected students when studentIds are provided', async () => {
    prismaMock.session.findUnique.mockResolvedValue({
      id: sessionId,
      startUtc: new Date('2026-03-25T10:00:00.000Z'),
      template: { title: 'Pilates Mat' },
      enrollments: [
        { student: { id: student1Id, name: 'Ana', email: 'ana@test.dev', phone: null } },
        { student: { id: student2Id, name: 'Beto', email: 'beto@test.dev', phone: null } },
      ],
    })
    sendgridMock.send.mockResolvedValue([{ statusCode: 202 }])

    const response = await request(createApp())
      .post('/api/notifications/send')
      .send({
        sessionId,
        studentIds: [student2Id],
        message: 'Recordatorio personalizado',
      })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ sent: 1, failed: 0 })
    expect(sendgridMock.send).toHaveBeenCalledTimes(1)
  })
})
