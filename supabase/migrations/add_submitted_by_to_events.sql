-- Add submitted_by column to events and backfill from linked submissions
-- Safe to re-run (idempotent).

alter table public.events
  add column if not exists submitted_by text;

-- Backfill: copy submitter_name from the linked submission for events
-- that were published from a submission (via published_event_id).
update public.events e
set    submitted_by = s.submitter_name
from   public.submissions s
where  s.published_event_id = e.id
  and  s.submitter_name is not null
  and  s.submitter_name <> ''
  and  e.submitted_by is null;
