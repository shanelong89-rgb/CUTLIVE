import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import { DeviceEventEmitter } from "react-native";

import { parseEventDate } from "@/lib/calendar";
import {
  deleteReadItemsRemote,
  getMySubmissions,
  listReadItemKeysRemote,
  markReadItemsRemote,
  supabase,
  type Event,
  type Submission,
} from "@/lib/supabase";

type CreditTransaction = {
  id: string;
  user_id: string;
  amount: number;
  type: "submission_approved" | "referral_bonus" | "referral_invitee_bonus" | "manual" | "redemption";
  description: string | null;
  reference_id: string | null;
  created_at: string;
};

async function getCreditTransactions(userId: string): Promise<CreditTransaction[]> {
  const { data } = await supabase
    .from("credit_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as CreditTransaction[];
}

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
    | "saved-reminder-soon"
    | "referral-joined"
    | "referral-invitee"
    | "submission-credit";
  linkTo?: string;
  mapsUrl?: string;
}

function buildCreditMessages(txs: CreditTransaction[]): InboxMessage[] {
  const msgs: InboxMessage[] = [];
  for (const tx of txs) {
    if (tx.type === "referral_bonus") {
      msgs.push({
        id: `ref-joined-${tx.id}`,
        title: "A friend joined CULTIVE",
        preview: `You earned HK$${tx.amount} credit — keep sharing to earn more.`,
        time: relativeTime(tx.created_at),
        unread: false,
        createdAt: tx.created_at,
        kind: "referral-joined",
        linkTo: "/account",
      });
    } else if (tx.type === "referral_invitee_bonus") {
      msgs.push({
        id: `ref-invitee-${tx.id}`,
        title: `Welcome bonus — HK$${tx.amount} credit added`,
        preview: "You joined via an invite. Share CULTIVE with friends to keep earning.",
        time: relativeTime(tx.created_at),
        unread: false,
        createdAt: tx.created_at,
        kind: "referral-invitee",
        linkTo: "/account",
      });
    } else if (tx.type === "submission_approved") {
      msgs.push({
        id: `sub-credit-${tx.id}`,
        title: `HK$${tx.amount} credit earned`,
        preview: "Your submitted event was published on CULTIVE. Credit added to your account.",
        time: relativeTime(tx.created_at),
        unread: false,
        createdAt: tx.created_at,
        kind: "submission-credit",
        linkTo: "/account",
      });
    }
  }
  return msgs;
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
      preview: s.published_event_id
        ? "Your event is now live on CULTIVE. Tap to view it."
        : "Your event is now live on CULTIVE. Find it on the Discover page.",
      time: relativeTime(reviewed),
      unread: false,
      createdAt: reviewed,
      kind: "submission-approved",
      linkTo: s.published_event_id ? `/event/${s.published_event_id}` : "/",
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
      linkTo: "/my-submissions",
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
    linkTo: "/my-submissions",
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
  const cutoff = new Date(todayStart.getTime() - 14 * 86400000);

  for (const ev of events) {
    const startDate = parseEventDate(ev.date, ev.time);
    if (!startDate) continue;

    // For multi-day events (exhibitions, markets, festivals) use date_end so the
    // card stays visible for the full run, not just the first 14 days after start.
    const endDate = ev.date_end ? parseEventDate(ev.date_end) : null;
    const effectiveEnd = endDate ?? startDate;

    // Skip only if the event has fully passed the 14-day lookback window
    if (effectiveEnd.getTime() < cutoff.getTime()) continue;

    const msUntil = startDate.getTime() - now.getTime();
    const hoursUntil = msUntil / 3600000;

    if (msUntil <= 0) {
      // Event has started — skip if it's already ended
      const stillOpen = !endDate || endDate.getTime() >= todayStart.getTime();
      if (!stillOpen) continue;

      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((ev.venue || "") + " Hong Kong")}`;

      if (endDate && endDate.getTime() >= tomorrowStart.getTime()) {
        // Multi-day ongoing (exhibition / market / festival still running)
        const daysLeft = Math.ceil((endDate.getTime() - todayStart.getTime()) / 86400000);
        const timeLabel = daysLeft === 1 ? "ends tomorrow" : `${daysLeft}d left`;
        const previewParts = [
          ev.time || null,   // e.g. "2–8pm, everyday"
          ev.venue || null,
          ev.price || null,
        ].filter(Boolean) as string[];
        msgs.push({
          id: `reminder-now-${ev.id}`,
          title: `On now: ${ev.title}`,
          preview: previewParts.join(" · ") || "Happening now — get there.",
          time: timeLabel,
          unread: true,
          createdAt: new Date(now.getTime() - 60000).toISOString(),
          kind: "saved-reminder-soon",
          linkTo: `/event/${ev.id}`,
          mapsUrl,
        });
      } else {
        // Single-day happening now, or last day of a multi-day event
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
      }
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
    } else if (startDate >= tomorrowStart && startDate < tomorrowEnd) {
      // Starting tomorrow — heads-up with key details + Maps shortcut
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((ev.venue || "") + " Hong Kong")}`;
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
        createdAt: new Date(now.getTime() - 120000).toISOString(),
        kind: "saved-reminder-tomorrow",
        linkTo: `/event/${ev.id}`,
        mapsUrl,
      });
    } else {
      // Generic upcoming reminder — sort by imminence
      const daysUntil = Math.max(1, Math.ceil(msUntil / 86400000));
      msgs.push({
        id: `reminder-${ev.id}`,
        title: `Reminder: ${ev.title}`,
        preview: reminderPreview(startDate),
        time: startDate.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        unread: true,
        createdAt: new Date(now.getTime() - daysUntil * 300000).toISOString(),
        kind: "saved-reminder",
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
  // Cooldown ref: suppress self-triggered reloads when we write to user_read_items
  const lastReadWriteRef = useRef(0);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [savedEvents, setSavedEvents] = useState<Event[]>([]);
  const [creditTxs, setCreditTxs] = useState<CreditTransaction[]>([]);
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
      setUserId(null);
      setSignupAt(null);
      setSubmissions([]);
      setLoading(false);
      return;
    }
    setSignedIn(true);
    setUserId(user.id);
    setSignupAt(user.created_at || null);
    const [subs, txs] = await Promise.all([
      getMySubmissions(),
      getCreditTransactions(user.id).catch(() => [] as CreditTransaction[]),
    ]);

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
    // Merge with current state so a concurrent markAllRead is never undone.
    // keysToUnread are intentionally re-removed (status-change logic).
    setReadIds((prev) => {
      const merged = new Set(currentReadIds);
      for (const k of prev) merged.add(k);
      for (const k of keysToUnread) merged.delete(k);
      return merged;
    });

    if (keysToUnread.length > 0) {
      deleteReadItemsRemote(keysToUnread).catch(() => {});
    }
    // ───────────────────────────────────────────────────────────────────────

    setSubmissions(subs);
    setCreditTxs(txs);
    try {
      const savedIds = await readSavedIds();
      if (savedIds.length > 0) {
        // Query only the IDs that still exist in the DB — validates local list
        // against the backend and naturally drops any orphaned IDs.
        const { data } = await supabase
          .from('events')
          .select('*')
          .in('id', savedIds);
        setSavedEvents((data || []) as Event[]);
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
      const { data } = await supabase
        .from('events')
        .select('*')
        .in('id', savedIds);
      setSavedEvents((data || []) as Event[]);
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
        setUserId(null);
        setSignupAt(null);
        setSubmissions([]);
        setSavedEvents([]);
        setCreditTxs([]);
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

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`inbox-realtime-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "submissions",
          filter: `user_id=eq.${userId}`,
        },
        () => { load(); },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_read_items",
          filter: `user_id=eq.${userId}`,
        },
        // Suppress the self-triggered reload from our own markRead / markAllRead upserts.
        () => { if (Date.now() - lastReadWriteRef.current < 3000) return; load(); },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "credit_transactions",
          filter: `user_id=eq.${userId}`,
        },
        () => { load(); },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, load]);

  const messages: InboxMessage[] = (() => {
    if (!signedIn) return [];
    const base: InboxMessage[] = submissions.map(submissionToMessage);
    base.push(...buildSavedReminders(savedEvents));
    base.push(...buildCreditMessages(creditTxs));
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
      lastReadWriteRef.current = Date.now();
      markReadItemsRemote([id]).catch(() => {});
    },
    [readIds, persistReadIds],
  );

  const markAllRead = useCallback(() => {
    const next = new Set(readIds);
    messages.forEach((m) => next.add(m.id));
    setReadIds(next);
    persistReadIds(next);
    lastReadWriteRef.current = Date.now();
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
