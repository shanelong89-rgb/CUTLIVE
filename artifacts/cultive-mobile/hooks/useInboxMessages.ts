import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { DeviceEventEmitter } from "react-native";

import { parseEventDate } from "@/lib/calendar";
import {
  deleteReadItemsRemote,
  getEvents,
  getMySubmissions,
  listReadItemKeysRemote,
  markReadItemsRemote,
  supabase,
  type Event,
  type Submission,
} from "@/lib/supabase";

const READ_KEY = "cultive:read-messages";
const SAVED_KEY = "cultive:saved-events";
const SAVED_EVENT_NAME = "cultive:saved-events-changed";
const SUBMISSION_STATUSES_KEY = "cultive:submission-statuses";

async function readSavedIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(SAVED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((x: unknown) => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

async function readPersistedReadIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(READ_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

async function readSubmissionStatuses(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(SUBMISSION_STATUSES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, string>)
      : {};
  } catch {
    return {};
  }
}

async function writeSubmissionStatuses(
  statuses: Record<string, string>,
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      SUBMISSION_STATUSES_KEY,
      JSON.stringify(statuses),
    );
  } catch {
    // ignore
  }
}

function reminderPreview(when: Date): string {
  const diff = when.getTime() - Date.now();
  const days = Math.round(diff / 86400000);
  if (diff < 0) return "Happening now";
  if (days === 0) return "Happening today — don't miss it.";
  if (days === 1) return "Happening tomorrow — get ready.";
  if (days < 7) return `Coming up in ${days} days.`;
  return `Coming up on ${when.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}.`;
}

export interface InboxMessage {
  id: string;
  title: string;
  preview: string;
  time: string;
  unread: boolean;
  createdAt: string;
  kind:
    | "welcome"
    | "submission-pending"
    | "submission-approved"
    | "submission-rejected"
    | "saved-reminder"
    | "saved-reminder-tomorrow"
    | "saved-reminder-soon";
  linkTo?: string;
  mapsUrl?: string;
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function submissionToMessage(s: Submission): InboxMessage {
  const status = s.status || "pending";
  const reviewed = s.reviewed_at || s.created_at;
  if (status === "approved") {
    return {
      id: `sub-approved-${s.id}`,
      title: `"${s.title}" was approved`,
      preview: "Your event is now live on CULTIVE. Tap to view it.",
      time: relativeTime(reviewed),
      unread: false,
      createdAt: reviewed,
      kind: "submission-approved",
      linkTo: s.published_event_id
        ? `/event/${s.published_event_id}`
        : undefined,
    };
  }
  if (status === "rejected") {
    return {
      id: `sub-rejected-${s.id}`,
      title: `"${s.title}" wasn't approved`,
      preview:
        "Thanks for submitting — this one didn't make it through editorial review.",
      time: relativeTime(reviewed),
      unread: false,
      createdAt: reviewed,
      kind: "submission-rejected",
    };
  }
  return {
    id: `sub-pending-${s.id}`,
    title: `Submission received: "${s.title}"`,
    preview:
      "Our editors are reviewing your event. You'll hear back within a few days.",
    time: relativeTime(s.created_at),
    unread: false,
    createdAt: s.created_at,
    kind: "submission-pending",
  };
}

function submissionMessageIds(subId: string): string[] {
  return [
    `sub-pending-${subId}`,
    `sub-approved-${subId}`,
    `sub-rejected-${subId}`,
  ];
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
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((ev.venue || "") + " Hong Kong")}`;
      const previewParts = [
        ev.venue,
        ev.price ? `Door: ${ev.price}` : null,
      ].filter(Boolean) as string[];
      msgs.push({
        id: `reminder-now-${ev.id}`,
        title: `Happening now: ${ev.title}`,
        preview: previewParts.join(" · ") || "On right now — get there.",
        time: "now",
        unread: true,
        createdAt: new Date(now.getTime() - 60000).toISOString(),
        kind: "saved-reminder-soon",
        linkTo: `/event/${ev.id}`,
        mapsUrl,
      });
    } else if (hoursUntil <= 2 && ev.time) {
      // Starting within 2 hours — show Maps + door details
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((ev.venue || "") + " Hong Kong")}`;
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
        preview: previewParts.join(" · "),
        time: `in ${hoursLabel}`,
        unread: true,
        createdAt: new Date(now.getTime() - 30000).toISOString(),
        kind: "saved-reminder-soon",
        linkTo: `/event/${ev.id}`,
        mapsUrl,
      });
    } else if (when >= tomorrowStart && when < tomorrowEnd) {
      // Happening tomorrow — heads-up with key details
      const previewParts = [
        ev.time || null,
        ev.venue || null,
        ev.price || null,
      ].filter(Boolean) as string[];
      msgs.push({
        id: `reminder-tomorrow-${ev.id}`,
        title: `Tomorrow: ${ev.title}`,
        preview:
          previewParts.length > 0
            ? previewParts.join(" · ")
            : "Happening tomorrow — get ready.",
        time: "tomorrow",
        unread: true,
        createdAt: tomorrowStart.toISOString(),
        kind: "saved-reminder-tomorrow",
        linkTo: `/event/${ev.id}`,
      });
    } else {
      // Generic upcoming reminder
      msgs.push({
        id: `reminder-${ev.id}`,
        title: `Reminder: ${ev.title}`,
        preview: reminderPreview(when),
        time: when.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        unread: true,
        createdAt: when.toISOString(),
        kind: "saved-reminder",
        linkTo: `/event/${ev.id}`,
      });
    }
  }
  return msgs;
}

