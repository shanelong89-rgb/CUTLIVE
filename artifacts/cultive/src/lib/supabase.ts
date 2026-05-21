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
  submitter_name: string;
  submitter_email: string;
  status: 'pending' | 'approved' | 'rejected';
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
    return ['All', 'Music', 'Arts', 'Nightlife', 'Food', 'Wellness', 'Exclusive'];
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

export async function submitEvent(input: SubmissionInput) {
  const row = { id: genId('sub'), status: 'pending' as const, ...input };
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
  const email = userData?.user?.email;
  if (!email) return [];
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('submitter_email', email)
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
  // 1. Insert event derived from submission
  const event = await createEvent({
    title: sub.title,
    date: sub.date,
    time: sub.time || '',
    venue: sub.venue,
    image: sub.image || '',
    category: sub.category,
    price: sub.price || 'Free',
    description: sub.description || '',
    is_exclusive: sub.is_exclusive || false,
    district: sub.district || (sub.venue?.split(',')[0] ?? ''),
    ticket_url: sub.ticket_url || null,
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

// ─── Admin: role check ───────────────────────────────────────
// Hardcoded admin emails (always granted access, no SQL required)
const ADMIN_EMAILS = ['shanelong@gmail.com'];

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
  const { data, error } = await supabase.auth.signUp({ email, password });
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
