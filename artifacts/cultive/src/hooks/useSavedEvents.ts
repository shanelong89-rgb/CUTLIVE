import { useCallback, useEffect, useState } from 'react';
import {
  addSavedEventRemote,
  listSavedEventIdsRemote,
  removeSavedEventRemote,
  supabase,
} from '../lib/supabase';

const STORAGE_KEY = 'cultive:saved-events';
const OWNER_KEY = 'cultive:saved-events-owner'; // last signed-in user id (or 'anon')
const EVENT_NAME = 'cultive:saved-events-changed';

function read(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch {
    // ignore quota / private mode errors
  }
}

function readOwner(): string | null {
  try {
    return localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
}

function writeOwner(id: string) {
  try {
    localStorage.setItem(OWNER_KEY, id);
  } catch {
    // ignore
  }
}

export function useSavedEvents() {
  const [ids, setIds] = useState<string[]>(() =>
    typeof window === 'undefined' ? [] : read()
  );

  useEffect(() => {
    const sync = () => setIds(read());
    window.addEventListener(EVENT_NAME, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT_NAME, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  // Keep local cache aligned with the signed-in account.
  // - Same user as last time → merge local + remote (resyncs across devices).
  // - Different user (account switch) → REPLACE local with remote, do not
  //   push the previous user's local saves up to this account.
  // - Sign out → clear local cache and owner marker.
  useEffect(() => {
    let cancelled = false;

    async function syncFromCloud(userId: string) {
      try {
        const local = read();
        const prevOwner = readOwner();
        const sameUser = prevOwner === userId;
        const remote = await listSavedEventIdsRemote();
        if (cancelled) return;

        let next: string[];
        if (sameUser) {
          // Trusted local cache — merge both directions (local additions
          // made while offline get pushed up).
          const remoteSet = new Set(remote);
          next = Array.from(new Set([...remote, ...local]));
          for (const id of local) {
            if (!remoteSet.has(id)) addSavedEventRemote(id).catch(() => {});
          }
        } else {
          // Account switch (or fresh sign-in on this device). Discard
          // whatever was cached locally — it belonged to another account.
          next = remote;
        }
        writeOwner(userId);
        const changed =
          next.length !== local.length ||
          next.some((x, i) => x !== local[i]);
        if (changed) {
          write(next);
          setIds(next);
        }
      } catch {
        // ignore
      }
    }

    function clearForSignOut() {
      writeOwner('anon');
      write([]);
      setIds([]);
    }

    // Run once on mount in case session is already restored.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) syncFromCloud(data.session.user.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        syncFromCloud(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        clearForSignOut();
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const isSaved = useCallback((id: string) => ids.includes(id), [ids]);

  const toggle = useCallback((id: string) => {
    const current = read();
    const isAdding = !current.includes(id);
    const next = isAdding
      ? [id, ...current]
      : current.filter((x) => x !== id);
    write(next);
    setIds(next);
    if (isAdding) {
      addSavedEventRemote(id).catch(() => {});
    } else {
      removeSavedEventRemote(id).catch(() => {});
    }
  }, []);

  const remove = useCallback((id: string) => {
    const next = read().filter((x) => x !== id);
    write(next);
    setIds(next);
    removeSavedEventRemote(id).catch(() => {});
  }, []);

  const clear = useCallback(() => {
    const previous = read();
    write([]);
    setIds([]);
    for (const id of previous) removeSavedEventRemote(id).catch(() => {});
  }, []);

  return { ids, count: ids.length, isSaved, toggle, remove, clear };
}
