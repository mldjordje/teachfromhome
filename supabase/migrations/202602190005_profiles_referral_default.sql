begin;

alter table public.profiles
  alter column referral_code set default public.generate_referral_code();

commit;
