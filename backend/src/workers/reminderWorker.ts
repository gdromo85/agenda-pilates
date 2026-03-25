import { Worker } from 'bullmq'
import { getRedisConnection } from './bullClient'
import prisma from '../prisma'
import { sendNotificationEmail } from '../services/notificationSender'

// Provider note (MVP): reminder worker currently sends email notifications.
// TODO(whatsapp-provider): extract provider interface and add WhatsApp/Twilio
// implementation while keeping queue/job semantics unchanged.

export function startWorker() {
  const redis = getRedisConnection()

  const worker = new Worker('reminders', async (job) => {
    const { reminderJobId } = job.data as { reminderJobId: string }
    // Load the ReminderJob and session
    const rj = await prisma.reminderJob.findUnique({ where: { id: reminderJobId } })
    if (!rj) return

    // Idempotency: if already sent, skip
    if (rj.status === 'sent') return

    // Mark attempt
    await prisma.reminderJob.update({ where: { id: reminderJobId }, data: { attempts: { increment: 1 } } })

    // Compose email
    const session = await prisma.session.findUnique({ where: { id: rj.sessionId }, include: { template: true } })
    const instructor = await prisma.instructor.findUnique({ where: { id: session!.instructorId } })

    const msg = {
      to: 'student@example.com', // placeholder; studentId may be null for per-session reminder
      from: 'no-reply@pilates.example.com',
      subject: `Reminder: ${session!.template?.title ?? 'Class'} at ${session!.startUtc.toISOString()}`,
      text: `You have a class at ${session!.startUtc.toISOString()} with ${instructor?.name}`,
    }

    try {
      await sendNotificationEmail({
        to: msg.to,
        subject: msg.subject,
        text: msg.text,
      })

      await prisma.reminderJob.update({ where: { id: reminderJobId }, data: { status: 'sent', sentAtUtc: new Date(), providerResponse: 'sent-via-email-provider' } })
    } catch (err: any) {
      // Log provider response and mark failed or leave pending for retries
      await prisma.reminderJob.update({ where: { id: reminderJobId }, data: { providerResponse: err.message } })
      throw err // rethrow to allow BullMQ retry/backoff
    }
  }, { connection: redis })

  return worker
}

export default { startWorker }