export function useInboxMessages() {
  const [signedIn, setSignedIn] = useState(false);
  const [signupAt, setSignupAt] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [savedEvents, setSavedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const loadReadIds = useCallback(async () => {
    const ids = await readPersistedReadIds();
    setReadIds(ids);
  }, []);

  const persistReadIds = useCallback(async (set: Set<string>) => {
    try {
      await AsyncStorage.setItem(READ_KEY, JSON.stringify(Array.from(set)));
    } catch {
      // ignore
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
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
    const subs = await getMySubmissions();

    // ── Status-change unread tracking ──────────────────────────────────────
    // Load the last known status for each submission from AsyncStorage.
    // If a submission's status changed to approved or rejected since we last
    // recorded it, remove all related message IDs from readIds so the new
    // message surfaces as unread. Persist both the updated statuses and
    // updated readIds so the unread flag survives an app restart.
    const [lastStatuses, currentReadIds, remoteReadKeys] = await Promise.all([
      readSubmissionStatuses(),
      readPersistedReadIds(),
      listReadItemKeysRemote(),
    ]);

    // Merge remote read keys into local so read state syncs across devices.
    const sizeBefore = currentReadIds.size;
    for (const k of remoteReadKeys) currentReadIds.add(k);
    const remoteAdded = currentReadIds.size > sizeBefore;

    const newStatuses: Record<string, string> = {};
    const keysToUnread: string[] = [];

    for (const sub of subs) {
      const currentStatus = sub.status || "pending";
      const lastStatus = lastStatuses[sub.id];
      newStatuses[sub.id] = currentStatus;

      const isTerminalChange =
        lastStatus !== undefined &&
        lastStatus !== currentStatus &&
        (currentStatus === "approved" || currentStatus === "rejected");

      if (isTerminalChange) {
        for (const msgId of submissionMessageIds(sub.id)) {
          if (currentReadIds.has(msgId)) {
            currentReadIds.delete(msgId);
            keysToUnread.push(msgId);
          }
        }
      }
    }

    await writeSubmissionStatuses(newStatuses);

    // Always persist and apply the final merged read state so that reads from
    // another device (remote merge) propagate even when no status change occurs.
    if (remoteAdded || keysToUnread.length > 0) {
      await AsyncStorage.setItem(
        READ_KEY,
        JSON.stringify(Array.from(currentReadIds)),
      );
    }
    setReadIds(new Set(currentReadIds));

    if (keysToUnread.length > 0) {
      deleteReadItemsRemote(keysToUnread).catch(() => {});
    }
    // ───────────────────────────────────────────────────────────────────────

    setSubmissions(subs);
    try {
      const savedIds = await readSavedIds();
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
      const savedIds = await readSavedIds();
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
    loadReadIds();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        load();
      } else {
        setSignedIn(false);
        setSignupAt(null);
        setSubmissions([]);
        setSavedEvents([]);
        setLoading(false);
      }
    });
    const sub = DeviceEventEmitter.addListener(SAVED_EVENT_NAME, () => {
      refreshSaved();
    });
    load();
    return () => {
      data.subscription.unsubscribe();
      sub.remove();
    };
  }, [load, loadReadIds, refreshSaved]);

  const messages: InboxMessage[] = (() => {
    if (!signedIn) return [];
    const base: InboxMessage[] = submissions.map(submissionToMessage);
    base.push(...buildSavedReminders(savedEvents));
    if (signupAt) {
      base.push({
        id: "welcome",
        title: "Welcome to CULTIVE",
        preview:
          "Your curated guide to Hong Kong's best events. Save what catches your eye and submit your own.",
        time: relativeTime(signupAt),
        unread: false,
        createdAt: signupAt,
        kind: "welcome",
      });
    }
    base.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return base.map((m) => ({ ...m, unread: !readIds.has(m.id) }));
  })();

  const unreadCount = messages.filter((m) => m.unread).length;

  const markRead = useCallback(
    (id: string) => {
      const next = new Set(readIds);
      next.add(id);
      setReadIds(next);
      persistReadIds(next);
      markReadItemsRemote([id]).catch(() => {});
    },
    [readIds, persistReadIds],
  );

  const markAllRead = useCallback(() => {
    const next = new Set(readIds);
    messages.forEach((m) => next.add(m.id));
    setReadIds(next);
    persistReadIds(next);
    markReadItemsRemote(messages.map((m) => m.id)).catch(() => {});
  }, [readIds, messages, persistReadIds]);

  return {
    messages,
    unreadCount,
    loading,
    signedIn,
    refresh: load,
    markRead,
    markAllRead,
  };
}
