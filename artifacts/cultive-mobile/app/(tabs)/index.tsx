import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AVAILABLE_TAGS } from "@/data/events";
import { useColors } from "@/hooks/useColors";
import { getEvents, type Event } from "@/lib/supabase";

const dateFilters = [
  { id: "all", label: "All Dates" },
  { id: "today", label: "Today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "weekend", label: "Weekend" },
  { id: "week", label: "This Week" },
];

function parseAllEventDates(raw: string, keepPast = false): Date[] {
  if (!raw) return [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const s = raw.trim();

  if (s.toLowerCase().includes("today")) return [new Date(today)];
  if (s.toLowerCase().includes("tomorrow"))
    return [new Date(today.getTime() + 86400000)];

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return isNaN(d.getTime()) ? [] : [d];
  }

  const segments = s.split(/\s*&\s*|\s+and\s+/i);
  const results: Date[] = [];
  let lastMonth: number | null = null;

  const maybeRoll = (d: Date) => {
    if (!keepPast && d.getTime() < today.getTime() - 86400000)
      d.setFullYear(now.getFullYear() + 1);
    return d;
  };

  for (const seg of segments) {
    const t = seg.trim();

    // Range "Month D1-D2" — e.g. "May 8-27" or "May 8 - 27, 2026"
    const rangeA = t.match(/\b([A-Za-z]{3,})\s+(\d{1,2})\s*-\s*(\d{1,2})\b/);
    if (rangeA) {
      const yr = t.match(/\b(20\d{2})\b/)?.[1] ?? String(now.getFullYear());
      const start = new Date(`${rangeA[1]} ${rangeA[2]}, ${yr}`);
      const end   = new Date(`${rangeA[1]} ${rangeA[3]}, ${yr}`);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        if (!keepPast && end.getTime() < today.getTime() - 86400000) {
          start.setFullYear(Number(yr) + 1);
          end.setFullYear(Number(yr) + 1);
        }
        lastMonth = start.getMonth();
        results.push(start, end);
        continue;
      }
    }

    // Range "D1-D2 Month" — e.g. "8-27 May"
    const rangeB = t.match(/\b(\d{1,2})\s*-\s*(\d{1,2})\s+([A-Za-z]{3,})\b/);
    if (rangeB) {
      const yr = t.match(/\b(20\d{2})\b/)?.[1] ?? String(now.getFullYear());
      const start = new Date(`${rangeB[3]} ${rangeB[1]}, ${yr}`);
      const end   = new Date(`${rangeB[3]} ${rangeB[2]}, ${yr}`);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        if (!keepPast && end.getTime() < today.getTime() - 86400000) {
          start.setFullYear(Number(yr) + 1);
          end.setFullYear(Number(yr) + 1);
        }
        lastMonth = start.getMonth();
        results.push(start, end);
        continue;
      }
    }

    // "Month Day" — e.g. "May 23" or "Sat, May 23"
    const mDay = t.match(/\b([A-Za-z]{3,})\s+(\d{1,2})\b/);
    if (mDay) {
      const guess = new Date(`${mDay[1]} ${mDay[2]}, ${now.getFullYear()}`);
      if (!isNaN(guess.getTime())) {
        lastMonth = guess.getMonth();
        results.push(maybeRoll(guess));
        continue;
      }
    }

    // "Day Month" — e.g. "28 May" or "Thu 28 May"
    const dMonth = t.match(/\b(\d{1,2})\s+([A-Za-z]{3,})\b/);
    if (dMonth) {
      const guess = new Date(`${dMonth[2]} ${dMonth[1]}, ${now.getFullYear()}`);
      if (!isNaN(guess.getTime())) {
        lastMonth = guess.getMonth();
        results.push(maybeRoll(guess));
        continue;
      }
    }

    // Bare day number — reuse last seen month
    const bareDay = t.match(/\b(\d{1,2})\b/);
    if (bareDay && lastMonth !== null) {
      const day = parseInt(bareDay[1], 10);
      if (day >= 1 && day <= 31) {
        const d = new Date(now.getFullYear(), lastMonth, day);
        if (!isNaN(d.getTime())) { results.push(maybeRoll(d)); continue; }
      }
    }

    const direct = new Date(t);
    if (!isNaN(direct.getTime())) results.push(direct);
  }
  return results;
}

