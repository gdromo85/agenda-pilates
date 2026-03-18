import express from 'express'
import dotenv from 'dotenv'
import studentsRouter from './routes/students'
import enrollmentsRouter from './routes/enrollments'
import templatesRouter from './routes/templates'

dotenv.config()

const app = express()
app.use(express.json())

// simple dev-only placeholder auth
app.use((req, res, next) => {
  // attach a fake instructor id for development
  (req as any).instructorId = process.env.DEV_INSTRUCTOR_ID || null
  next()
})

app.use('/api/students', studentsRouter)
app.use('/api/enrollments', enrollmentsRouter)
app.use('/api/templates', templatesRouter)

const port = process.env.PORT || 4000
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on ${port}`)
})

export default app
