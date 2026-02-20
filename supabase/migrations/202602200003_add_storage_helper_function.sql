begin;

create or replace function public.list_old_storage_objects(
  _bucket text,
  _before timestamptz,
  _limit integer default 300
)
returns table (bucket_id text, name text)
language sql
security definer
set search_path = public, storage
as $$
  select o.bucket_id::text, o.name::text
  from storage.objects o
  where o.bucket_id = _bucket
    and o.created_at < _before
  order by o.created_at asc
  limit greatest(1, least(coalesce(_limit, 300), 2000));
$$;

grant execute on function public.list_old_storage_objects(text, timestamptz, integer)
to service_role;

commit;
