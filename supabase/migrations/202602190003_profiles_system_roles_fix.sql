begin;

drop policy if exists "profiles_system_select" on public.profiles;
create policy "profiles_system_select"
on public.profiles
for select
to postgres, supabase_admin, supabase_auth_admin, service_role
using (true);

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

commit;
