-- Prevent Hermes (or any external process) from auto-approving submissions.
--
-- Key distinction: when our admin UI approves a submission it always sets
-- published_event_id at the same time. Hermes never sets published_event_id.
-- So we only block the transition when published_event_id is NOT being set —
-- that's the Hermes case. Admin approvals (which always include
-- published_event_id) pass through untouched.

create or replace function public.prevent_auto_approve_enriched()
returns trigger language plpgsql as $$
begin
  if OLD.status = 'pending_scrape'
     and NEW.status = 'approved'
     and NEW.published_event_id is null
  then
    NEW.status := 'pending';
  end if;
  return NEW;
end;
$$;

drop trigger if exists prevent_auto_approve_enriched_trigger on public.submissions;
create trigger prevent_auto_approve_enriched_trigger
  before update on public.submissions
  for each row execute function public.prevent_auto_approve_enriched();
