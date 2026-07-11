import { createClient } from '@supabase/supabase-js';
import { mockEvents } from '../data/events';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://example.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'dummy-key';

// Singleton pattern: re-use the same client instance across HMR hot-reloads.
// Without this, Vite re-evaluating the module creates a second GoTrueClient
// that fights over the same auth storage, producing "Multiple GoTrueClient
// instances" warnings and unpredictable auth state on page navigation.
// Factory function lets TypeScript infer the concrete SupabaseClient type
// so the cast below is sound and tsc stays happy.
function _makeClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'cultive-auth',
    },
  });
}
const _WIN_KEY = '__cultive_supabase__';
const _w = window as unknown as Record<string, unknown>;
if (!_w[_WIN_KEY]) _w[_WIN_KEY] = _makeClient();
export const supabase = _w[_WIN_KEY] as ReturnType<typeof _makeClient>;

export type Event = {
  id: string;
  slug?: string | null;
  title: string;
  date: string;
  time: string;
  venue: string;
  image: string;
  category: string;
  price: string;
  description: string;
  is_exclusive?: boolean;
  isExclusive?: boolean;
  district?: string;
  ticket_url?: string | null;
  source_url?: string | null;
  date_end?: string | null;
  rsvp_enabled?: boolean;
  tags?: string[];
  submitted_by?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type Submission = {
  id: string;
  title: string;
  date: string;
  time?: string;
  venue: string;
  category: string;
  price?: string;
  description?: string;
  image?: string;
  is_exclusive?: boolean;
  district?: string;
  ticket_url?: string | null;
  date_end?: string | null;
  tags?: string[];
  submitter_name?: string;
  submitter_email?: string;
  user_id?: string | null;
  instagram_url?: string | null;
  source_id?: string | null;
  submission_type?: 'manual' | 'instagram';
  status: 'pending' | 'pending_scrape' | 'approved' | 'rejected';
  scraped_data?: Record<string, unknown> | null;
  created_at: string;
  reviewed_at?: string | null;
  published_event_id?: string | null;
};

// ─── Fast auth helper ─────────────────────────────────────────
// getUser() validates the JWT with the Supabase server on every call (~150–300 ms).
// getSession() reads the already-verified session from memory/localStorage in ~0 ms.
// Supabase RLS validates the JWT server-side for every query regardless, so using
// the local session for filter-clause user IDs is equally safe and far faster.
async function getSessionUser() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user ?? null;
}

// ─── Events cache ─────────────────────────────────────────────
// Two layers: module-level memory (fastest, resets on page refresh) +
// localStorage (survives refresh, cleared after TTL).
// This dramatically reduces Supabase egress — navigating between Discover,
// Saved, and EventDetail within one session costs at most 1 DB round-trip.

const EVENTS_CACHE_KEY = 'cultive:events-cache';
const EVENTS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

type EventsCacheEntry = { data: Event[]; fetchedAt: number };
let _eventsMemCache: EventsCacheEntry | null = null;

function readEventsCache(): Event[] | null {
  // 1. In-memory first — zero cost
  if (_eventsMemCache && Date.now() - _eventsMemCache.fetchedAt < EVENTS_CACHE_TTL) {
    return _eventsMemCache.data;
  }
  // 2. localStorage fallback — survives page refresh within the TTL window
  try {
    const raw = localStorage.getItem(EVENTS_CACHE_KEY);
    if (raw) {
      const entry: EventsCacheEntry = JSON.parse(raw);
      if (Date.now() - entry.fetchedAt < EVENTS_CACHE_TTL) {
        _eventsMemCache = entry; // warm up in-memory for next call
        return entry.data;
      }
    }
  } catch { /* ignore quota / parse errors */ }
  return null;
}

function writeEventsCache(data: Event[]) {
  const entry: EventsCacheEntry = { data, fetchedAt: Date.now() };
  _eventsMemCache = entry;
  try {
    localStorage.setItem(EVENTS_CACHE_KEY, JSON.stringify(entry));
  } catch { /* ignore quota errors (large payload) */ }
}

/** Call after any admin write (approve/reject/delete) to force a fresh fetch. */
export function invalidateEventsCache() {
  _eventsMemCache = null;
  try { localStorage.removeItem(EVENTS_CACHE_KEY); } catch { /* ignore */ }
}

