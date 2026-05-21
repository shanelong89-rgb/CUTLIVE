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

export async function submitEvent(
  event: Omit<Event, "id" | "created_at" | "updated_at">,
): Promise<Event> {
  try {
    const { data, error } = await supabase
      .from("events")
      .insert([event])
      .select()
      .single();
    if (error) {
      return { ...event, id: "new-" + Date.now() } as Event;
    }
    return data as Event;
  } catch {
    return { ...event, id: "new-" + Date.now() } as Event;
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
