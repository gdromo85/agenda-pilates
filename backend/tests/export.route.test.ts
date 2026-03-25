import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import exportRouter from '../src/routes/export'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    student: {
      findMany: vi.fn(),
    },
    session: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('../src/prisma', () => ({
  default: prismaMock,
}))

function createApp() {
  const app = express()
  app.use('/api/export', exportRouter)
  return app
}

describe('export routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exports students csv with headers and attachment disposition', async () => {
    prismaMock.student.findMany.mockResolvedValue([
      {
        id: 'stu-1',
        name: 'Ada',
        email: 'ada@example.com',
        phone: '123',
        notes: 'pilates, beginner',
        createdAt: new Date('2026-01-10T10:00:00.000Z'),
      },
    ])

    const response = await request(createApp()).get('/api/export/students.csv')

    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toContain('text/csv')
    expect(response.headers['content-disposition']).toContain('attachment; filename="students.csv"')
    expect(response.text).toContain('id,name,email,phone,notes,createdAt')
    expect(response.text).toContain('stu-1,Ada,ada@example.com,123,"pilates, beginner",2026-01-10T10:00:00.000Z')
  })

  it('exports sessions csv with template title and attachment disposition', async () => {
    prismaMock.session.findMany.mockResolvedValue([
      {
        id: 'ses-1',
        startUtc: new Date('2026-01-10T12:00:00.000Z'),
        endUtc: new Date('2026-01-10T13:00:00.000Z'),
        status: 'scheduled',
        capacitySnapshot: 12,
        instructorId: 'ins-1',
        template: { title: 'Group AM' },
      },
    ])

    const response = await request(createApp()).get('/api/export/sessions.csv')

    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toContain('text/csv')
    expect(response.headers['content-disposition']).toContain('attachment; filename="sessions.csv"')
    expect(response.text).toContain('id,templateTitle,startUtc,endUtc,status,capacitySnapshot,instructorId')
    expect(response.text).toContain('ses-1,Group AM,2026-01-10T12:00:00.000Z,2026-01-10T13:00:00.000Z,scheduled,12,ins-1')
  })
})