function filterByDate(events: Event[], dateFilter: string): Event[] {
  if (dateFilter === "all") return events;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);

  const dayOfWeek = todayStart.getDay();
  const daysUntilEndOfWeek = 7 - dayOfWeek;
  const weekEnd = new Date(todayStart.getTime() + daysUntilEndOfWeek * 86400000);

  const daysUntilSat = (6 - dayOfWeek + 7) % 7 || 7;
  const weekendStart =
    dayOfWeek === 6
      ? todayStart
      : dayOfWeek === 0
      ? todayStart
      : new Date(todayStart.getTime() + daysUntilSat * 86400000);
  const weekendEnd = new Date(
    weekendStart.getTime() + (dayOfWeek === 0 ? 1 : 2) * 86400000
  );

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return events.filter((event) => {
    const dates = parseAllEventDates(event.date);
    if (dates.length === 0) return false;

    const inRange = (start: Date, end: Date) =>
      dates.some((d) => d.getTime() >= start.getTime() && d.getTime() < end.getTime());

    switch (dateFilter) {
      case "today":
        return inRange(todayStart, todayEnd);
      case "tomorrow":
        return inRange(todayEnd, new Date(todayEnd.getTime() + 86400000));
      case "weekend":
        return inRange(weekendStart, weekendEnd);
      case "week":
        return inRange(todayStart, weekEnd);
      case "month": {
        const allDates = parseAllEventDates(event.date, true);
        return allDates.some(
          (d) => d.getTime() >= monthStart.getTime() && d.getTime() < monthEnd.getTime()
        );
      }
      default:
        return true;
    }
  });
}

