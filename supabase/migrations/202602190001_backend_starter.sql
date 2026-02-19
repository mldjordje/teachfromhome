begin;

create extension if not exists pgcrypto;

-- =====================================================
-- Enums
-- =====================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('owner', 'admin');
  end if;

  if not exists (select 1 from pg_type where typname = 'phase1_status') then
    create type public.phase1_status as enum ('pending', 'rejected', 'moved_to_phase2');
  end if;

  if not exists (select 1 from pg_type where typname = 'phase1_reject_reason') then
    create type public.phase1_reject_reason as enum ('bad_accent', 'bad_pronunciation', 'low_energy');
  end if;

  if not exists (select 1 from pg_type where typname = 'phase2_task_status') then
    create type public.phase2_task_status as enum ('assigned', 'submitted', 'accepted', 'retry', 'rejected');
  end if;

  if not exists (select 1 from pg_type where typname = 'phase2_submission_status') then
    create type public.phase2_submission_status as enum ('submitted', 'accepted', 'retry', 'rejected');
  end if;

  if not exists (select 1 from pg_type where typname = 'notification_type') then
    create type public.notification_type as enum ('info', 'phase1', 'phase2', 'system', 'referral');
  end if;

  if not exists (select 1 from pg_type where typname = 'training_video_category') then
    create type public.training_video_category as enum ('about_us', 'bright_sample', 'tips');
  end if;

  if not exists (select 1 from pg_type where typname = 'referral_reward_status') then
    create type public.referral_reward_status as enum ('pending', 'approved', 'paid');
  end if;
end $$;

-- =====================================================
-- Helpers
-- =====================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.generate_referral_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text;
begin
  loop
    candidate := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 10));
    exit when not exists (
      select 1
      from public.profiles p
      where p.referral_code = candidate
    );
  end loop;

  return candidate;
end;
$$;

-- =====================================================
-- Core Tables
-- =====================================================
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  first_name text,
  last_name text,
  phone text,
  date_of_birth date,
  age integer,
  short_about varchar(50),
  referral_code text not null unique default public.generate_referral_code(),
  referred_by_code text,
  current_phase text not null default 'phase1' check (current_phase in ('phase1', 'phase2', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint profiles_phone_length_chk check (
    phone is null
    or char_length(regexp_replace(phone, '\\D', '', 'g')) between 7 and 15
  )
);

create index if not exists idx_profiles_current_phase on public.profiles(current_phase);
create index if not exists idx_profiles_created_at on public.profiles(created_at desc);

create or replace function public.sync_profile_age_from_dob()
returns trigger
language plpgsql
as $$
begin
  if new.date_of_birth is null then
    new.age = null;
  else
    new.age = date_part('year', age(current_date, new.date_of_birth))::int;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_sync_age_from_dob on public.profiles;
create trigger trg_profiles_sync_age_from_dob
before insert or update of date_of_birth on public.profiles
for each row
execute function public.sync_profile_age_from_dob();

create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, referral_code)
  values (new.id, new.email, public.generate_referral_code())
  on conflict (user_id) do update
    set email = excluded.email,
        updated_at = now();

  return new;
end;
$$;

create or replace function public.sync_profile_email_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set email = new.email,
      updated_at = now()
  where user_id = new.id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
after update of email on auth.users
for each row
execute function public.sync_profile_email_from_auth();

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'admin',
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_users_role on public.admin_users(role);

create or replace function public.is_admin(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.user_id = _user_id
  );
$$;

grant execute on function public.is_admin(uuid) to anon, authenticated;

-- seed owner/admin if user already exists
insert into public.admin_users (user_id, role)
select u.id, 'owner'::public.app_role
from auth.users u
where lower(u.email) = lower('milos93tutor@gmail.com')
on conflict (user_id) do nothing;

create table if not exists public.teacher_phase1_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  attempt_no smallint not null check (attempt_no between 1 and 3),
  video_path text not null,
  script_text text not null default 'Please introduce yourself in 4-5 sentences.',
  status public.phase1_status not null default 'pending',
  reject_reason public.phase1_reject_reason,
  admin_notes text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  is_deleted boolean not null default false,
  unique (user_id, attempt_no),
  constraint phase1_reject_reason_required_chk check (
    (status = 'rejected' and reject_reason is not null)
    or status <> 'rejected'
  )
);

create index if not exists idx_phase1_user_created on public.teacher_phase1_submissions(user_id, created_at desc);
create index if not exists idx_phase1_status_created on public.teacher_phase1_submissions(status, created_at desc);

