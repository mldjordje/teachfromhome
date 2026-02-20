# Supabase Backend Starter (TeachFromHome)

This folder contains a complete backend starter for:
- PostgreSQL schema + enums + indexes + triggers
- RLS policies for all business tables
- Storage buckets + storage policies
- Edge Functions for teacher/admin workflows

## 1) Files Included

- Migration:
  - `migrations/*.sql`
- Shared edge helpers:
  - `functions/_shared/http.ts`
  - `functions/_shared/supabase.ts`
  - `functions/_shared/validators.ts`
  - `functions/_shared/email.ts`
  - `functions/_shared/notifications.ts`
- Edge Functions:
  - `functions/admin_move_to_phase2/index.ts`
  - `functions/admin_reject_phase1/index.ts`
  - `functions/admin_review_phase2/index.ts`
  - `functions/admin_cleanup_storage/index.ts`
  - `functions/teacher_submit_phase1/index.ts`
  - `functions/teacher_create_phase2_submission/index.ts`
  - `functions/teacher_apply_referral_code/index.ts`
  - `functions/create_analytics_event/index.ts`
  - `functions/admin_mark_referral_eligible/index.ts`
  - `functions/admin_approve_referral_reward/index.ts`

## 2) Prerequisites

- Supabase CLI installed
- Supabase project created
- Logged in to Supabase CLI

## 3) Init / Link / Apply Migration

From project root:

```bash
npx supabase init
npx supabase login
npx supabase link --project-ref <YOUR_PROJECT_REF>
npx supabase db push
```

If CLI says `Access token not provided`, run:

```bash
npx supabase login
```

or set env:

```bash
set SUPABASE_ACCESS_TOKEN=YOUR_PERSONAL_ACCESS_TOKEN
```

If you need to run locally first:

```bash
npx supabase start
npx supabase db reset
```

## 4) Edge Function Secrets

Set required secrets before deploy:

```bash
npx supabase secrets set SUPABASE_URL=https://<YOUR_PROJECT_REF>.supabase.co
npx supabase secrets set SUPABASE_ANON_KEY=<YOUR_ANON_KEY>
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<YOUR_SERVICE_ROLE_KEY>
npx supabase secrets set RESEND_API_KEY=<YOUR_RESEND_API_KEY>
npx supabase secrets set FROM_EMAIL="TeachFromHome <noreply@your-domain.com>"
npx supabase secrets set PHASE1_MAX_VIDEO_MB=25
npx supabase secrets set PHASE2_MAX_VIDEO_MB=35
npx supabase secrets set PHASE1_REJECTED_RETENTION_DAYS=14
npx supabase secrets set PHASE2_CLOSED_RETENTION_DAYS=30
npx supabase secrets set ORPHAN_RETENTION_HOURS=24
```

Notes:
- Email sending is optional at runtime. If `RESEND_API_KEY` or `FROM_EMAIL` is missing, functions continue and email is skipped.
- Service role key is used only inside Edge Functions.

## 5) Deploy Edge Functions

```bash
npx supabase functions deploy teacher_submit_phase1 --no-verify-jwt
npx supabase functions deploy teacher_create_phase2_submission --no-verify-jwt
npx supabase functions deploy teacher_apply_referral_code --no-verify-jwt
npx supabase functions deploy admin_move_to_phase2 --no-verify-jwt
npx supabase functions deploy admin_reject_phase1 --no-verify-jwt
npx supabase functions deploy admin_review_phase2 --no-verify-jwt
npx supabase functions deploy create_analytics_event --no-verify-jwt
npx supabase functions deploy admin_cleanup_storage --no-verify-jwt
npx supabase functions deploy admin_mark_referral_eligible --no-verify-jwt
npx supabase functions deploy admin_approve_referral_reward --no-verify-jwt
```

## 6) Storage Buckets & Access

Buckets are created in migration SQL:
- `phase1-videos` (private)
- `phase2-videos` (private)
- `training-videos` (private bucket + authenticated read policy)

Current hard limits:
- `phase1-videos`: 25MB per file
- `phase2-videos`: 35MB per file

Policy summary:
- Teachers can upload/read their own files in `phase1-videos` and `phase2-videos` under `/{user_id}/...`
- Admins can read/write all files
- Training videos are readable by authenticated users; write/delete is admin-only

## 7) Initial Admin

Migration attempts to seed owner role for:
- `milos93tutor@gmail.com`

If this user did not exist at migration time, run after signup:

```sql
insert into public.admin_users (user_id, role)
select id, 'owner'::public.app_role
from auth.users
where lower(email) = lower('milos93tutor@gmail.com')
on conflict (user_id) do nothing;
```

