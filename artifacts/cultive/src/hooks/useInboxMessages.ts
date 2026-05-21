import { useCallback, useEffect, useState } from 'react';
import { getEvents, getMySubmissions, supabase, type Event, type Submission } from '../lib/supabase';

const READ_KEY = 'cultive:read-messages';
const SAVED_KEY = 'cultive:saved-events';
const SAVED_EVENT_NAME = 'cultive:saved-events-changed';

function readSavedIds(): string[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function parseEventDate(raw: string, timeStr?: string): Date | null {
  if (!raw) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const s = raw.trim().toLowerCase();
  let base: Date | null = null;
  if (s.includes('today')) base = new Date(today);
  else if (s.includes('tomorrow')) base = new Date(today.getTime() + 86400000);
  else {
    const direct = new Date(raw);
    if (!isNaN(direct.getTime())) base = direct;
    else {
      const m = raw.match(/([A-Za-z]{3,})\s+(\d{1,2})/);
      if (m) {
        const guess = new Date(`${m[1]} ${m[2]}, ${now.getFullYear()}`);
        if (!isNaN(guess.getTime())) {
          if (guess.getTime() < today.getTime() - 86400000)
            guess.setFullYear(now.getFullYear() + 1);
          base = guess;
        }
      }
    }
  }
  if (!base) return null;
  if (timeStr) {
    const tm = timeStr.match(/(\d{1,2})[:\.](\d{2})/);
    if (tm) base.setHours(parseInt(tm[1], 10), parseInt(tm[2], 10), 0, 0);
  }
  return base;
}

function reminderPreview(when: Date): string {
  const now = Date.now();
  const diff = when.getTime() - now;
  const days = Math.round(diff / 86400000);
  if (diff < 0) return 'Happening now';
  if (days === 0) return 'Happening today — don\'t miss it.';
  if (days === 1) return 'Happening tomorrow — get ready.';
  if (days < 7) return `Coming up in ${days} days.`;
  return `Coming up on ${when.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}.`;
}

export interface InboxMessage {
  id: string;
  title: string;
  preview: string;
  time: string;
  unread: boolean;
  createdAt: string;
  kind: 'welcome' | 'submission-pending' | 'submission-approved' | 'submission-rejected' | 'saved-reminder';
}

function readReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function writeReadIds(set: Set<string>) {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function submissionToMessage(s: Submission): InboxMessage {
  const status = s.status || 'pending';
  const reviewed = (s as any).reviewed_at || s.created_at;
  if (status === 'approved') {
    return {
      id: `sub-approved-${s.id}`,
      title: `"${s.title}" was approved`,
      preview: 'Your event is now live on CULTIVE. Tap to see it on the discover page.',
      time: relativeTime(reviewed),
      unread: false,
      createdAt: reviewed,
      kind: 'submission-approved',
    };
  }
  if (status === 'rejected') {
    return {
      id: `sub-rejected-${s.id}`,
      title: `"${s.title}" wasn't approved`,
      preview: 'Thanks for submitting — this one didn\'t make it through editorial review.',
      time: relativeTime(reviewed),
      unread: false,
      createdAt: reviewed,
      kind: 'submission-rejected',
    };
  }
  return {
    id: `sub-pending-${s.id}`,
    title: `Submission received: "${s.title}"`,
    preview: 'Our editors are reviewing your event. You\'ll hear back within a few days.',
    time: relativeTime(s.created_at),
    unread: false,
    createdAt: s.created_at,
    kind: 'submission-pending',
  };
}

export function useInboxMessages() {
  const [signedIn, setSignedIn] = useState(false);
  const [signupAt, setSignupAt] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [savedEvents, setSavedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [readIds, setReadIds] = useState<Set<string>>(() =>
    typeof window === 'undefined' ? new Set() : readReadIds(),
  );

  const load = useCallback(async () => {
    setLoading(true);
    // Use getSession() — reads the persisted session locally (no network call,
    // works immediately after sign-in even with multiple client instances).
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) {
      setSignedIn(false);
      setSignupAt(null);
      setSubmissions([]);
      setLoading(false);
      return;
    }
    setSignedIn(true);
    setSignupAt(user.created_at || null);
    try {
      const subs = await getMySubmissions();
      setSubmissions(subs);
    } catch {
      setSubmissions([]);
    }
    try {
      const savedIds = readSavedIds();
      if (savedIds.length > 0) {
        const all = await getEvents();
        setSavedEvents(all.filter((e) => savedIds.includes(e.id)));
      } else {
        setSavedEvents([]);
      }
    } catch {
      setSavedEvents([]);
    }
    setLoading(false);
  }, []);

  const refreshSaved = useCallback(async () => {
    try {
      const savedIds = readSavedIds();
      if (savedIds.length === 0) {
        setSavedEvents([]);
        return;
      }
      const all = await getEvents();
      setSavedEvents(all.filter((e) => savedIds.includes(e.id)));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const sync = () => refreshSaved();
    window.addEventListener(SAVED_EVENT_NAME, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(SAVED_EVENT_NAME, sync);
      window.removeEventListener('storage', sync);
    };
  }, [refreshSaved]);

  useEffect(() => {
    // Subscribe FIRST so we don't miss a SIGNED_IN event during initial load.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        load();
      } else {
        setSignedIn(false);
        setSignupAt(null);
        setSubmissions([]);
        setLoading(false);
      }
    });
    load();
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const messages: InboxMessage[] = (() => {
    if (!signedIn) return [];
    const base: InboxMessage[] = submissions.map(submissionToMessage);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    for (const ev of savedEvents) {
      const when = parseEventDate(ev.date, ev.time);
      if (!when) continue;
      if (when.getTime() < todayStart.getTime()) continue;
      base.push({
        id: `reminder-${ev.id}`,
        title: `Reminder: ${ev.title}`,
        preview: reminderPreview(when),
        time: when.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        unread: true,
        createdAt: when.toISOString(),
        kind: 'saved-reminder',
      });
    }
    if (signupAt) {
      base.push({
        id: 'welcome',
        title: 'Welcome to CULTIVE',
        preview:
          'Your curated guide to Hong Kong\'s best events. Save what catches your eye and submit your own.',
        time: relativeTime(signupAt),
        unread: false,
        createdAt: signupAt,
        kind: 'welcome',
      });
    }
    base.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return base.map((m) => ({ ...m, unread: !readIds.has(m.id) }));
  })();

  const unreadCount = messages.filter((m) => m.unread).length;

  const markRead = useCallback(
    (id: string) => {
      const next = new Set(readIds);
      next.add(id);
      writeReadIds(next);
      setReadIds(next);
    },
    [readIds],
  );

  const markAllRead = useCallback(() => {
    const next = new Set(readIds);
    messages.forEach((m) => next.add(m.id));
    writeReadIds(next);
    setReadIds(next);
  }, [readIds, messages]);

  return { messages, unreadCount, loading, signedIn, refresh: load, markRead, markAllRead };
}