create table if not exists public.teacher_phase2_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(user_id) on delete cascade,
  phase2_sentence text not null,
  status public.phase2_task_status not null default 'assigned',
  attempts_allowed smallint not null default 3 check (attempts_allowed between 1 and 3),
  current_attempts smallint not null default 0 check (current_attempts >= 0),
  last_feedback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  created_by uuid references auth.users(id),
  constraint phase2_attempts_bounds_chk check (current_attempts <= attempts_allowed)
);

create index if not exists idx_phase2_tasks_status on public.teacher_phase2_tasks(status, updated_at desc);

create trigger trg_phase2_tasks_updated_at
before update on public.teacher_phase2_tasks
for each row
execute function public.set_updated_at();

create table if not exists public.teacher_phase2_submissions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.teacher_phase2_tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  attempt_no smallint not null check (attempt_no between 1 and 3),
  video_path text not null,
  status public.phase2_submission_status not null default 'submitted',
  feedback text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  is_deleted boolean not null default false,
  unique (task_id, attempt_no)
);

create index if not exists idx_phase2_submissions_task_created on public.teacher_phase2_submissions(task_id, created_at desc);
create index if not exists idx_phase2_submissions_user_created on public.teacher_phase2_submissions(user_id, created_at desc);

create table if not exists public.training_videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category public.training_video_category not null,
  order_index integer not null default 0,
  storage_path text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create index if not exists idx_training_videos_active_order on public.training_videos(is_active, category, order_index);

create trigger trg_training_videos_updated_at
before update on public.training_videos
for each row
execute function public.set_updated_at();

create table if not exists public.teacher_training_video_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  training_video_id uuid not null references public.training_videos(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  unique (user_id, training_video_id)
);

create index if not exists idx_training_video_views_user on public.teacher_training_video_views(user_id, viewed_at desc);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  type public.notification_type not null default 'info',
  title text not null,
  body text not null,
  payload jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists idx_notifications_user_unread on public.notifications(user_id, is_read, created_at desc);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  event_name text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_analytics_event_name_created on public.analytics_events(event_name, created_at desc);
create index if not exists idx_analytics_session_created on public.analytics_events(session_id, created_at desc);

create table if not exists public.referral_links (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(user_id) on delete cascade,
  referred_id uuid not null unique references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint referral_links_not_self_chk check (referrer_id <> referred_id),
  unique (referrer_id, referred_id)
);

create index if not exists idx_referral_links_referrer on public.referral_links(referrer_id);

create table if not exists public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(user_id) on delete cascade,
  referred_id uuid not null unique references public.profiles(user_id) on delete cascade,
  amount_eur numeric(10,2) not null default 20.00,
  status public.referral_reward_status not null default 'pending',
  eligible_at timestamptz,
  approved_at timestamptz,
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  constraint referral_rewards_amount_chk check (amount_eur > 0)
);

create index if not exists idx_referral_rewards_status on public.referral_rewards(status, eligible_at);

create trigger trg_referral_rewards_updated_at
before update on public.referral_rewards
for each row
execute function public.set_updated_at();

-- =====================================================
-- Admin Queue Views
-- =====================================================
create or replace view public.admin_phase1_queue as
select
  s.id as submission_id,
  s.user_id,
  p.first_name,
  p.last_name,
  p.email,
  p.phone,
  s.attempt_no,
  s.video_path,
  s.script_text,
  s.status,
  s.reject_reason,
  s.admin_notes,
  s.created_at,
  s.reviewed_at,
  s.reviewed_by
from public.teacher_phase1_submissions s
join public.profiles p on p.user_id = s.user_id
where s.is_deleted = false;

create or replace view public.admin_phase2_queue as
select
  t.id as task_id,
  t.user_id,
  p.first_name,
  p.last_name,
  p.email,
  t.phase2_sentence,
  t.status as task_status,
  t.attempts_allowed,
  t.current_attempts,
  t.last_feedback,
  t.created_at as task_created_at,
  t.updated_at as task_updated_at,
  s.id as latest_submission_id,
  s.attempt_no as latest_attempt_no,
  s.video_path as latest_video_path,
  s.status as latest_submission_status,
  s.feedback as latest_submission_feedback,
  s.created_at as latest_submission_created_at,
  s.reviewed_at as latest_submission_reviewed_at
from public.teacher_phase2_tasks t
join public.profiles p on p.user_id = t.user_id
left join lateral (
  select ps.*
  from public.teacher_phase2_submissions ps
  where ps.task_id = t.id
    and ps.is_deleted = false
  order by ps.attempt_no desc
  limit 1
) s on true;

grant select on public.admin_phase1_queue to authenticated;
grant select on public.admin_phase2_queue to authenticated;