// ─── Public: events ───────────────────────────────────────────
async function fetchEventsFromDB(): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('date', { ascending: true });

  if (error) {
    console.warn('Supabase error, using mock events:', error.message);
    return mockEvents;
  }
  if (!data || data.length === 0) return mockEvents;
  writeEventsCache(data as Event[]);
  return data as Event[];
}

/**
 * Returns cached events immediately (if available), then fires a background
 * re-fetch so the UI stays fresh without a loading flash.
 * Pass `onUpdate` to receive the fresh list once the background fetch finishes.
 */
export async function getEvents(onUpdate?: (data: Event[]) => void): Promise<Event[]> {
  const cached = readEventsCache();
  if (cached) {
    if (onUpdate) {
      fetchEventsFromDB().then(onUpdate).catch(() => undefined);
    }
    return cached;
  }
  return fetchEventsFromDB();
}

export async function getEventById(slugOrId: string) {
  // Check mock events by id or slug
  const mockEvent = mockEvents.find(e => e.id === slugOrId || e.slug === slugOrId);
  if (mockEvent) return mockEvent;

  // Check the in-memory/localStorage cache before hitting the DB.
  // If the user arrived from the Discover page the cache is already warm.
  const cached = readEventsCache();
  if (cached) {
    const found = cached.find(e => e.id === slugOrId || e.slug === slugOrId);
    if (found) return found;
  }

  // Query by slug OR id so both old (ev_xxx) and new (title-slug) URLs work.
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .or(`slug.eq.${slugOrId},id.eq.${slugOrId}`)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching event:', error);
    return mockEvents[0] || null;
  }
  return data as Event;
}

export async function getCategories() {
  const { data, error } = await supabase.from('events').select('category');
  if (error || !data) {
    return ['All', 'Art', 'Music', 'Electronic', 'Nightlife', 'Market', 'Food & Drink', 'Wellness', 'Workshop', 'Community', 'Sports', 'Film', 'Literature', 'Social', 'Fitness', 'Uncategorized', 'Exclusive'];
  }
  const categories = [...new Set(data.map(e => e.category).filter(Boolean))];
  return ['All', ...categories, 'Exclusive'];
}

// ─── Slug helpers ─────────────────────────────────────────────
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

