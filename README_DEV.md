Developer notes

Run locally:

1. Copy backend/.env.example to backend/.env and set DATABASE_URL to your Postgres connection string
2. cd backend
3. npm install
4. npx prisma generate
5. npx prisma migrate dev --name init
6. npm run dev

Do NOT commit real credentials. Use .env for runtime secrets.
