-- ============================================================
-- CULTIVE Phase 2 schema: events + submissions + admin profiles
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotent: safe to re-run.
-- ============================================================

-- ── RESET (drops any legacy tables with incompatible types) ─
-- The profiles table is preserved so existing auth users keep
-- their admin flag. Events + submissions are recreated fresh.
drop table if exists public.submissions cascade;
drop table if exists public.events      cascade;

-- ── EVENTS ──────────────────────────────────────────────────
create table if not exists public.events (
  id            text primary key,
  title         text not null,
  date          text not null,
  time          text,
  venue         text,
  image         text,
  category      text,
  price         text,
  description   text,
  is_exclusive  boolean default false,
  district      text,
  tags          text[],
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index if not exists events_date_idx     on public.events (date);
create index if not exists events_category_idx on public.events (category);

-- ── SUBMISSIONS ─────────────────────────────────────────────
create table if not exists public.submissions (
  id                  text primary key,
  title               text not null,
  date                text,
  time                text,
  venue               text,
  category            text,
  price               text,
  description         text,
  image               text,
  is_exclusive        boolean default false,
  district            text,
  submitter_name      text,
  submitter_email     text,
  user_id             uuid references auth.users(id) on delete set null,
  status              text not null default 'pending'
                      check (status in ('pending', 'approved', 'rejected')),
  created_at          timestamptz default now(),
  reviewed_at         timestamptz,
  published_event_id  text references public.events(id) on delete set null,
  tags                text[]
);

create index if not exists submissions_status_idx  on public.submissions (status, created_at desc);
create index if not exists submissions_user_id_idx on public.submissions (user_id);

-- ── PROFILES (1:1 with auth.users, holds is_admin flag) ─────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  is_admin    boolean default false,
  created_at  timestamptz default now()
);

-- Auto-create a profile row whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── ADMIN HELPER ────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ── SAVED EVENTS (per user "favorites" that sync across devices) ─
create table if not exists public.saved_events (
  user_id     uuid not null references auth.users(id) on delete cascade,
  event_id    text not null references public.events(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, event_id)
);

create index if not exists saved_events_user_idx on public.saved_events (user_id, created_at desc);

-- ── ROW LEVEL SECURITY ──────────────────────────────────────
alter table public.events       enable row level security;
alter table public.submissions  enable row level security;
alter table public.profiles     enable row level security;
alter table public.saved_events enable row level security;

-- saved_events: a user can only read/insert/delete their own rows
drop policy if exists "saved_events_read_own"   on public.saved_events;
drop policy if exists "saved_events_insert_own" on public.saved_events;
drop policy if exists "saved_events_delete_own" on public.saved_events;
create policy "saved_events_read_own"
  on public.saved_events for select
  using (auth.uid() = user_id);
create policy "saved_events_insert_own"
  on public.saved_events for insert
  with check (auth.uid() = user_id);
create policy "saved_events_delete_own"
  on public.saved_events for delete
  using (auth.uid() = user_id);

-- events: anyone can read; only admins can write
drop policy if exists "events_read_all"     on public.events;
drop policy if exists "events_admin_write"  on public.events;
create policy "events_read_all"
  on public.events for select
  using (true);
create policy "events_admin_write"
  on public.events for all
  using (public.is_admin())
  with check (public.is_admin());

-- submissions: anyone (incl. anon) can insert; only admins can read/update/delete
drop policy if exists "submissions_anyone_insert" on public.submissions;
drop policy if exists "submissions_admin_read"    on public.submissions;
drop policy if exists "submissions_admin_update"  on public.submissions;
drop policy if exists "submissions_admin_delete"  on public.submissions;
create policy "submissions_anyone_insert"
  on public.submissions for insert
  with check (true);
create policy "submissions_admin_read"
  on public.submissions for select
  using (public.is_admin());
create policy "submissions_admin_update"
  on public.submissions for update
  using (public.is_admin());
create policy "submissions_admin_delete"
  on public.submissions for delete
  using (public.is_admin());

-- profiles: a user can read their own row; admins can read/update all
drop policy if exists "profiles_self_or_admin_read" on public.profiles;
drop policy if exists "profiles_admin_update"       on public.profiles;
create policy "profiles_self_or_admin_read"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());
create policy "profiles_admin_update"
  on public.profiles for update
  using (public.is_admin());

-- ── USER READ ITEMS (inbox read state, cross-device sync) ───
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

-- ── AUTO-STAMP user_id ON SUBMISSION INSERT ──────────────────
-- Ensures user_id is always set to auth.uid() when a signed-in user inserts
-- a submission, even if the client omits it. Guest inserts leave it NULL.
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

-- ── USER SUBMISSIONS READ ACCESS ────────────────────────────
-- Allow signed-in users to read their own submissions (needed for inbox).
drop policy if exists "submissions_owner_read" on public.submissions;
create policy "submissions_owner_read"
  on public.submissions for select
  using (
    auth.uid() = user_id
    or submitter_email = (select email from auth.users where id = auth.uid())
    or public.is_admin()
  );

-- ── PUSH TOKENS ─────────────────────────────────────────────
-- Stores Expo push tokens for mobile users, keyed by email.
-- The mobile app upserts the token on sign-in; the admin web app
-- reads it when approving or rejecting a submission.
create table if not exists public.push_tokens (
  email       text primary key,
  token       text not null,
  updated_at  timestamptz not null default now()
);

alter table public.push_tokens enable row level security;

-- A user can upsert their own row (matched by their auth email)
drop policy if exists "push_tokens_self_upsert" on public.push_tokens;
create policy "push_tokens_self_upsert"
  on public.push_tokens for all
  using (email = (select email from auth.users where id = auth.uid()))
  with check (email = (select email from auth.users where id = auth.uid()));

-- Admins can read all tokens (needed to look up a submitter's token)
drop policy if exists "push_tokens_admin_read" on public.push_tokens;
create policy "push_tokens_admin_read"
  on public.push_tokens for select
  using (public.is_admin());

-- ── HOW TO MAKE YOURSELF ADMIN ──────────────────────────────
-- After signing up via the app's auth modal once, run:
--   update public.profiles set is_admin = true where email = 'YOU@EXAMPLE.COM';

-- ── STORAGE BUCKET SETUP ─────────────────────────────────────
-- The mobile app uploads event photos to a Supabase Storage bucket called
-- `submission-images`. This bucket must be created manually (once) before
-- image upload will work.
--
-- Option A — Dashboard UI (easiest):
--   1. Open your Supabase project → Storage → New bucket
--   2. Name: submission-images
--   3. Toggle "Public bucket" ON (so uploaded image URLs are publicly readable)
--   4. Save
--
-- Option B — Script (idempotent, safe to re-run):
--   SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> \
--     pnpm --filter @workspace/scripts run setup-storage
--
-- Required bucket settings:
--   public:            true   (image URLs must be readable without auth)
--   allowed MIME types: image/jpeg, image/jpg, image/png, image/webp, image/heic
--   max file size:     10 MB
