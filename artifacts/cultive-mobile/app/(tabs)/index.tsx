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

import { categories } from "@/data/events";
import { useColors } from "@/hooks/useColors";
import { getEvents, type Event } from "@/lib/supabase";

const dateFilters = [
  { id: "all", label: "All Dates" },
  { id: "today", label: "Today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "weekend", label: "Weekend" },
  { id: "week", label: "This Week" },
];

function filterByDate(events: Event[], dateFilter: string): Event[] {
  if (dateFilter === "all") return events;
  return events.filter((event) => {
    const d = event.date.toLowerCase();
    switch (dateFilter) {
      case "today":
        return d.includes("today");
      case "tomorrow":
        return d.includes("tomorrow");
      case "weekend":
        return d.includes("sat") || d.includes("sun");
      case "week":
        return (
          d.includes("today") ||
          d.includes("tomorrow") ||
          d.includes("thu") ||
          d.includes("fri") ||
          d.includes("sat") ||
          d.includes("sun")
        );
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
  return [...list]
    .map((e) => {
      const parsed = parseEventDate(e.date, e.time);
      return {
        e,
        parsed,
        isPast: parsed ? parsed.getTime() < todayStart.getTime() : false,
      };
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
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeDate, setActiveDate] = useState("all");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: getEvents,
  });

  const filtered = useMemo(() => {
    let list = events;
    if (activeCategory !== "All") {
      if (activeCategory === "Exclusive") {
        list = events.filter((e) => e.is_exclusive || e.isExclusive);
      } else {
        list = events.filter((e) => e.category === activeCategory);
      }
    }
    return sortUpcomingFirst(filterByDate(list, activeDate));
  }, [events, activeCategory, activeDate]);

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
              {categories.map((cat) => {
                const active = activeCategory === cat;
                return (
                  <Pressable
                    key={cat}
                    onPress={() => setActiveCategory(cat)}
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
                      {cat}
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
                {activeCategory === "All" ? "All Events" : activeCategory}
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
