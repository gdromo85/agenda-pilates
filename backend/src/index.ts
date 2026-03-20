import express from 'express'
import dotenv from 'dotenv'
import session from 'express-session'
import studentsRouter from './routes/students'
import enrollmentsRouter from './routes/enrollments'
import templatesRouter from './routes/templates'
import sessionsRouter from './routes/sessions'
import authRouter from './routes/auth'

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

// Health check
app.get('/api/health', (_, res) => res.json({ ok: true }))

const port = process.env.PORT || 4000
app.listen(port, () => {
  console.log(`Server listening on ${port}`)
})

export default app
