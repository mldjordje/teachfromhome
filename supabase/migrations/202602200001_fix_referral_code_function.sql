begin;

create or replace function public.generate_referral_code()
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  candidate text;
begin
  loop
    candidate := upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 10));
    exit when not exists (
      select 1
      from public.profiles p
      where p.referral_code = candidate
    );
  end loop;

  return candidate;
end;
$$;

commit;
