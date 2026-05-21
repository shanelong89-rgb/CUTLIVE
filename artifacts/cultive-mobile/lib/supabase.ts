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

// Writes to the `submissions` table (admin reviews & publishes).
export async function submitEvent(input: SubmissionInput) {
  const row = { id: genId("sub"), status: "pending" as const, ...input };
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
  created_at: string;
};

export async function getMySubmissions(): Promise<Submission[]> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const email = userData?.user?.email;
    if (!email) return [];
    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .eq("submitter_email", email)
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
