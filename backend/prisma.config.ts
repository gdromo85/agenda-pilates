// prisma.config.ts
import { defineConfig } from 'prisma/config'
import 'dotenv/config'  // Carga las variables de entorno desde .env

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL,  // Tu conexión a PostgreSQL
  },
})