async function generateUniqueSlug(title: string): Promise<string> {
  const base = slugify(title) || 'event';
  const { data } = await supabase
    .from('events')
    .select('slug')
    .like('slug', `${base}%`);
  const taken = new Set((data ?? []).map((r: { slug: string }) => r.slug));
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

// ─── Public: submissions (anyone can submit) ─────────────────
function genId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export type SubmissionInput = Omit<
  Submission,
  'id' | 'status' | 'created_at' | 'reviewed_at' | 'published_event_id'
>;

// ─── Instagram link submission ────────────────────────────────
function extractInstagramPostId(url: string): string | null {
  const m = url.match(/instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

export async function submitInstagramLink(
  instagramUrl: string,
  userId?: string,
  submitterName?: string,
  submitterEmail?: string,
) {
  const sourceId = extractInstagramPostId(instagramUrl);
  // Always resolve the authenticated user so user_id is never omitted when
  // the caller forgets to pass it (e.g. the admin quick-submit path).
  const user = await getSessionUser();
  const resolvedUserId = userId ?? user?.id ?? null;
  const row = {
    id: genId('sub'),
    instagram_url: instagramUrl,
    source_id: sourceId,
    submission_type: 'instagram',
    status: 'pending_scrape',
    title: 'Pending review…',
    ...(resolvedUserId ? { user_id: resolvedUserId } : {}),
    ...(submitterName ? { submitter_name: submitterName } : {}),
    ...(submitterEmail ? { submitter_email: submitterEmail } : {}),
  };
  const { data, error } = await supabase
    .from('submissions')
    .insert([row])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function submitEvent(input: SubmissionInput) {
  const user = await getSessionUser();
  const row = {
    id: genId('sub'),
    status: 'pending' as const,
    ...input,
    // user_id is set last so the authenticated user always wins, even if
    // input carries a stale or null user_id (SubmissionInput allows the field).
    ...(user?.id ? { user_id: user.id } : {}),
  };
  const { data, error } = await supabase
    .from('submissions')
    .insert([row])
    .select()
    .single();

  if (error) {
    console.error('Error submitting:', error);
    throw error;
  }
  return data as Submission;
}

// ─── Saved events (cloud sync) ───────────────────────────────
// Stored per user in `public.saved_events` so saves follow the account
// across devices and sign-ins. Falls back silently if the table isn't
// set up yet (returns [] / swallows errors) so the local-only experience
// keeps working.
export async function listSavedEventIdsRemote(): Promise<string[]> {
  const user = await getSessionUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('saved_events')
    .select('event_id')
    .eq('user_id', user.id);
  if (error) return [];
  return (data || []).map((r: { event_id: string }) => r.event_id);
}

export async function addSavedEventRemote(eventId: string): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;
  await supabase
    .from('saved_events')
    .upsert(
      { user_id: user.id, event_id: eventId },
      { onConflict: 'user_id,event_id' },
    );
}

export async function removeSavedEventRemote(eventId: string): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;
  await supabase
    .from('saved_events')
    .delete()
    .eq('user_id', user.id)
    .eq('event_id', eventId);
}

// ─── Inbox read state (cross-device sync) ────────────────────
export async function listReadItemKeysRemote(): Promise<string[]> {
  try {
    const user = await getSessionUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('user_read_items')
      .select('item_key')
      .eq('user_id', user.id);
    if (error) return [];
    return (data || []).map((r: { item_key: string }) => r.item_key);
  } catch {
    return [];
  }
}

export async function markReadItemsRemote(keys: string[]): Promise<void> {
  if (!keys.length) return;
  try {
    const user = await getSessionUser();
    if (!user) return;
    await supabase
      .from('user_read_items')
      .upsert(
        keys.map((k) => ({ user_id: user.id, item_key: k })),
        { onConflict: 'user_id,item_key' },
      );
  } catch {
    // ignore — local state is source of truth
  }
}

export async function deleteReadItemsRemote(keys: string[]): Promise<void> {
  if (!keys.length) return;
  try {
    const user = await getSessionUser();
    if (!user) return;
    await supabase
      .from('user_read_items')
      .delete()
      .eq('user_id', user.id)
      .in('item_key', keys);
  } catch {
    // ignore — local state is source of truth
  }
}

// ─── Admin: events CRUD ──────────────────────────────────────
export async function adminListEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('date', { ascending: false });
  if (error) throw error;
  return (data || []) as Event[];
}

export async function createEvent(event: Omit<Event, 'id' | 'slug' | 'created_at' | 'updated_at'>) {
  const slug = await generateUniqueSlug(event.title);
  const row = { id: genId('event'), slug, ...event };
  const { data, error } = await supabase
    .from('events')
    .insert([row])
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new Error(
      "Insert blocked by database security. Run in Supabase SQL editor:\n" +
      "update public.profiles set is_admin = true where email = '<your login email>';"
    );
  }
  return data as Event;
}

export async function updateEvent(id: string, patch: Partial<Event>) {
  const { data, error } = await supabase
    .from('events')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new Error(
      "Update blocked by database security. Run in Supabase SQL editor:\n" +
      "update public.profiles set is_admin = true where email = '<your login email>';"
    );
  }
  return data as Event;
}

export async function deleteEvent(id: string) {
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throw error;
}

// ─── User-facing: my submissions (for inbox) ─────────────────
export async function getMySubmissions(): Promise<Submission[]> {
  const user = await getSessionUser();
  if (!user) return [];
  // Match by user_id (for submissions made while signed in) OR submitter_email
  // (for submissions made before user_id was saved, or from older app versions).
  const filter = [
    user.id ? `user_id.eq.${user.id}` : null,
    user.email ? `submitter_email.eq.${user.email}` : null,
  ].filter(Boolean).join(',');
  if (!filter) return [];
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .or(filter)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Submission[];
}

// ─── Admin: submissions inbox ────────────────────────────────
export async function adminListSubmissions(status?: 'pending' | 'approved' | 'rejected') {
  let q = supabase.from('submissions').select('*').order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as Submission[];
}