-- =====================================================
-- RLS
-- =====================================================
alter table public.profiles enable row level security;
alter table public.admin_users enable row level security;
alter table public.teacher_phase1_submissions enable row level security;
alter table public.teacher_phase2_tasks enable row level security;
alter table public.teacher_phase2_submissions enable row level security;
alter table public.training_videos enable row level security;
alter table public.teacher_training_video_views enable row level security;
alter table public.notifications enable row level security;
alter table public.analytics_events enable row level security;
alter table public.referral_links enable row level security;
alter table public.referral_rewards enable row level security;

alter table public.profiles force row level security;
alter table public.admin_users force row level security;
alter table public.teacher_phase1_submissions force row level security;
alter table public.teacher_phase2_tasks force row level security;
alter table public.teacher_phase2_submissions force row level security;
alter table public.training_videos force row level security;
alter table public.teacher_training_video_views force row level security;
alter table public.notifications force row level security;
alter table public.analytics_events force row level security;
alter table public.referral_links force row level security;
alter table public.referral_rewards force row level security;

-- profiles
 drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = user_id);

 drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = user_id);

 drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

 drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all"
on public.profiles
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "profiles_system_insert" on public.profiles;
create policy "profiles_system_insert"
on public.profiles
for insert
to postgres, supabase_admin, supabase_auth_admin, service_role
with check (true);

drop policy if exists "profiles_system_update" on public.profiles;
create policy "profiles_system_update"
on public.profiles
for update
to postgres, supabase_admin, supabase_auth_admin, service_role
using (true)
with check (true);

drop policy if exists "profiles_system_select" on public.profiles;
create policy "profiles_system_select"
on public.profiles
for select
to postgres, supabase_admin, supabase_auth_admin, service_role
using (true);

-- admin_users
 drop policy if exists "admin_users_self_select" on public.admin_users;
create policy "admin_users_self_select"
on public.admin_users
for select
to authenticated
using (auth.uid() = user_id);

 drop policy if exists "admin_users_admin_manage" on public.admin_users;
create policy "admin_users_admin_manage"
on public.admin_users
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- phase1 submissions
 drop policy if exists "phase1_select_own" on public.teacher_phase1_submissions;
create policy "phase1_select_own"
on public.teacher_phase1_submissions
for select
to authenticated
using (auth.uid() = user_id and is_deleted = false);

 drop policy if exists "phase1_insert_own_pending" on public.teacher_phase1_submissions;
create policy "phase1_insert_own_pending"
on public.teacher_phase1_submissions
for insert
to authenticated
with check (
  auth.uid() = user_id
  and status = 'pending'
  and reject_reason is null
  and reviewed_at is null
  and reviewed_by is null
);

 drop policy if exists "phase1_admin_all" on public.teacher_phase1_submissions;
create policy "phase1_admin_all"
on public.teacher_phase1_submissions
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- phase2 tasks
 drop policy if exists "phase2_tasks_select_own" on public.teacher_phase2_tasks;
create policy "phase2_tasks_select_own"
on public.teacher_phase2_tasks
for select
to authenticated
using (auth.uid() = user_id);

 drop policy if exists "phase2_tasks_admin_all" on public.teacher_phase2_tasks;
create policy "phase2_tasks_admin_all"
on public.teacher_phase2_tasks
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- phase2 submissions
 drop policy if exists "phase2_submissions_select_own" on public.teacher_phase2_submissions;
create policy "phase2_submissions_select_own"
on public.teacher_phase2_submissions
for select
to authenticated
using (auth.uid() = user_id and is_deleted = false);

 drop policy if exists "phase2_submissions_insert_own" on public.teacher_phase2_submissions;
create policy "phase2_submissions_insert_own"
on public.teacher_phase2_submissions
for insert
to authenticated
with check (
  auth.uid() = user_id
  and status = 'submitted'
  and reviewed_at is null
  and reviewed_by is null
);

 drop policy if exists "phase2_submissions_admin_all" on public.teacher_phase2_submissions;
create policy "phase2_submissions_admin_all"
on public.teacher_phase2_submissions
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- training videos
 drop policy if exists "training_videos_auth_read_active" on public.training_videos;
create policy "training_videos_auth_read_active"
on public.training_videos
for select
to authenticated
using (is_active = true);

 drop policy if exists "training_videos_admin_all" on public.training_videos;
create policy "training_videos_admin_all"
on public.training_videos
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- training video views
 drop policy if exists "training_views_select_own" on public.teacher_training_video_views;
create policy "training_views_select_own"
on public.teacher_training_video_views
for select
to authenticated
using (auth.uid() = user_id);

 drop policy if exists "training_views_insert_own" on public.teacher_training_video_views;
create policy "training_views_insert_own"
on public.teacher_training_video_views
for insert
to authenticated
with check (auth.uid() = user_id);

 drop policy if exists "training_views_admin_all" on public.teacher_training_video_views;
create policy "training_views_admin_all"
on public.teacher_training_video_views
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- notifications
 drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
