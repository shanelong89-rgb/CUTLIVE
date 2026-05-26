-- ─────────────────────────────────────────────────────────────
-- CULTIVE: Award HK$25 credit to the invitee when they join via referral
-- Run this once in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ─────────────────────────────────────────────────────────────

-- 1. Expand the credit_transactions type CHECK to include 'referral_invitee_bonus'
ALTER TABLE public.credit_transactions
  DROP CONSTRAINT IF EXISTS credit_transactions_type_check;

ALTER TABLE public.credit_transactions
  ADD CONSTRAINT credit_transactions_type_check
  CHECK (type IN (
    'submission_approved',
    'referral_bonus',
    'referral_invitee_bonus',
    'manual',
    'redemption'
  ));

-- 2. Update apply_referral_code to award HK$25 to both inviter AND invitee
CREATE OR REPLACE FUNCTION public.apply_referral_code(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitee_id uuid := auth.uid();
  v_inviter_id uuid;
BEGIN
  IF v_invitee_id IS NULL THEN RETURN false; END IF;

  SELECT user_id INTO v_inviter_id
  FROM public.referral_codes WHERE code = p_code;

  IF v_inviter_id IS NULL THEN RETURN false; END IF;
  IF v_inviter_id = v_invitee_id THEN RETURN false; END IF;

  IF EXISTS (SELECT 1 FROM public.referrals WHERE invitee_id = v_invitee_id) THEN
    RETURN false;
  END IF;

  INSERT INTO public.referrals (inviter_id, invitee_id, code)
  VALUES (v_inviter_id, v_invitee_id, p_code);

  -- HK$25 to the person who shared the invite
  PERFORM public.award_credits(
    v_inviter_id, 25, 'referral_bonus',
    'HK$25 credit — a friend joined CULTIVE using your invite',
    v_invitee_id::text
  );

  -- HK$25 to the new user who joined via invite
  PERFORM public.award_credits(
    v_invitee_id, 25, 'referral_invitee_bonus',
    'HK$25 credit — you joined CULTIVE via an invite',
    v_inviter_id::text
  );

  RETURN true;
END;
$$;
