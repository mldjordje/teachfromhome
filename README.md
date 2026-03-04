# TeachFromHome (Vercel Stack)

This project now uses:
- Next.js App Router
- Auth.js (Google OAuth)
- Drizzle ORM + Vercel Postgres
- Vercel Blob for video storage
- Resend for email notifications

## Environment
Copy `.env.local.example` to `.env.local` and fill values.

## Scripts
- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run db:generate`
- `npm run db:push`

## Core API Endpoints
- `POST /api/teacher/phase1/submit`
- `POST /api/teacher/phase2/submit`
- `POST /api/admin/phase1/move`
- `POST /api/admin/phase1/reject`
- `POST /api/admin/phase2/review`
- `POST /api/admin/storage/cleanup`
- `POST /api/referrals/apply`
- `POST /api/referrals/mark-eligible`
- `POST /api/referrals/approve`
- `POST /api/analytics/event`
- `POST /api/blob/upload-token`
- `GET /api/cron/storage-cleanup`

## Cron
Call `GET /api/cron/storage-cleanup` with header:
- `x-cron-secret: <CRON_SECRET>`
or
- `Authorization: Bearer <CRON_SECRET>`
