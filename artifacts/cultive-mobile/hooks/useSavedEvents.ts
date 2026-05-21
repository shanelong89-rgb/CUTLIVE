import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { DeviceEventEmitter } from "react-native";

const STORAGE_KEY = "cultive:saved-events";
const EVENT_NAME = "cultive:saved-events-changed";

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
    (async () => {
      const initial = await read();
      if (active) {
        setIds(initial);
        setReady(true);
      }
    })();
    const sub = DeviceEventEmitter.addListener(EVENT_NAME, async () => {
      const next = await read();
      if (active) setIds(next);
    });
    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  const isSaved = useCallback((id: string) => ids.includes(id), [ids]);

  const toggle = useCallback(
    async (id: string) => {
      const current = await read();
      const next = current.includes(id)
        ? current.filter((x) => x !== id)
        : [id, ...current];
      await write(next);
      setIds(next);
    },
    [],
  );

  const remove = useCallback(async (id: string) => {
    const next = (await read()).filter((x) => x !== id);
    await write(next);
    setIds(next);
  }, []);

  const clear = useCallback(async () => {
    await write([]);
    setIds([]);
  }, []);

  return { ids, count: ids.length, ready, isSaved, toggle, remove, clear };
}