export async function approveSubmission(sub: Submission) {
  // Fall back to scraped_data fields for Instagram submissions
  const s = (sub.scraped_data ?? {}) as Record<string, unknown>;
  const str = (key: string) => (typeof s[key] === 'string' ? (s[key] as string) : undefined);

  const resolvedTime = sub.time || str('extracted_time') || '';
  const resolvedDesc = sub.description || str('extracted_description') || '';
  const resolvedTitle = sub.title || str('extracted_title') || 'Untitled';

  // Auto-tag nightlife: starts after 17:00, or text says "till late" / related phrases
  const isLateNight = (() => {
    if (resolvedTime) {
      const m = resolvedTime.match(/(\d{1,2})[:\s]?(\d{0,2})\s*(am|pm)?/i);
      if (m) {
        let h = parseInt(m[1], 10);
        const period = (m[3] || '').toLowerCase();
        if (period === 'pm' && h !== 12) h += 12;
        if (period === 'am' && h === 12) h = 0;
        if (h >= 17) return true;
      }
    }
    const haystack = [resolvedTime, resolvedDesc, resolvedTitle].join(' ').toLowerCase();
    return /till\s*late|late\s*night|midnight|after\s*dark|late\s*show|evening\s*show/.test(haystack);
  })();

  const baseTags: string[] = sub.tags || [];
  const finalTags = isLateNight && !baseTags.includes('nightlife')
    ? [...baseTags, 'nightlife']
    : baseTags;

  // 1. Insert event derived from submission (prefer direct fields, fall back to scraped)
  const event = await createEvent({
    title: resolvedTitle,
    date: sub.date || str('extracted_date') || '',
    time: resolvedTime,
    venue: sub.venue || str('extracted_venue') || '',
    image: sub.image || str('extracted_image') || '',
    category: sub.category || str('extracted_category') || 'Other',
    price: sub.price || str('extracted_price') || 'Free',
    description: resolvedDesc,
    is_exclusive: sub.is_exclusive || false,
    district: sub.district || (sub.venue?.split(',')[0] ?? '') || str('extracted_district') || '',
    ticket_url: sub.ticket_url || null,
    source_url: sub.instagram_url || null,
    date_end: sub.date_end || null,
    tags: finalTags,
    submitted_by: sub.submitter_name || null,
  });
  // 2. Award HK$50 credit to the submitter (if they have a user_id)
  if (sub.user_id) {
    await supabase.rpc('award_submission_credits', {
      p_submitter_user_id: sub.user_id,
      p_submission_id: sub.id,
    }).then(({ error }) => {
      if (error) console.warn('Credit award error:', error.message);
    });
  }

  // 3. Mark submission as approved + link
  const { data, error } = await supabase
    .from('submissions')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      published_event_id: event.id,
    })
    .eq('id', sub.id)
    .select()
    .single();
  if (error) throw error;
  return { event, submission: data as Submission };
}

export async function rejectSubmission(id: string) {
  const { data, error } = await supabase
    .from('submissions')
    .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Submission;
}

// ─── Admin: push notifications ───────────────────────────────
/**
 * After approving or rejecting a submission, look up the submitter's Expo
 * push token and deliver a notification via the Expo Push API.
 * Fails silently — the review action itself is already complete.
 */
export async function sendSubmissionPushNotification(opts: {
  submitterEmail: string;
  submissionTitle: string;
  status: 'approved' | 'rejected';
  publishedEventId?: string | null;
}): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('email', opts.submitterEmail)
      .single();
    if (error || !data?.token) return;

    const isApproved = opts.status === 'approved';
    const title = isApproved
      ? `"${opts.submissionTitle}" was approved`
      : `"${opts.submissionTitle}" wasn't approved`;
    const body = isApproved
      ? 'Your event is now live on CULTIVE. Tap to view it.'
      : 'Thanks for submitting — this one didn\'t make it through editorial review.';

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: data.token,
        title,
        body,
        data: { screen: 'inbox' },
        sound: 'default',
      }),
    });
  } catch {
    // Non-fatal — notification delivery is best-effort
  }
}

// ─── Admin: role check ───────────────────────────────────────
// Hardcoded admin emails (always granted access, no SQL required)
const ADMIN_EMAILS = ['shanelong89@gmail.com', 'shanelong@gmail.com'];

export async function isAdmin(): Promise<boolean> {
  const user = await getSessionUser();
  if (!user?.email) return false;
  return ADMIN_EMAILS.includes(user.email.toLowerCase());
}

