import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { DeviceEventEmitter } from "react-native";

import { addEventToCalendar, removeEventFromCalendar } from "@/lib/calendar";
import {
  addSavedEventRemote,
  getEventById,
  listSavedEventIdsRemote,
  removeSavedEventRemote,
  supabase,
} from "@/lib/supabase";

const STORAGE_KEY = "cultive:saved-events";
const OWNER_KEY = "cultive:saved-events-owner";
const EVENT_NAME = "cultive:saved-events-changed";

async function readOwner(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
}

async function writeOwner(id: string): Promise<void> {
  try {
    await AsyncStorage.setItem(OWNER_KEY, id);
  } catch {
    // ignore
  }
}

async function read(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((x: unknown) => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

async function write(ids: string[]) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    DeviceEventEmitter.emit(EVENT_NAME);
  } catch {
    // ignore
  }
}

export function useSavedEvents() {
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function syncFromCloud(userId: string) {
      try {
        const local = await read();
        const prevOwner = await readOwner();
        const sameUser = prevOwner === userId;
        const remote = await listSavedEventIdsRemote();
        if (!active) return;

        let next: string[];
        if (sameUser) {
          const remoteSet = new Set(remote);
          next = Array.from(new Set([...remote, ...local]));
          for (const id of local) {
            if (!remoteSet.has(id)) addSavedEventRemote(id).catch(() => {});
          }
        } else {
          // Account switch / fresh sign-in: drop previous user's local cache.
          next = remote;
        }
        await writeOwner(userId);
        if (
          next.length !== local.length ||
          next.some((x, i) => x !== local[i])
        ) {
          await write(next);
          setIds(next);
        }
      } catch {
        // ignore
      }
    }

    async function clearForSignOut() {
      await writeOwner("anon");
      await write([]);
      if (active) setIds([]);
    }

    (async () => {
      const initial = await read();
      if (active) {
        setIds(initial);
        setReady(true);
      }
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) syncFromCloud(data.session.user.id);
    })();

    const sub = DeviceEventEmitter.addListener(EVENT_NAME, async () => {
      const next = await read();
      if (active) setIds(next);
    });
    const { data: authSub } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          syncFromCloud(session.user.id);
        } else if (event === "SIGNED_OUT") {
          clearForSignOut();
        }
      },
    );
    return () => {
      active = false;
      sub.remove();
      authSub.subscription.unsubscribe();
    };
  }, []);

  const isSaved = useCallback((id: string) => ids.includes(id), [ids]);

  const toggle = useCallback(
    async (id: string) => {
      const current = await read();
      const isAdding = !current.includes(id);
      const next = isAdding
        ? [id, ...current]
        : current.filter((x) => x !== id);
      await write(next);
      setIds(next);
      if (isAdding) {
        addSavedEventRemote(id).catch(() => {});
        try {
          const event = await getEventById(id);
          if (event) await addEventToCalendar(event);
        } catch {
          // ignore
        }
      } else {
        removeSavedEventRemote(id).catch(() => {});
        removeEventFromCalendar(id).catch(() => {});
      }
    },
    [],
  );

  const remove = useCallback(async (id: string) => {
    const next = (await read()).filter((x) => x !== id);
    await write(next);
    setIds(next);
    removeSavedEventRemote(id).catch(() => {});
    removeEventFromCalendar(id).catch(() => {});
  }, []);

  const clear = useCallback(async () => {
    const previous = await read();
    await write([]);
    setIds([]);
    for (const id of previous) removeSavedEventRemote(id).catch(() => {});
  }, []);

  return { ids, count: ids.length, ready, isSaved, toggle, remove, clear };
}
