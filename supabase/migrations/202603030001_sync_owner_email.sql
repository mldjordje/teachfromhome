begin;

-- Optional DB setting for owner email:
-- alter database postgres set app.settings.owner_email = 'you@example.com';

do $$
declare
  configured_owner_email text := nullif(current_setting('app.settings.owner_email', true), '');
  fallback_owner_email text := 'milos93tutor@gmail.com';
  target_email text := coalesce(configured_owner_email, fallback_owner_email);
begin
  insert into public.admin_users (user_id, role)
  select u.id, 'owner'::public.app_role
  from auth.users u
  where lower(u.email) = lower(target_email)
  on conflict (user_id) do update
    set role = excluded.role;
end $$;

commit;