// ─── Auth ────────────────────────────────────────────────────
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin,
    },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  clearWhatsAppSession();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function signInWithGoogle() {
  try { localStorage.setItem('cultive-remember-me', 'true'); } catch { /* ignore */ }

  // Point the popup back to our lightweight callback page, which just
  // processes the session exchange and closes itself.
  const redirectTo = `${window.location.origin}/auth/callback`;
  console.log('[auth] signInWithGoogle popup — redirectTo:', redirectTo);

  // Ask Supabase for the OAuth URL without auto-navigating.
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error('No OAuth URL returned from Supabase');

  // Open a popup — same origin means popup shares localStorage with this window.
  // Supabase's onAuthStateChange in the parent fires automatically via storage events.
  const popup = window.open(
    data.url,
    'cultive-google-auth',
    'width=520,height=620,scrollbars=yes,resizable=yes',
  );

  if (!popup) {
    // Popup was blocked by the browser — fall back to full-page redirect.
    console.log('[auth] popup blocked, falling back to redirect');
    sessionStorage.setItem('cultive-oauth-pending', '1');
    window.location.href = data.url;
    return;
  }

  // Wait for the popup to signal completion (via postMessage) or close on its own.
  // postMessage is more reliable than storage events in cross-frame environments
  // (e.g. Replit's iframe preview) where storage events can arrive late or be dropped.
  await new Promise<void>((resolve) => {
    const done = () => {
      window.removeEventListener('message', onMessage);
      clearInterval(pollTimer);
      resolve();
    };

    const onMessage = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.data?.type === 'CULTIVE_AUTH_COMPLETE') {
        done();
      }
    };
    window.addEventListener('message', onMessage);

    // Fallback: poll for popup closing in case the message never arrives.
    const pollTimer = setInterval(() => {
      if (popup.closed) done();
    }, 400);
  });

  // Force this window's Supabase client to re-read the session from localStorage.
  // The popup wrote the session there after the PKCE code exchange; without this
  // explicit re-read the parent window's in-memory state stays stale.
  await supabase.auth.getSession();
}

export function onAuthStateChange(callback: (event: string, session: any) => void) {
  return supabase.auth.onAuthStateChange(callback);
}

// ─── Credits & Referrals ─────────────────────────────────────

export type CreditTransaction = {
  id: string;
  user_id: string;
  amount: number;
  type: 'submission_approved' | 'referral_bonus' | 'referral_invitee_bonus' | 'manual' | 'redemption';
  description: string | null;
  reference_id: string | null;
  created_at: string;
};

export async function getCreditTransactions(): Promise<CreditTransaction[]> {
  const user = await getSessionUser();
  if (!user) return [];
  const { data } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);
  return (data ?? []) as CreditTransaction[];
}

