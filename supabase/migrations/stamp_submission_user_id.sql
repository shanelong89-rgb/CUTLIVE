-- Migration: auto-stamp user_id = auth.uid() on every authenticated submission insert.
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run (idempotent).

create or replace function public.stamp_submission_user_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists stamp_submission_user_id_trigger on public.submissions;
create trigger stamp_submission_user_id_trigger
  before insert on public.submissions
  for each row execute function public.stamp_submission_user_id();
