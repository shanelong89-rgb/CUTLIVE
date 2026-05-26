-- ─────────────────────────────────────────────────────────────
-- CULTIVE: Credits & Referral System
-- Run this once in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ─────────────────────────────────────────────────────────────

-- 1. User credit balances (one row per user)
CREATE TABLE IF NOT EXISTS public.user_credits (
  user_id   uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance   integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Full credit audit trail
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount       integer NOT NULL,
  type         text NOT NULL CHECK (type IN (
                 'submission_approved', 'referral_bonus', 'manual', 'redemption'
               )),
  description  text,
  reference_id text,
  created_at   timestamptz DEFAULT now()
);

-- 3. One referral code per user
CREATE TABLE IF NOT EXISTS public.referral_codes (
  code       text PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- 4. Who invited whom (invitee is UNIQUE — one referral per new user)
CREATE TABLE IF NOT EXISTS public.referrals (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  code       text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ── RLS ────────────────────────────────────────────────────────
ALTER TABLE public.user_credits        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_codes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals           ENABLE ROW LEVEL SECURITY;

-- user_credits: each user reads their own row
CREATE POLICY "own_credits_read" ON public.user_credits
  FOR SELECT USING (auth.uid() = user_id);

-- credit_transactions: each user reads their own rows
CREATE POLICY "own_tx_read" ON public.credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- referral_codes: each user reads their own code
CREATE POLICY "own_code_read" ON public.referral_codes
  FOR SELECT USING (auth.uid() = user_id);

-- referrals: users can see their own rows (as inviter or invitee)
CREATE POLICY "own_referrals_read" ON public.referrals
  FOR SELECT USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

-- ── SECURITY DEFINER helpers (bypass RLS for trusted operations) ─
-- These run as the function owner (superuser) so the anon/auth client
-- can call them without needing direct write access to credit tables.

-- award_credits: internal helper called by other functions
CREATE OR REPLACE FUNCTION public.award_credits(
  p_user_id    uuid,
  p_amount     integer,
  p_type       text,
  p_description text,
  p_reference_id text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, balance, updated_at)
  VALUES (p_user_id, p_amount, now())
  ON CONFLICT (user_id) DO UPDATE
    SET balance    = user_credits.balance + p_amount,
        updated_at = now();

  INSERT INTO public.credit_transactions
    (user_id, amount, type, description, reference_id)
  VALUES
    (p_user_id, p_amount, p_type, p_description, p_reference_id);
END;
$$;

-- get_or_create_referral_code: returns the caller's referral code, creating one if needed
CREATE OR REPLACE FUNCTION public.get_or_create_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code    text;
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT code INTO v_code
  FROM public.referral_codes
  WHERE user_id = v_user_id;

  IF v_code IS NULL THEN
    v_code := upper(substring(replace(v_user_id::text, '-', ''), 1, 8));
    WHILE EXISTS (SELECT 1 FROM public.referral_codes WHERE code = v_code) LOOP
      v_code := upper(substring(md5(random()::text), 1, 8));
    END LOOP;
    INSERT INTO public.referral_codes (code, user_id) VALUES (v_code, v_user_id);
  END IF;

  RETURN v_code;
END;
$$;

-- apply_referral_code: new user applies an invite code; awards HK$25 to the inviter
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

  PERFORM public.award_credits(
    v_inviter_id, 25, 'referral_bonus',
    'HK$25 credit — a friend joined CULTIVE using your invite',
    v_invitee_id::text
  );

  RETURN true;
END;
$$;

-- award_submission_credits: admin awards HK$50 when a submission is approved
-- Guards against double-awarding via reference_id uniqueness check.
CREATE OR REPLACE FUNCTION public.award_submission_credits(
  p_submitter_user_id uuid,
  p_submission_id     text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.credit_transactions
    WHERE reference_id = p_submission_id AND type = 'submission_approved'
  ) THEN RETURN; END IF;

  PERFORM public.award_credits(
    p_submitter_user_id, 50, 'submission_approved',
    'HK$50 credit — your event was published on CULTIVE',
    p_submission_id
  );
END;
$$;