export async function getUserCredits(): Promise<{
  balance: number;
  transactions: CreditTransaction[];
}> {
  const user = await getSessionUser();
  if (!user) return { balance: 0, transactions: [] };

  const [creditsRes, txRes] = await Promise.all([
    supabase
      .from('user_credits')
      .select('balance')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  return {
    balance: creditsRes.data?.balance ?? 0,
    transactions: (txRes.data ?? []) as CreditTransaction[],
  };
}

export async function getOrCreateReferralCode(): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_or_create_referral_code');
  if (error) { console.warn('Referral code error:', error.message); return null; }
  return data as string;
}

export async function applyReferralCode(code: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('apply_referral_code', { p_code: code });
  if (error) { console.warn('Apply referral error:', error.message); return false; }
  return !!data;
}

export async function linkWhatsApp(phone: string): Promise<{ ok: boolean; wa_id?: string; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { ok: false, error: 'Not signed in' };

  // Basic client-side length check — the Edge Function does the real
  // normalisation (strips +, spaces, dashes) and conflict checking.
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) {
    return { ok: false, error: 'Enter a valid phone number with country code, e.g. 85261234567' };
  }

  let res: Response;
  try {
    res = await fetch(`${supabaseUrl}/functions/v1/link-whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ phone }),
    });
  } catch {
    return { ok: false, error: 'Could not reach the server. Please check your connection and try again.' };
  }

  let data: { success?: boolean; wa_id?: string; error?: string };
  try {
    data = await res.json();
  } catch {
    return { ok: false, error: `Unexpected server response (HTTP ${res.status}). Please try again.` };
  }

  if (res.status === 409) {
    return { ok: false, error: 'That number is already linked to a different account.' };
  }
  if (!data.success) {
    return { ok: false, error: data.error ?? 'Something went wrong — please try again.' };
  }

  return { ok: true, wa_id: data.wa_id };
}

export async function getLinkedWhatsApp(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('phone')
    .eq('id', user.id)
    .maybeSingle();
  if (error || !data) return null;
  return (data as { phone: string | null }).phone ?? null;
}

// ─── WhatsApp magic-link verification ────────────────────────
// Verifies a phone+token pair against the wa_links row via a SECURITY DEFINER
// RPC (see supabase/migrations/add_verify_wa_magic_link_rpc.sql). The RPC
// itself clears the one-time code so it can't be replayed. This creates a
// lightweight app-level session (localStorage), NOT a real Supabase Auth
// session — RLS-gated writes elsewhere still require the user to sign in
// properly (e.g. by setting an email/password on the Account page).
const WA_SESSION_KEY = 'cultive-wa-user-id';
const WA_PHONE_KEY = 'cultive-wa-phone';

// Read back the WhatsApp pseudo-session written by verifyWhatsAppMagicLink.
// useAuth() uses this to recognize the user as logged in app-wide (nav,
// ProfileMenu, Account page) even though there's no real Supabase Auth JWT.
export function getWhatsAppSession(): { userId: string; phone: string | null } | null {
  try {
    const userId = localStorage.getItem(WA_SESSION_KEY);
    if (!userId) return null;
    return { userId, phone: localStorage.getItem(WA_PHONE_KEY) };
  } catch {
    return null;
  }
}

export function clearWhatsAppSession() {
  try {
    localStorage.removeItem(WA_SESSION_KEY);
    localStorage.removeItem(WA_PHONE_KEY);
  } catch { /* ignore */ }
}

export async function verifyWhatsAppMagicLink(
  phone: string,
  token: string,
): Promise<{ ok: boolean; userId?: string; error?: string }> {
  // wa_links.wa_id is stored E.164 WITHOUT the leading '+' (the webhook
  // writes numbers exactly as WhatsApp sends them, with no '+'). Strip any
  // non-digit characters (including a leading '+' if the link included one)
  // so the exchange matches regardless of how the link formats the phone.
  const waId = phone.replace(/\D/g, '');
  if (!waId || !token) {
    return { ok: false, error: 'This link is missing information and can\'t be verified.' };
  }

  // Exchange the magic-link token for a REAL Supabase Auth session via the
  // exchange-wa-magic-link Edge Function. It validates the token (via the
  // verify_wa_magic_link RPC), signs the user in server-side, and returns
  // genuine GoTrue JWT tokens — so RLS-protected reads/writes work natively.
  let data: {
    success?: boolean;
    access_token?: string;
    refresh_token?: string;
    user_id?: string;
    error?: string;
  };
  let res: Response;
  try {
    res = await fetch(`${supabaseUrl}/functions/v1/exchange-wa-magic-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: waId, token }),
    });
  } catch {
    return { ok: false, error: 'Could not reach the login service. Please check your connection and try again.' };
  }

  try {
    data = await res.json();
  } catch {
    // Non-JSON body (e.g. gateway error page). Surface the HTTP status so
    // failures are debuggable instead of collapsing into a generic message.
    return { ok: false, error: `The login service returned an unexpected response (HTTP ${res.status}). Please try again.` };
  }

  if (!data.success || !data.access_token || !data.refresh_token) {
    return {
      ok: false,
      error: data.error || 'This link is invalid or has expired. Message us on WhatsApp for a new one.',
    };
  }

  // Install the real session so supabase.auth.getSession()/onAuthStateChange
  // and useAuth() pick it up natively.
  const { error: sessionError } = await supabase.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  });
  if (sessionError) {
    return { ok: false, error: sessionError.message };
  }

  // Keep the session across browser restarts (mirrors normal sign-in flows).
  try {
    localStorage.setItem('cultive-remember-me', 'true');
    // Real session established — the localStorage pseudo-session is no longer
    // needed; clear any leftovers from the old flow.
    clearWhatsAppSession();
  } catch { /* ignore */ }

  return { ok: true, userId: data.user_id };
}

export function getWhatsAppSessionUserId(): string | null {
  try {
    return localStorage.getItem(WA_SESSION_KEY);
  } catch {
    return null;
  }
}

export async function awardSubmissionCredits(
  submitterUserId: string,
  submissionId: string,
): Promise<void> {
  const { error } = await supabase.rpc('award_submission_credits', {
    p_submitter_user_id: submitterUserId,
    p_submission_id: submissionId,
  });
  if (error) console.warn('Credit award error:', error.message);
}
