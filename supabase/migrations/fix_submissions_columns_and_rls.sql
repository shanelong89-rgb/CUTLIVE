-- ============================================================
-- Migration: add instagram columns + fix status constraint
--            + create missing tables (user_read_items, push_tokens)
-- Safe to run against a live DB — uses IF NOT EXISTS / IF EXISTS guards.
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- 1. Add missing columns to submissions (no-ops if already present)
alter table public.submissions
  add column if not exists instagram_url   text,
  add column if not exists source_id       text,
  add column if not exists submission_type text;

-- 2. Fix the status check constraint to include 'pending_scrape'
--    (drop the old one by name then recreate)
alter table public.submissions
  drop constraint if exists submissions_status_check;

alter table public.submissions
  add constraint submissions_status_check
  check (status in ('pending', 'pending_scrape', 'approved', 'rejected'));

-- 3. Add check constraint on submission_type (drop first for idempotency)
alter table public.submissions
  drop constraint if exists submissions_submission_type_check;

alter table public.submissions
  add constraint submissions_submission_type_check
  check (submission_type in ('manual', 'instagram'));

-- 4. Create user_read_items table if missing
create table if not exists public.user_read_items (
  user_id  uuid not null references auth.users(id) on delete cascade,
  item_key text not null,
  read_at  timestamptz not null default now(),
  primary key (user_id, item_key)
);
alter table public.user_read_items enable row level security;
drop policy if exists "read_items_self" on public.user_read_items;
create policy "read_items_self"
  on public.user_read_items for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 5. Create push_tokens table if missing
create table if not exists public.push_tokens (
  email      text primary key,
  token      text not null,
  updated_at timestamptz not null default now()
);
alter table public.push_tokens enable row level security;
drop policy if exists "push_tokens_self_upsert" on public.push_tokens;
create policy "push_tokens_self_upsert"
  on public.push_tokens for all
  using  (email = auth.email())
  with check (email = auth.email());
drop policy if exists "push_tokens_admin_read" on public.push_tokens;
create policy "push_tokens_admin_read"
  on public.push_tokens for select
  using (public.is_admin());

-- 6. Re-assert submissions RLS policies (in case they were never created)
alter table public.submissions enable row level security;

drop policy if exists "submissions_anyone_insert" on public.submissions;
create policy "submissions_anyone_insert"
  on public.submissions for insert
  with check (true);

drop policy if exists "submissions_admin_read" on public.submissions;
create policy "submissions_admin_read"
  on public.submissions for select
  using (public.is_admin());

drop policy if exists "submissions_owner_read" on public.submissions;
create policy "submissions_owner_read"
  on public.submissions for select
  using (
    auth.uid() = user_id
    or submitter_email = auth.email()
    or public.is_admin()
  );

drop policy if exists "submissions_admin_update" on public.submissions;
create policy "submissions_admin_update"
  on public.submissions for update
  using (public.is_admin());

drop policy if exists "submissions_admin_delete" on public.submissions;
create policy "submissions_admin_delete"
  on public.submissions for delete
  using (public.is_admin());

-- 7. Re-create the stamp_submission_user_id trigger (idempotent)
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
