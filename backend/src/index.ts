import express from 'express'
import dotenv from 'dotenv'
import session from 'express-session'
import studentsRouter from './routes/students'
import enrollmentsRouter from './routes/enrollments'
import templatesRouter from './routes/templates'
import sessionsRouter from './routes/sessions'
import authRouter from './routes/auth'
import waitlistRouter from './routes/waitlist'
import exportRouter from './routes/export'
import notificationsRouter from './routes/notifications'
import prisma from './prisma'

dotenv.config()

const app = express()
app.use(express.json())

// Session middleware
const SESSION_SECRET = process.env.SESSION_SECRET ?? 'dev-secret-change-in-prod'
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
}))

// Auth middleware — instructorId from session OR dev fallback
app.use((req, res, next) => {
  const sessionInstructorId = (req.session as any)?.instructorId
  if (sessionInstructorId) {
    ;(req as any).instructorId = sessionInstructorId
  } else if (process.env.DEV_INSTRUCTOR_ID) {
    // Dev fallback only if not authenticated
    ;(req as any).instructorId = process.env.DEV_INSTRUCTOR_ID
  }
  next()
})

app.use('/api/auth', authRouter)
app.use('/api/students', studentsRouter)
app.use('/api/enrollments', enrollmentsRouter)
app.use('/api/templates', templatesRouter)
app.use('/api/sessions', sessionsRouter)
app.use('/api', waitlistRouter)
app.use('/api/export', exportRouter)
app.use('/api/notifications', notificationsRouter)

// Health check
app.get('/api/health', async (_req, res) => {
  let db: 'up' | 'down' = 'down'

  try {
    await prisma.$queryRaw`SELECT 1`
    db = 'up'
  } catch {
    db = 'down'
  }

  return res.json({
    ok: db === 'up',
    time: new Date().toISOString(),
    db,
  })
})

const port = process.env.PORT || 4000
app.listen(port, () => {
  console.log(`Server listening on ${port}`)
})

export default app
