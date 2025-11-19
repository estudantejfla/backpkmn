Backend scaffold (Node + Express + Prisma)

Steps to run locally:
1) copy .env.example to .env and set DATABASE_URL (Neon/Postgres) and JWT_SECRET
2) npm install
3) npx prisma generate
4) npx prisma migrate dev --name init
5) npm run dev

API endpoints:
POST /api/auth/register { username, password }
POST /api/auth/login { username, password } -> { token }
GET  /api/teams (Auth)
POST /api/teams (Auth) { name, pokemons:[] }
PUT  /api/teams/:id (Auth)
DELETE /api/teams/:id (Auth)
POST /api/teams/:id/share (Auth)
GET  /api/teams/public/all
