import { Queue, Worker, QueueScheduler, JobsOptions } from 'bullmq'
import Redis from 'ioredis'

let _queue: Queue | null = null

export function getRedisConnection() {
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) throw new Error('REDIS_URL is not configured')
  return new Redis(redisUrl)
}

export function getQueue() {
  if (!_queue) {
    const connection = getRedisConnection()
    _queue = new Queue('reminders', { connection })
    // Ensure a QueueScheduler exists so delayed jobs are processed reliably
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    new QueueScheduler('reminders', { connection })
  }
  return _queue
}

export default { getQueue }
