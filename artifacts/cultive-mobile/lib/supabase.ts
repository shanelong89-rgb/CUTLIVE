import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

import { mockEvents } from "@/data/events";

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || "https://example.supabase.co";
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "dummy-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

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
  rsvp_enabled?: boolean;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
};

export type SubmissionInput = {
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
  tags?: string[];
  submitter_name: string;
  submitter_email: string;
};

function genId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export async function getEvents(): Promise<Event[]> {
  try {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("date", { ascending: true });
    if (error || !data || data.length === 0) return mockEvents;
    return data as Event[];
  } catch {
    return mockEvents;
  }
}

export async function getEventById(id: string): Promise<Event | null> {
  const mockEvent = mockEvents.find((e) => e.id === id);
  if (mockEvent) return mockEvent;
  try {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return mockEvents[0] || null;
    return data as Event;
  } catch {
    return mockEvents[0] || null;
  }
}

// Uploads an image (local URI) to the `submission-images` Supabase Storage bucket
// and returns the public URL. The bucket must exist and be set to public in Supabase.
export async function uploadSubmissionImage(
  uri: string,
  mimeType: string = "image/jpeg",
): Promise<string> {
  const ext = mimeType.includes("png") ? "png" : "jpg";
  const path = `submissions/${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}.${ext}`;

  const response = await fetch(uri);
  const arrayBuffer = await response.arrayBuffer();

  const { error } = await supabase.storage
    .from("submission-images")
    .upload(path, arrayBuffer, { contentType: mimeType, upsert: false });

  if (error) {
    console.warn("uploadSubmissionImage error:", error.message);
    throw error;
  }

  const { data: urlData } = supabase.storage
    .from("submission-images")
    .getPublicUrl(path);

  return urlData.publicUrl;
}

// Writes to the `submissions` table (admin reviews & publishes).
export async function submitEvent(input: SubmissionInput) {
  const { data: { user } } = await supabase.auth.getUser();
  const row = {
    id: genId("sub"),
    status: "pending" as const,
    ...(user?.id ? { user_id: user.id } : {}),
    ...input,
  };
  const { data, error } = await supabase
    .from("submissions")
    .insert([row])
    .select()
    .single();
  if (error) {
    console.warn("submitEvent error:", error.message);
    throw error;
  }
  return data;
}

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
  submitter_name: string;
  submitter_email: string;
  status?: "pending" | "approved" | "rejected";
  reviewed_at?: string;
  published_event_id?: string | null;
  created_at: string;
};

// ─── Saved events (cloud sync) ───────────────────────────────
// Stored per user in `public.saved_events` so saves follow the account
// across devices and sign-ins. Falls back silently if the table isn't
// set up yet so the local-only experience keeps working.
export async function listSavedEventIdsRemote(): Promise<string[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from("saved_events")
      .select("event_id")
      .eq("user_id", user.id);
    if (error) return [];
    return (data || []).map((r: { event_id: string }) => r.event_id);
  } catch {
    return [];
  }
}

export async function addSavedEventRemote(eventId: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("saved_events")
      .upsert(
        { user_id: user.id, event_id: eventId },
        { onConflict: "user_id,event_id" },
      );
  } catch {
    // ignore
  }
}

export async function removeSavedEventRemote(eventId: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("saved_events")
      .delete()
      .eq("user_id", user.id)
      .eq("event_id", eventId);
  } catch {
    // ignore
  }
}

// ─── Inbox read state (cross-device sync) ────────────────────
export async function listReadItemKeysRemote(): Promise<string[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from("user_read_items")
      .select("item_key")
      .eq("user_id", user.id);
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
      .from("user_read_items")
      .upsert(
        keys.map((k) => ({ user_id: user.id, item_key: k })),
        { onConflict: "user_id,item_key" },
      );
  } catch {
    // ignore — local state is source of truth
  }
}

export async function getMySubmissions(): Promise<Submission[]> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return [];
    const filter = [
      user.id ? `user_id.eq.${user.id}` : null,
      user.email ? `submitter_email.eq.${user.email}` : null,
    ].filter(Boolean).join(",");
    if (!filter) return [];
    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .or(filter)
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data || []) as Submission[];
  } catch {
    return [];
  }
}

export async function getCurrentUser() {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user ?? null;
  } catch {
    return null;
  }
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function upsertPushToken(
  email: string,
  token: string,
): Promise<void> {
  try {
    await supabase.from("push_tokens").upsert(
      { email, token, updated_at: new Date().toISOString() },
      { onConflict: "email" },
    );
  } catch {
    // Non-fatal — app works fine without push tokens stored
  }
}
