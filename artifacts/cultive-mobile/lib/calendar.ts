import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Calendar from "expo-calendar";
import { Platform } from "react-native";

import type { Event } from "./supabase";

const CAL_IDS_KEY = "cultive:saved-events-cal-ids";

type CalIdMap = Record<string, string>;

async function readMap(): Promise<CalIdMap> {
  try {
    const raw = await AsyncStorage.getItem(CAL_IDS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeMap(map: CalIdMap) {
  try {
    await AsyncStorage.setItem(CAL_IDS_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function parseEventDate(raw: string, timeStr?: string): Date | null {
  if (!raw) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const s = raw.trim().toLowerCase();
  let base: Date | null = null;

  if (s.includes("today")) {
    base = new Date(today);
  } else if (s.includes("tomorrow")) {
    base = new Date(today.getTime() + 86400000);
  } else {
    // Extract explicit year if present, e.g. "2026" in "May 8-27, 2026"
    const yearMatch = raw.match(/\b(20\d{2})\b/);
    const explicitYear = yearMatch ? parseInt(yearMatch[1], 10) : null;

    if (explicitYear) {
      // String contains a year — bypass new Date(raw) because V8 misparses range
      // strings like "May 8-27, 2026" as 2027. Trust the extracted year.
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
  } else {
    base.setHours(19, 0, 0, 0);
  }
  return base;
}

async function getDefaultCalendarId(): Promise<string | null> {
  try {
    if (Platform.OS === "ios") {
      const def = await Calendar.getDefaultCalendarAsync();
      if (def?.id) return def.id;
    }
    const calendars = await Calendar.getCalendarsAsync(
      Calendar.EntityTypes.EVENT,
    );
    const writable = calendars.find(
      (c) => c.allowsModifications && c.source && c.source.name,
    );
    return writable?.id || calendars[0]?.id || null;
  } catch {
    return null;
  }
}

export async function addEventToCalendar(event: Event): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== "granted") return false;
    const startDate = parseEventDate(event.date, event.time);
    if (!startDate) return false;
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
    const calendarId = await getDefaultCalendarId();
    if (!calendarId) return false;
    const calEventId = await Calendar.createEventAsync(calendarId, {
      title: event.title,
      startDate,
      endDate,
      location: event.venue,
      notes: event.description,
      alarms: [{ relativeOffset: -60 }],
    });
    const map = await readMap();
    map[event.id] = calEventId;
    await writeMap(map);
    return true;
  } catch {
    return false;
  }
}

export async function removeEventFromCalendar(eventId: string): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const map = await readMap();
    const calEventId = map[eventId];
    if (!calEventId) return;
    try {
      await Calendar.deleteEventAsync(calEventId);
    } catch {
      // event may have been deleted by user manually
    }
    delete map[eventId];
    await writeMap(map);
  } catch {
    // ignore
  }
}
