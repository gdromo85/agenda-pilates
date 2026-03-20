#!/usr/bin/env node
/**
 * Dev script to register the first admin user.
 * Usage: node scripts/registerUser.js <username> <password> <instructorId>
 * Example: node scripts/registerUser.js admin tu_password_segura 11111111-1111-1111-1111-111111111111
 */
require('dotenv').config()
const bcrypt = require('bcrypt')
const { PrismaPg } = require('@prisma/adapter-pg')
const { Pool } = require('pg')
const { PrismaClient } = require('@prisma/client')

async function main() {
  const [,, username, password, instructorId] = process.argv

  if (!username || !password || !instructorId) {
    console.error('Usage: node scripts/registerUser.js <username> <password> <instructorId>')
    process.exit(1)
  }

  if (password.length < 8) {
    console.error('Error: password must be at least 8 characters')
    process.exit(1)
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  const passwordHash = await bcrypt.hash(password, 12)

  try {
    const user = await prisma.userAuth.create({
      data: { username, passwordHash, instructorId },
    })
    console.log(`✅ User created: ${user.username} (id: ${user.id})`)
  } catch (err) {
    if (err.code === 'P2002') {
      console.error(`❌ Username '${username}' already exists`)
    } else {
      console.error('❌ Error:', err.message)
    }
    process.exit(1)
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main()
