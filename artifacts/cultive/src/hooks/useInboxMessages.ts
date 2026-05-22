import { useCallback, useEffect, useRef, useState } from 'react';
import { deleteReadItemsRemote, getEvents, getMySubmissions, listReadItemKeysRemote, markReadItemsRemote, supabase, type Event, type Submission } from '../lib/supabase';

const READ_KEY = 'cultive:read-messages';
const SAVED_KEY = 'cultive:saved-events';
const SAVED_EVENT_NAME = 'cultive:saved-events-changed';
const SUBMISSION_STATUSES_KEY = 'cultive:submission-statuses';

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

  if (s.includes('today')) {
    base = new Date(today);
  } else if (s.includes('tomorrow')) {
    base = new Date(today.getTime() + 86400000);
  } else {
    // Extract explicit year if present, e.g. "2026" in "May 8-27, 2026"
    const yearMatch = raw.match(/\b(20\d{2})\b/);
    const explicitYear = yearMatch ? parseInt(yearMatch[1], 10) : null;

    if (explicitYear) {
      // String contains a year — bypass new Date(raw) entirely because V8 misparses
      // range strings like "May 8-27, 2026" as 2027. Trust the extracted year.
      const wdm = raw.match(/[A-Za-z]{3,}\s+(\d{1,2})\s+([A-Za-z]{3,})/);
      const wmd = !wdm ? raw.match(/[A-Za-z]{3,}\s+([A-Za-z]{3,})\s+(\d{1,2})/) : null;
      if (wdm) {
        const attempt = new Date(`${wdm[2]} ${wdm[1]}, ${explicitYear}`);
        if (!isNaN(attempt.getTime())) base = attempt;
      } else if (wmd) {
        const attempt = new Date(`${wmd[1]} ${wmd[2]}, ${explicitYear}`);
        if (!isNaN(attempt.getTime())) base = attempt;
      }
      if (!base) {
        // "Month DD..." e.g. "May 8-27, 2026" → extract "May 8"
        const m = raw.match(/([A-Za-z]{3,})\s+(\d{1,2})/);
        if (m) {
          const attempt = new Date(`${m[1]} ${m[2]}, ${explicitYear}`);
          if (!isNaN(attempt.getTime())) base = attempt;
        }
      }
    } else {
      // No explicit year — handle weekday-prefixed formats first to avoid V8 quirk
      // returning year ~2001 for strings like "Fri 13 Jun".
      const wdm = raw.match(/[A-Za-z]{3,}\s+(\d{1,2})\s+([A-Za-z]{3,})/);
      const wmd = !wdm ? raw.match(/[A-Za-z]{3,}\s+([A-Za-z]{3,})\s+(\d{1,2})/) : null;
      if (wdm) {
        const attempt = new Date(`${wdm[2]} ${wdm[1]}, ${now.getFullYear()}`);
        if (!isNaN(attempt.getTime())) base = attempt;
      } else if (wmd) {
        const attempt = new Date(`${wmd[1]} ${wmd[2]}, ${now.getFullYear()}`);
        if (!isNaN(attempt.getTime())) base = attempt;
      }
      if (!base) {
        // Direct parse — only accept current or next year (rejects V8 year-2001 quirk)
        const direct = new Date(raw);
        if (!isNaN(direct.getTime())) {
          const yr = direct.getFullYear();
          if (yr === now.getFullYear() || yr === now.getFullYear() + 1) base = direct;
        }
      }
      if (!base) {
        // "Month DD" fallback with year rollover
        const m = raw.match(/([A-Za-z]{3,})\s+(\d{1,2})/);
        if (m) {
          const guess = new Date(`${m[1]} ${m[2]}, ${now.getFullYear()}`);
          if (!isNaN(guess.getTime())) {
            if (guess.getTime() < today.getTime() - 14 * 86400000)
              guess.setFullYear(now.getFullYear() + 1);
            base = guess;
          }
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
  kind:
    | 'welcome'
    | 'submission-pending'
    | 'submission-approved'
    | 'submission-rejected'
    | 'saved-reminder'
    | 'saved-reminder-tomorrow'
    | 'saved-reminder-soon';
  linkTo?: string;
  mapsUrl?: string;
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

function readSubmissionStatuses(): Record<string, string> {
  try {
    const raw = localStorage.getItem(SUBMISSION_STATUSES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, string>)
      : {};
  } catch {
    return {};
  }
}

function writeSubmissionStatuses(statuses: Record<string, string>) {
  try {
    localStorage.setItem(SUBMISSION_STATUSES_KEY, JSON.stringify(statuses));
  } catch {
    // ignore
  }
}

function submissionMessageIds(subId: string): string[] {
  return [
    `sub-pending-${subId}`,
    `sub-approved-${subId}`,
    `sub-rejected-${subId}`,
  ];
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
      preview: s.published_event_id
        ? 'Your event is now live on CULTIVE. Tap to view it.'
        : 'Your event is now live on CULTIVE. Find it on the Discover page.',
      time: relativeTime(reviewed),
      unread: false,
      createdAt: reviewed,
      kind: 'submission-approved',
      linkTo: s.published_event_id ? `/event/${s.published_event_id}` : '/',
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
      linkTo: '/account',
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
    linkTo: '/account',
  };
}

function buildSavedReminders(events: Event[]): InboxMessage[] {
  const msgs: InboxMessage[] = [];
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart.getTime() + 86400000);
  const tomorrowEnd = new Date(tomorrowStart.getTime() + 86400000);
  // Allow events from the past 14 days — covers ongoing exhibitions and multi-day events
  const cutoff = new Date(todayStart.getTime() - 14 * 86400000);
  for (const ev of events) {
    const when = parseEventDate(ev.date, ev.time);
    if (!when) continue;
    if (when.getTime() < cutoff.getTime()) continue;

    const msUntil = when.getTime() - now.getTime();
    const hoursUntil = msUntil / 3600000;

    if (msUntil <= 0) {
      // Already started / happening now — show Maps + door details
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((ev.venue || '') + ' Hong Kong')}`;
      const previewParts = [
        ev.venue,
        ev.price ? `Door: ${ev.price}` : null,
      ].filter(Boolean) as string[];
      msgs.push({
        id: `reminder-now-${ev.id}`,
        title: `Happening now: ${ev.title}`,
        preview: previewParts.join(' · ') || 'On right now — get there.',
        time: 'now',
        unread: true,
        createdAt: new Date(now.getTime() - 60000).toISOString(),
        kind: 'saved-reminder-soon',
        linkTo: `/event/${ev.id}`,
        mapsUrl,
      });
    } else if (hoursUntil <= 2 && ev.time) {
      // Starting within 2 hours — show Maps + door details
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((ev.venue || '') + ' Hong Kong')}`;
      const hoursLabel =
        hoursUntil < 1
          ? `${Math.round(hoursUntil * 60)} min`
          : `${Math.round(hoursUntil)}h`;
      const previewParts = [
        ev.venue,
        ev.price ? `Door: ${ev.price}` : null,
      ].filter(Boolean) as string[];
      msgs.push({
        id: `reminder-soon-${ev.id}`,
        title: `Starting in ${hoursLabel}: ${ev.title}`,
        preview: previewParts.join(' · '),
        time: `in ${hoursLabel}`,
        unread: true,
        createdAt: new Date(now.getTime() - 30000).toISOString(),
        kind: 'saved-reminder-soon',
        linkTo: `/event/${ev.id}`,
        mapsUrl,
      });
    } else if (when >= tomorrowStart && when < tomorrowEnd) {
      // Happening tomorrow — give them a heads-up with the key details
      const previewParts = [
        ev.time || null,
        ev.venue || null,
        ev.price || null,
      ].filter(Boolean) as string[];
      msgs.push({
        id: `reminder-tomorrow-${ev.id}`,
        title: `Tomorrow: ${ev.title}`,
        preview: previewParts.length > 0 ? previewParts.join(' · ') : 'Happening tomorrow — get ready.',
        time: 'tomorrow',
        unread: true,
        // Use now - 2min so it sorts below "now/soon" reminders but above older messages
        createdAt: new Date(now.getTime() - 120000).toISOString(),
        kind: 'saved-reminder-tomorrow',
        linkTo: `/event/${ev.id}`,
      });
    } else {
      // Generic upcoming reminder — sort by imminence: 5min per day away so
      // near events appear higher than distant ones, all below "now/soon/tomorrow"
      const daysUntil = Math.max(1, Math.ceil(msUntil / 86400000));
      msgs.push({
        id: `reminder-${ev.id}`,
        title: `Reminder: ${ev.title}`,
        preview: reminderPreview(when),
        time: when.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        unread: true,
        createdAt: new Date(now.getTime() - daysUntil * 300000).toISOString(),
        kind: 'saved-reminder',
        linkTo: `/event/${ev.id}`,
      });
    }
  }
  return msgs;
}

export function useInboxMessages() {
  const [signedIn, setSignedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [signupAt, setSignupAt] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [savedEvents, setSavedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [readIds, setReadIds] = useState<Set<string>>(() =>
    typeof window === 'undefined' ? new Set() : readReadIds(),
  );

  const loadRef = useRef<() => Promise<void>>(async () => {});

  const load = useCallback(async () => {
    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) {
      setSignedIn(false);
      setUserId(null);
      setSignupAt(null);
      setSubmissions([]);
      setLoading(false);
      return;
    }
    setSignedIn(true);
    setUserId(user.id);
    setSignupAt(user.created_at || null);

    const [remoteKeys, subs] = await Promise.all([
      listReadItemKeysRemote(),
      getMySubmissions().catch(() => [] as Submission[]),
    ]);

    // ── Status-change unread tracking ──────────────────────────────────────
    // Load the last known status for each submission from localStorage.
    // If a submission's status changed to approved or rejected since we last
    // recorded it, remove all related message IDs from readIds so the new
    // message surfaces as unread. Also delete those keys from remote so
    // other devices don't pull them back as "read".
    const lastStatuses = readSubmissionStatuses();
    const currentReadIds = readReadIds();

    // Merge remote read keys into local so read state syncs across devices.
    for (const k of remoteKeys) currentReadIds.add(k);

    const newStatuses: Record<string, string> = {};
    const keysToUnread: string[] = [];

    for (const sub of subs) {
      const currentStatus = sub.status || 'pending';
      const lastStatus = lastStatuses[sub.id];
      newStatuses[sub.id] = currentStatus;

      const isTerminalChange =
        lastStatus !== undefined &&
        lastStatus !== currentStatus &&
        (currentStatus === 'approved' || currentStatus === 'rejected');

      if (isTerminalChange) {
        for (const msgId of submissionMessageIds(sub.id)) {
          if (currentReadIds.has(msgId)) {
            currentReadIds.delete(msgId);
            keysToUnread.push(msgId);
          }
        }
      }
    }

    writeSubmissionStatuses(newStatuses);
    writeReadIds(currentReadIds);
    setReadIds(new Set(currentReadIds));
    if (keysToUnread.length > 0) {
      deleteReadItemsRemote(keysToUnread).catch(() => {});
    }
    // ───────────────────────────────────────────────────────────────────────

    setSubmissions(subs);
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
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        load();
      } else {
        setSignedIn(false);
        setUserId(null);
        setSignupAt(null);
        setSubmissions([]);
        setLoading(false);
      }
    });
    load();
    return () => sub.subscription.unsubscribe();
  }, [load]);

  // Keep ref current so the realtime callback always calls the latest load
  // without needing it in the effect dependency array (which would re-subscribe
  // on every render and produce "cannot add callbacks after subscribe" errors).
  loadRef.current = load;

  useEffect(() => {
    if (!userId) return;
    // Use a unique channel name each time so Supabase never returns a stale
    // already-subscribed channel from its internal registry (which would throw
    // "cannot add postgres_changes callbacks after subscribe()").
    const channel = supabase
      .channel(`inbox-realtime-${userId}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'submissions',
          filter: `user_id=eq.${userId}`,
        },
        () => { loadRef.current(); },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_read_items',
          filter: `user_id=eq.${userId}`,
        },
        () => { loadRef.current(); },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const messages: InboxMessage[] = (() => {
    if (!signedIn) return [];
    const base: InboxMessage[] = submissions.map(submissionToMessage);
    base.push(...buildSavedReminders(savedEvents));
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
      markReadItemsRemote([id]).catch(() => {});
    },
    [readIds],
  );

  const markAllRead = useCallback(() => {
    const next = new Set(readIds);
    messages.forEach((m) => next.add(m.id));
    writeReadIds(next);
    setReadIds(next);
    markReadItemsRemote(messages.map((m) => m.id)).catch(() => {});
  }, [readIds, messages]);

  return { messages, unreadCount, loading, signedIn, refresh: load, markRead, markAllRead };
}
