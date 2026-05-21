-- ============================================================
-- Backfill user_id on existing submissions
-- Joins auth.users on submitter_email = email to link rows
-- submitted before the user_id column was populated.
--
-- Idempotent: only touches rows where user_id IS NULL.
-- Safe to run multiple times.
--
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

update public.submissions s
set    user_id = u.id
from   auth.users u
where  s.user_id is null
  and  s.submitter_email is not null
  and  lower(s.submitter_email) = lower(u.email);
