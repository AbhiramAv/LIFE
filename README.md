# LIFE

A personal lifetime analytics platform — track daily data across every domain of your life and surface patterns over time.

## What it tracks

| Domain | What's captured |
|---|---|
| **Mood** | Daily mood, energy, and stress scores via emoji check-in |
| **Habits** | Streaks, frequency goals, daily completion |
| **Goals** | Linear-style ticketing — projects, issues, priority, status pipeline |
| **Fitness** | Workout sessions, exercises, sets/reps/weight *(coming soon)* |
| **Finance** | Spending, accounts, CSV import *(coming soon)* |
| **Memories** | Trips, places, photos with metadata *(coming soon)* |

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| ORM | Drizzle ORM |
| Database | SQLite (local dev) → Neon Postgres (production) |
| Deployment | Vercel |

## Getting started

```bash
npm install

# Create and migrate the local database
npm run db:generate
npm run db:migrate

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
app/
├── page.tsx               # Live dashboard
├── mood/                  # Daily emoji check-in
├── habits/                # Habit tracker with streaks
├── goals/                 # Projects list
│   └── [id]/              # Issue board (Linear-style)
├── fitness/               # Workout logger
├── finance/               # Spending tracker
├── memories/              # Trips & photos
└── api/                   # REST API routes

lib/
├── db/
│   ├── schema.ts          # Source of truth — all Drizzle table definitions
│   ├── index.ts           # DB adapter (swap SQLite → Postgres here)
│   └── migrations/        # Auto-generated migration files
└── types/
    └── goals.ts           # Types + config maps for the goals system

data/
└── exercises.ts           # 130+ exercises with muscle group tags
```

## Database schema overview

- `daily_entries` — one mood/energy/stress record per day (date-unique, upsert on re-submit)
- `habits` + `habit_logs` — habit definitions with frequency, daily completion logs
- `projects` + `issues` — goal tracking: projects contain issues with status pipeline (`backlog → todo → in_progress → in_review → done`)
- `workout_sessions` + `workout_sets` + `exercises` — fitness logging
- `accounts` + `transactions` — finance tracking

## Deploying to Vercel

1. Push this repo to GitHub
2. Import into [vercel.com](https://vercel.com)
3. Go to **Storage → Create → Postgres** in the Vercel dashboard (free Neon instance)
4. Connect it to the project — `DATABASE_URL` is set automatically
5. Swap the Drizzle adapter in `lib/db/index.ts` from SQLite to Postgres
6. Run `npm run db:migrate` via Vercel CLI or the deploy hook

## Branch strategy

| Branch | Purpose |
|---|---|
| `main` | Stable, deployable |
| `feat/*` | Feature branches — one feature per branch, PR into main |
| `fix/*` | Bug fixes |
