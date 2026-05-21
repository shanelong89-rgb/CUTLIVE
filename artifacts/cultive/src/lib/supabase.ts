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
  created_at?: string;
  updated_at?: string;
};

// Fetch all events - fallback to mock data if Supabase fails
export async function getEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('date', { ascending: true });
  
  if (error) {
    console.warn('Supabase error, using mock events:', error.message);
    return mockEvents;
  }
  
  if (!data || data.length === 0) {
    return mockEvents;
  }
  
  return data as Event[];
}

// Fetch event by ID
export async function getEventById(id: string) {
  // First check mock events
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

// Submit a new event
export async function submitEvent(event: Omit<Event, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('events')
    .insert([event])
    .select()
    .single();
  
  if (error) {
    console.error('Error submitting event:', error);
    // Simulate success for demo
    return { ...event, id: 'new-' + Date.now() } as Event;
  }
  
  return data as Event;
}

// Get unique categories
export async function getCategories() {
  const { data, error } = await supabase
    .from('events')
    .select('category');
  
  if (error || !data) {
    return ['All', 'Music', 'Arts', 'Nightlife', 'Food', 'Wellness', 'Exclusive'];
  }
  
  const categories = [...new Set(data.map(e => e.category))];
  return ['All', ...categories, 'Exclusive'];
}

// Auth functions
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
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

export function onAuthStateChange(callback: (event: string, session: any) => void) {
  return supabase.auth.onAuthStateChange(callback);
}
