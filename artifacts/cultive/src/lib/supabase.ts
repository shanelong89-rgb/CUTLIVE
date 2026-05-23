import { createClient } from '@supabase/supabase-js';
import { mockEvents } from '../data/events';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://example.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'dummy-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Event = {
  id: string;
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

// ─── Public: events ───────────────────────────────────────────
export async function getEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('date', { ascending: true });

  if (error) {
    console.warn('Supabase error, using mock events:', error.message);
    return mockEvents;
  }
  if (!data || data.length === 0) return mockEvents;
  return data as Event[];
}

export async function getEventById(id: string) {
  const mockEvent = mockEvents.find(e => e.id === id);
  if (mockEvent) return mockEvent;

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching event:', error);
    return mockEvents[0] || null;
  }
  return data as Event;
}

export async function getCategories() {
  const { data, error } = await supabase.from('events').select('category');
  if (error || !data) {
    return ['All', 'Music', 'Arts', 'Nightlife', 'Food', 'Wellness', 'Market', 'Workshops', 'Exclusive'];
  }
  const categories = [...new Set(data.map(e => e.category).filter(Boolean))];
  return ['All', ...categories, 'Exclusive'];
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
  const { data: { user } } = await supabase.auth.getUser();
  const resolvedUserId = userId ?? user?.id ?? null;
  const row = {
    id: genId('sub'),
    instagram_url: instagramUrl,
    source_id: sourceId,
    submission_type: 'instagram',
    status: 'pending_scrape',
    title: 'Pending scrape…',
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
  const { data: { user } } = await supabase.auth.getUser();
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('saved_events')
    .select('event_id')
    .eq('user_id', user.id);
  if (error) return [];
  return (data || []).map((r: { event_id: string }) => r.event_id);
}

export async function addSavedEventRemote(eventId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('saved_events')
    .upsert(
      { user_id: user.id, event_id: eventId },
      { onConflict: 'user_id,event_id' },
    );
}

export async function removeSavedEventRemote(eventId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
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
    const { data: { user } } = await supabase.auth.getUser();
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
    const { data: { user } } = await supabase.auth.getUser();
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
    const { data: { user } } = await supabase.auth.getUser();
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

export async function createEvent(event: Omit<Event, 'id' | 'created_at' | 'updated_at'>) {
  const row = { id: genId('event'), ...event };
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
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
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
  // 2. Mark submission as approved + link
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
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    return true;
  }
  // Fallback: check DB role if schema is set up
  const { data, error } = await supabase.rpc('is_admin');
  if (error) return false;
  return !!data;
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
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function onAuthStateChange(callback: (event: string, session: any) => void) {
  return supabase.auth.onAuthStateChange(callback);
}
