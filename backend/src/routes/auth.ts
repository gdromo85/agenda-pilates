import { Router } from 'express'
import bcrypt from 'bcrypt'
import prisma from '../prisma'

const router = Router()
const SESSION_SECRET = process.env.SESSION_SECRET ?? 'dev-secret-change-in-prod'

// Lazy import to avoid circular deps — express-session modifies app at config time
async function getSession() {
  const session = (await import('express-session')).default
  return session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
}

router.post('/register', async (req, res) => {
  const { username, password, instructorId } = req.body as {
    username: string
    password: string
    instructorId: string
  }

  if (!username || !password || !instructorId) {
    return res.status(400).json({ error: 'username, password and instructorId required' })
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'password must be at least 8 characters' })
  }

  const passwordHash = await bcrypt.hash(password, 12)

  try {
    const user = await prisma.userAuth.create({
      data: { username, passwordHash, instructorId },
    })
    res.status(201).json({ id: user.id, username: user.username })
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'username already exists' })
    }
    console.error(err)
    res.status(500).json({ error: 'internal' })
  }
})

router.post('/login', async (req, res) => {
  const { username, password } = req.body as { username: string; password: string }

  if (!username || !password) {
    return res.status(400).json({ error: 'username and password required' })
  }

  const user = await prisma.userAuth.findUnique({ where: { username } })
  if (!user) {
    return res.status(401).json({ error: 'invalid credentials' })
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    return res.status(401).json({ error: 'invalid credentials' })
  }

  ;(req.session as any).userId = user.id
  ;(req.session as any).instructorId = user.instructorId

  res.json({ id: user.id, username: user.username, instructorId: user.instructorId })
})

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'logout failed' })
    res.json({ ok: true })
  })
})

router.get('/me', async (req, res) => {
  const userId = (req.session as any)?.userId
  if (!userId) return res.status(401).json({ error: 'not authenticated' })

  const user = await prisma.userAuth.findUnique({
    where: { id: userId },
    select: { id: true, username: true, instructorId: true },
  })

  if (!user) return res.status(401).json({ error: 'not authenticated' })
  res.json(user)
})

export default router
