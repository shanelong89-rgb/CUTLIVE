import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

import {
  getCurrentUser,
  getMySubmissions,
  supabase,
  type Submission,
} from "@/lib/supabase";

const READ_KEY = "cultive:read-messages";

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
    | "submission-rejected";
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
      preview:
        "Your event is now live on CULTIVE. Tap to see it on the discover page.",
      time: relativeTime(reviewed),
      unread: false,
      createdAt: reviewed,
      kind: "submission-approved",
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

export function useInboxMessages() {
  const [signedIn, setSignedIn] = useState(false);
  const [signupAt, setSignupAt] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const loadReadIds = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(READ_KEY);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) setReadIds(new Set(arr));
    } catch {
      // ignore
    }
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
    setSubmissions(subs);
    setLoading(false);
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
        setLoading(false);
      }
    });
    load();
    return () => data.subscription.unsubscribe();
  }, [load, loadReadIds]);

  const messages: InboxMessage[] = (() => {
    if (!signedIn) return [];
    const base: InboxMessage[] = submissions.map(submissionToMessage);
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
    },
    [readIds, persistReadIds],
  );

  const markAllRead = useCallback(() => {
    const next = new Set(readIds);
    messages.forEach((m) => next.add(m.id));
    setReadIds(next);
    persistReadIds(next);
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
