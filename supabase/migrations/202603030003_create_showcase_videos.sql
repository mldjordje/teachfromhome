create table if not exists public.showcase_videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  youtube_url text not null,
  youtube_video_id text not null,
  thumbnail_url text,
  order_index integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create index if not exists idx_showcase_videos_active_order
  on public.showcase_videos (is_active, order_index, created_at desc);

drop trigger if exists trg_showcase_videos_updated_at on public.showcase_videos;
create trigger trg_showcase_videos_updated_at
before update on public.showcase_videos
for each row
execute function public.set_updated_at();

alter table public.showcase_videos enable row level security;
alter table public.showcase_videos force row level security;

grant select on public.showcase_videos to anon, authenticated;
grant insert, update, delete on public.showcase_videos to authenticated;

drop policy if exists "showcase_videos_public_read_active" on public.showcase_videos;
create policy "showcase_videos_public_read_active"
on public.showcase_videos
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "showcase_videos_admin_all" on public.showcase_videos;
create policy "showcase_videos_admin_all"
on public.showcase_videos
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));