## 8) Test With curl

Set:
- `PROJECT_URL=https://<YOUR_PROJECT_REF>.supabase.co`
- `ANON_KEY=<YOUR_ANON_KEY>`
- `TEACHER_JWT=<teacher access token>`
- `ADMIN_JWT=<admin access token>`

### 8.1 teacher_submit_phase1

```bash
curl -X POST "$PROJECT_URL/functions/v1/teacher_submit_phase1" \
  -H "Authorization: Bearer $TEACHER_JWT" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name":"Ana",
    "last_name":"Petrovic",
    "date_of_birth":"1997-04-21",
    "phone":"+381641234567",
    "email":"ana@example.com",
    "short_about":"TEFL student",
    "video_path":"phase1-videos/<teacher_user_id>/phase1-attempt1.mp4",
    "script_text":"Hello, my name is Ana..."
  }'
```

### 8.2 teacher_create_phase2_submission

```bash
curl -X POST "$PROJECT_URL/functions/v1/teacher_create_phase2_submission" \
  -H "Authorization: Bearer $TEACHER_JWT" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "task_id":"<phase2_task_uuid>",
    "video_path":"phase2-videos/<teacher_user_id>/phase2-attempt1.mp4"
  }'
```

### 8.3 teacher_apply_referral_code

```bash
curl -X POST "$PROJECT_URL/functions/v1/teacher_apply_referral_code" \
  -H "Authorization: Bearer $TEACHER_JWT" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "referral_code":"ABC123DEF4"
  }'
```

### 8.4 admin_move_to_phase2

```bash
curl -X POST "$PROJECT_URL/functions/v1/admin_move_to_phase2" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id":"<teacher_user_uuid>",
    "submission_id":"<phase1_submission_uuid>",
    "phase2_sentence":"The quick brown fox jumps over the lazy dog."
  }'
```

### 8.5 admin_reject_phase1

```bash
curl -X POST "$PROJECT_URL/functions/v1/admin_reject_phase1" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id":"<teacher_user_uuid>",
    "submission_id":"<phase1_submission_uuid>",
    "reason":"bad_pronunciation",
    "notes":"Please improve pacing and consonant clarity"
  }'
```

### 8.6 admin_review_phase2 (retry/reject/accept)

```bash
curl -X POST "$PROJECT_URL/functions/v1/admin_review_phase2" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action":"retry",
    "task_id":"<phase2_task_uuid>",
    "submission_id":"<phase2_submission_uuid>",
    "feedback":"Speak slower and emphasize final consonants"
  }'
```

```bash
curl -X POST "$PROJECT_URL/functions/v1/admin_review_phase2" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action":"accept",
    "task_id":"<phase2_task_uuid>",
    "submission_id":"<phase2_submission_uuid>"
  }'
```

### 8.7 create_analytics_event

```bash
curl -X POST "$PROJECT_URL/functions/v1/create_analytics_event" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "event_name":"visits",
    "session_id":"web-session-123",
    "metadata":{"source":"landing"}
  }'
```

### 8.8 admin_mark_referral_eligible

```bash
curl -X POST "$PROJECT_URL/functions/v1/admin_mark_referral_eligible" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "referred_user_id":"<teacher_user_uuid>",
    "eligible_at":"2026-03-20T10:00:00Z"
  }'
```

### 8.9 admin_approve_referral_reward

```bash
curl -X POST "$PROJECT_URL/functions/v1/admin_approve_referral_reward" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "reward_id":"<reward_uuid>"
  }'
```

### 8.10 admin_cleanup_storage

```bash
curl -X POST "$PROJECT_URL/functions/v1/admin_cleanup_storage" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## 9) Security Notes

- RLS is enabled and forced on all business tables.
- Teachers can only read/write their own records where allowed.
- Admin checks are enforced in Edge Functions via `is_admin` SQL function.
- Review transitions (`reviewed_by`, `reviewed_at`, status transitions) are performed from Edge Functions using service role.
- Client-side direct updates to review data are blocked by RLS policy design.

## 10) Frontend Env (Next.js)

Create `.env.local` in project root (you can copy `.env.local.example`):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<YOUR_PROJECT_REF>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<YOUR_ANON_KEY>
# optional alias used in some dashboards:
# NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=<YOUR_PUBLISHABLE_KEY>
```

Both `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` are supported by this starter.

## 11) Suggested Next Step

After backend deploy, implement frontend API wrappers that call these Edge Functions and upload videos to bucket paths:
- `phase1-videos/{user_id}/...`
- `phase2-videos/{user_id}/...`
- `training-videos/{category}/...` (admin)
