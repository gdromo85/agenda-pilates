import { PrismaClient, Session } from '@prisma/client'
import { DateTime } from 'luxon'

/**
 * Create a ReminderJob for a session (studentId nullable) in an idempotent way.
 * Uses unique constraint on (sessionId, studentId, scheduledAtUtc) implemented
 * via a SELECT ... FOR NO KEY UPDATE / conditional insert pattern.
 *
 * Provider note (MVP): current delivery provider is email (SendGrid).
 * TODO(whatsapp-provider): introduce provider abstraction to support WhatsApp
 * (e.g. Twilio) without coupling reminder orchestration to email transport.
 */
export async function createReminderForSession(prisma: PrismaClient, session: Session, offsetMinutes: number) {
  const scheduledAt = DateTime.fromJSDate(session.startUtc).minus({ minutes: offsetMinutes }).toUTC().toJSDate()

  try {
    // Upsert-like behavior without relying on DB-specific upsert across tests.
    // Try to create; if unique constraint violation (P2002) occurs, ignore.
    const job = await prisma.reminderJob.create({ data: {
      sessionId: session.id,
      studentId: null,
      scheduledAtUtc: scheduledAt,
      status: 'pending',
    } })

    // Enqueue into BullMQ if worker integration configured (lazy import)
    try {
      const { getQueue } = await import('../workers/bullClient')
      const queue = getQueue()
      // schedule a job with delay computed from scheduledAtUtc
      const delay = Math.max(0, scheduledAt.getTime() - Date.now())
      await queue.add('send-reminder', { reminderJobId: job.id }, { delay, attempts: 5, backoff: { type: 'exponential', delay: 1000 } })
    } catch (err) {
      // If Redis/worker not configured, continue silently — best-effort
      // eslint-disable-next-line no-console
      console.warn('bull client not available, skipping enqueue', err.message)
    }

    return job
  } catch (err: any) {
    if (err.code === 'P2002') {
      // unique violation — job already exists; return existing one
      const existing = await prisma.reminderJob.findFirst({ where: { sessionId: session.id, studentId: null, scheduledAtUtc: scheduledAt } })
      return existing
    }
    throw err
  }
}

export default { createReminderForSession }