function parseEventDate(raw: string, timeStr?: string): Date | null {
  if (!raw) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const s = raw.trim().toLowerCase();
  let base: Date | null = null;
  if (s.includes("today")) base = new Date(today);
  else if (s.includes("tomorrow"))
    base = new Date(today.getTime() + 86400000);
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

function sortUpcomingFirst(list: Event[]): Event[] {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayTs = todayStart.getTime();
  return [...list]
    .map((e) => {
      const all = parseAllEventDates(e.date, true);
      if (all.length === 0) return { e, parsed: null as Date | null, isPast: false };
      const minDate = all.reduce((a, b) => (a.getTime() < b.getTime() ? a : b));
      const maxDate = all.reduce((a, b) => (a.getTime() > b.getTime() ? a : b));
      const isOngoing = minDate.getTime() < todayTs && maxDate.getTime() >= todayTs;
      if (isOngoing) return { e, parsed: minDate as Date | null, isPast: false };
      const upcoming = all.filter((d) => d.getTime() >= todayTs);
      if (upcoming.length > 0) {
        const parsed = upcoming.reduce((a, b) => (a.getTime() < b.getTime() ? a : b));
        return { e, parsed: parsed as Date | null, isPast: false };
      }
      return { e, parsed: maxDate as Date | null, isPast: true };
    })
    .sort((a, b) => {
      if (a.isPast !== b.isPast) return a.isPast ? 1 : -1;
      if (a.parsed && b.parsed) return a.parsed.getTime() - b.parsed.getTime();
      if (a.parsed) return -1;
      if (b.parsed) return 1;
      return 0;
    })
    .map((d) => d.e);
}

function getIssueDate(): string {
  const now = new Date();
  const m = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${m[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
}

export default function DiscoverScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [activeDate, setActiveDate] = useState("all");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: getEvents,
  });

  const toggleTag = (id: string) =>
    setActiveTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );

  const filtered = useMemo(() => {
    let list = events;
    if (activeTags.length > 0) {
      list = events.filter((e) => {
        if (e.tags && e.tags.length > 0) {
          return e.tags.some((t) => activeTags.includes(t));
        }
        return activeTags.includes((e.category ?? "").toLowerCase());
      });
    }
    return sortUpcomingFirst(filterByDate(list, activeDate));
  }, [events, activeTags, activeDate]);

  const isWeb = Platform.OS === "web";
  const webBottomPad = isWeb ? 84 : 100;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingTop: insets.top + (isWeb ? 67 : 0),
          paddingBottom: insets.bottom + webBottomPad,
        }}
        ListHeaderComponent={
          <View>
            <View style={styles.masthead}>
              <Text style={[styles.mastDate, { color: colors.mutedForeground }]}>
                {getIssueDate().toUpperCase()}
              </Text>
              <View
                style={[styles.divider, { backgroundColor: colors.foreground }]}
              />
              <Text style={[styles.mastTitle, { color: colors.foreground }]}>
                What's On
              </Text>
              <Text
                style={[styles.mastSub, { color: colors.mutedForeground }]}
              >
                Hong Kong's curated events. What's worth leaving the house for.
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {dateFilters.map((f) => {
                const active = activeDate === f.id;
                return (
                  <Pressable
                    key={f.id}
                    onPress={() => setActiveDate(f.id)}
                    style={[
                      styles.chip,
                      {
                        borderColor: active ? colors.foreground : colors.border,
                        backgroundColor: active
                          ? colors.foreground
                          : "transparent",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color: active
                            ? colors.background
                            : colors.foreground,
                        },
                      ]}
                    >
                      {f.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.chipRow, { paddingBottom: 16 }]}
            >
              {/* All resets selection */}
              <Pressable
                key="all"
                onPress={() => setActiveTags([])}
                style={[
                  styles.catChip,
                  {
                    borderBottomColor:
                      activeTags.length === 0
                        ? colors.foreground
                        : "transparent",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.catChipText,
                    {
                      color:
                        activeTags.length === 0
                          ? colors.foreground
                          : colors.mutedForeground,
                      fontFamily:
                        activeTags.length === 0
                          ? "Inter_700Bold"
                          : "Inter_500Medium",
                    },
                  ]}
                >
                  All
                </Text>
              </Pressable>
              {AVAILABLE_TAGS.map((tag) => {
                const active = activeTags.includes(tag.id);
                return (
                  <Pressable
                    key={tag.id}
                    onPress={() => toggleTag(tag.id)}
                    style={[
                      styles.catChip,
                      {
                        borderBottomColor: active
                          ? colors.foreground
                          : "transparent",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        {
                          color: active
                            ? colors.foreground
                            : colors.mutedForeground,
                          fontFamily: active
                            ? "Inter_700Bold"
                            : "Inter_500Medium",
                        },
                      ]}
                    >
                      {tag.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View
              style={[
                styles.sectionHeader,
                { borderTopColor: colors.foreground, borderBottomColor: colors.border },
              ]}
            >
              <Text
                style={[styles.sectionLabel, { color: colors.foreground }]}
              >
                {activeTags.length === 0 ? "All Events" : activeTags.map(t => AVAILABLE_TAGS.find(a => a.id === t)?.label ?? t).join(", ")}
              </Text>
              <Text
                style={[styles.sectionLabel, { color: colors.mutedForeground }]}
              >
                {isLoading ? "…" : `${filtered.length} events`}
              </Text>
            </View>
          </View>
        }
        renderItem={({ item }) => <EventRow event={item} colors={colors} />}
        ItemSeparatorComponent={() => (
          <View style={[styles.sep, { backgroundColor: colors.border }]} />
        )}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.empty}>
              <ActivityIndicator color={colors.foreground} />
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={{ color: colors.mutedForeground }}>
                No events found for this filter.
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

function EventRow({
  event,
  colors,
}: {
  event: Event;
  colors: ReturnType<typeof useColors>;
}) {
  const isExclusive = event.is_exclusive || event.isExclusive;
  const district = event.district || event.venue.split(",")[0] || "";
  return (
    <Pressable
      onPress={() => router.push(`/event/${event.id}` as any)}
      style={({ pressed }) => [
        styles.row,
        { opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <View style={styles.timeCol}>
        <Text style={[styles.timeText, { color: colors.foreground }]}>
          {event.time || "—"}
        </Text>
      </View>
      <View
        style={[styles.thumb, { backgroundColor: colors.secondary }]}
      >
        {event.image ? (
          <Image
            source={{ uri: event.image }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
        ) : null}
      </View>
      <View style={styles.detailsCol}>
        <Text
          style={[styles.rowTitle, { color: colors.foreground }]}
          numberOfLines={2}
        >
          {event.title}
        </Text>
        <Text
          style={[styles.rowMeta, { color: colors.mutedForeground }]}
          numberOfLines={1}
        >
          {event.category}
          {district ? ` · ${district}` : ""}
          {isExclusive ? " · Members" : ""}
        </Text>
        <Text
          style={[styles.rowVenue, { color: colors.mutedForeground }]}
          numberOfLines={1}
        >
          {event.venue}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  masthead: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },
  mastDate: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2,
  },
  divider: { height: 1, marginVertical: 12 },
  mastTitle: {
    fontSize: 42,
    fontFamily: "Inter_900Black",
    letterSpacing: -1,
    marginBottom: 8,
  },
  mastSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  chipRow: { paddingHorizontal: 20, gap: 8, paddingVertical: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  catChip: {
    paddingHorizontal: 4,
    paddingVertical: 8,
    marginHorizontal: 6,
    borderBottomWidth: 2,
  },
  catChipText: {
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 2,
    borderBottomWidth: 1,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  timeCol: { width: 56 },
  timeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 4,
    overflow: "hidden",
  },
  detailsCol: { flex: 1, gap: 4 },
  rowTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    lineHeight: 20,
  },
  rowMeta: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  rowVenue: { fontSize: 12, fontFamily: "Inter_400Regular" },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 20 },
  empty: { padding: 48, alignItems: "center" },
});