on public.notifications
for select
to authenticated
using (auth.uid() = user_id);

 drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
on public.notifications
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

 drop policy if exists "notifications_admin_all" on public.notifications;
create policy "notifications_admin_all"
on public.notifications
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- analytics
 drop policy if exists "analytics_insert_public" on public.analytics_events;
create policy "analytics_insert_public"
on public.analytics_events
for insert
to anon, authenticated
with check (
  (auth.role() = 'anon' and user_id is null)
  or (auth.role() = 'authenticated' and (user_id is null or user_id = auth.uid()))
);

 drop policy if exists "analytics_admin_select" on public.analytics_events;
create policy "analytics_admin_select"
on public.analytics_events
for select
to authenticated
using (public.is_admin(auth.uid()));

-- referral links
 drop policy if exists "referral_links_select_related" on public.referral_links;
create policy "referral_links_select_related"
on public.referral_links
for select
to authenticated
using (auth.uid() = referrer_id or auth.uid() = referred_id or public.is_admin(auth.uid()));

 drop policy if exists "referral_links_insert_own" on public.referral_links;
create policy "referral_links_insert_own"
on public.referral_links
for insert
to authenticated
with check (referred_id = auth.uid() and referrer_id <> auth.uid());

 drop policy if exists "referral_links_admin_all" on public.referral_links;
create policy "referral_links_admin_all"
on public.referral_links
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- referral rewards
 drop policy if exists "referral_rewards_select_related" on public.referral_rewards;
create policy "referral_rewards_select_related"
on public.referral_rewards
for select
to authenticated
using (auth.uid() = referrer_id or auth.uid() = referred_id or public.is_admin(auth.uid()));

 drop policy if exists "referral_rewards_admin_all" on public.referral_rewards;
create policy "referral_rewards_admin_all"
on public.referral_rewards
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- =====================================================
-- Storage Buckets and Policies
-- =====================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('phase1-videos', 'phase1-videos', false, 104857600, array['video/mp4', 'video/webm', 'video/quicktime']),
  ('phase2-videos', 'phase2-videos', false, 104857600, array['video/mp4', 'video/webm', 'video/quicktime']),
  ('training-videos', 'training-videos', false, 104857600, array['video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do nothing;

-- phase1-videos teacher own folder
 drop policy if exists "phase1_teacher_insert_own" on storage.objects;
create policy "phase1_teacher_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'phase1-videos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

 drop policy if exists "phase1_teacher_select_own" on storage.objects;
create policy "phase1_teacher_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'phase1-videos'
  and (
    public.is_admin(auth.uid())
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

 drop policy if exists "phase1_teacher_update_own" on storage.objects;
create policy "phase1_teacher_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'phase1-videos'
  and (
    public.is_admin(auth.uid())
    or (storage.foldername(name))[1] = auth.uid()::text
  )
)
with check (
  bucket_id = 'phase1-videos'
  and (
    public.is_admin(auth.uid())
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

 drop policy if exists "phase1_teacher_delete_own" on storage.objects;
create policy "phase1_teacher_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'phase1-videos'
  and (
    public.is_admin(auth.uid())
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- phase2-videos teacher own folder
 drop policy if exists "phase2_teacher_insert_own" on storage.objects;
create policy "phase2_teacher_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'phase2-videos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

 drop policy if exists "phase2_teacher_select_own" on storage.objects;
create policy "phase2_teacher_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'phase2-videos'
  and (
    public.is_admin(auth.uid())
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

 drop policy if exists "phase2_teacher_update_own" on storage.objects;
create policy "phase2_teacher_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'phase2-videos'
  and (
    public.is_admin(auth.uid())
    or (storage.foldername(name))[1] = auth.uid()::text
  )
)
with check (
  bucket_id = 'phase2-videos'
  and (
    public.is_admin(auth.uid())
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

 drop policy if exists "phase2_teacher_delete_own" on storage.objects;
create policy "phase2_teacher_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'phase2-videos'
  and (
    public.is_admin(auth.uid())
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- training-videos readable by authenticated users, writable by admins only
 drop policy if exists "training_videos_auth_select" on storage.objects;
create policy "training_videos_auth_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'training-videos'
);

 drop policy if exists "training_videos_admin_insert" on storage.objects;
create policy "training_videos_admin_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'training-videos'
  and public.is_admin(auth.uid())
);

 drop policy if exists "training_videos_admin_update" on storage.objects;
create policy "training_videos_admin_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'training-videos'
  and public.is_admin(auth.uid())
)
with check (
  bucket_id = 'training-videos'
  and public.is_admin(auth.uid())
);

 drop policy if exists "training_videos_admin_delete" on storage.objects;
create policy "training_videos_admin_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'training-videos'
  and public.is_admin(auth.uid())
);

commit;
