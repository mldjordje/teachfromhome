begin;

insert into public.admin_users (user_id, role)
select u.id, 'owner'::public.app_role
from auth.users u
where lower(u.email) = lower('milos93tutor@gmail.com')
on conflict (user_id) do update
set role = excluded.role;

insert into public.admin_users (user_id, role)
select u.id, 'admin'::public.app_role
from auth.users u
where lower(u.email) = lower('web.wise018@gmail.com')
on conflict (user_id) do update
set role = excluded.role;

commit;
