-- Prevent enrichment from auto-approving submissions.
-- When Hermes (or any process) sets status = 'approved' on a row that was
-- previously 'pending_scrape', redirect it to 'pending' instead so that an
-- admin must review and approve manually.

create or replace function public.prevent_auto_approve_enriched()
returns trigger language plpgsql as $$
begin
  if OLD.status = 'pending_scrape' and NEW.status = 'approved' then
    NEW.status := 'pending';
  end if;
  return NEW;
end;
$$;

drop trigger if exists prevent_auto_approve_enriched_trigger on public.submissions;
create trigger prevent_auto_approve_enriched_trigger
  before update on public.submissions
  for each row execute function public.prevent_auto_approve_enriched();
