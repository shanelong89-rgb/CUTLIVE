-- Run this in the Supabase SQL Editor.
-- Adds a SECURITY DEFINER RPC that safely verifies a WhatsApp magic-link
-- (phone + one-time token) without exposing wa_links to direct anon
-- SELECT/UPDATE. The token is stored in wa_links.metadata as
-- { magic_code, magic_expires_at } by the WhatsApp webhook after onboarding.
--
-- The function is single-use: on a successful match it immediately clears
-- magic_code/magic_expires_at from metadata so the link can't be replayed.

create or replace function public.verify_wa_magic_link(p_phone text, p_token text)
returns table(user_id uuid, success boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.wa_links%rowtype;
begin
  select * into v_row from public.wa_links where wa_id = p_phone;

  if not found then
    return query select null::uuid, false;
    return;
  end if;

  if (v_row.metadata ->> 'magic_code') is distinct from p_token
     or v_row.metadata ->> 'magic_expires_at' is null
     or (v_row.metadata ->> 'magic_expires_at')::timestamptz < now() then
    return query select null::uuid, false;
    return;
  end if;

  update public.wa_links
  set metadata = metadata - 'magic_code' - 'magic_expires_at'
  where wa_id = p_phone;

  return query select v_row.user_id, true;
end;
$$;

grant execute on function public.verify_wa_magic_link(text, text) to anon, authenticated;
