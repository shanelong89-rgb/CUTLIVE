import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { parseEventDate } from "./calendar";
import type { Event } from "./supabase";

// Show notifications when app is in foreground too
Notifications.setNotificationHandler({
  handleNotification: async () =>
    ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: true,
    }) as Notifications.NotificationBehavior,
});

async function requestPermission(): Promise<boolean> {
  if (Platform.OS !== "ios") return false;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === "granted") return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}

async function scheduleIfFuture(
  identifier: string,
  content: Notifications.NotificationContentInput,
  targetDate: Date,
): Promise<void> {
  const secondsUntil = Math.floor((targetDate.getTime() - Date.now()) / 1000);
  if (secondsUntil < 60) return; // don't bother if under a minute away
  // Cancel any existing notification with this ID first
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(
    () => {},
  );
  await Notifications.scheduleNotificationAsync({
    identifier,
    content,
    trigger: {
      seconds: secondsUntil,
      repeats: false,
    } as any,
  });
}

export async function scheduleEventNotifications(event: Event): Promise<void> {
  if (Platform.OS !== "ios") return;
  const granted = await requestPermission();
  if (!granted) return;

  const when = parseEventDate(event.date, event.time);
  if (!when) return;

  // Day-before reminder at 10am
  const dayBefore = new Date(when);
  dayBefore.setDate(dayBefore.getDate() - 1);
  dayBefore.setHours(10, 0, 0, 0);

  const detailParts = [event.time, event.venue, event.price]
    .filter(Boolean)
    .join(" · ");

  await scheduleIfFuture(
    `cultive-tomorrow-${event.id}`,
    {
      title: `Tomorrow: ${event.title}`,
      body: detailParts || "Happening tomorrow — get ready.",
      data: { eventId: event.id },
    },
    dayBefore,
  );

  // 2-hours-before reminder (only if event has a specific time)
  if (event.time) {
    const twoHoursBefore = new Date(when.getTime() - 2 * 60 * 60 * 1000);
    const soonParts = [
      event.venue,
      event.price ? `Door: ${event.price}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    await scheduleIfFuture(
      `cultive-soon-${event.id}`,
      {
        title: `Starting in 2h: ${event.title}`,
        body: soonParts || "Happening soon — don't miss it.",
        data: { eventId: event.id },
      },
      twoHoursBefore,
    );
  }
}

export async function cancelEventNotifications(eventId: string): Promise<void> {
  if (Platform.OS !== "ios") return;
  await Notifications.cancelScheduledNotificationAsync(
    `cultive-tomorrow-${eventId}`,
  ).catch(() => {});
  await Notifications.cancelScheduledNotificationAsync(
    `cultive-soon-${eventId}`,
  ).catch(() => {});
}
