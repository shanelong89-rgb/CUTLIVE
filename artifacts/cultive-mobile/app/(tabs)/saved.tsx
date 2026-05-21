import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useSavedEvents } from "@/hooks/useSavedEvents";
import { getEvents, type Event } from "@/lib/supabase";

export default function SavedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { ids, count, remove, clear } = useSavedEvents();

  const { data: allEvents = [], isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: getEvents,
  });

  const events = useMemo(() => {
    const map = new Map(allEvents.map((e) => [e.id, e] as const));
    return ids.map((id) => map.get(id)).filter((e): e is Event => !!e);
  }, [allEvents, ids]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 16,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>
          SAVED
        </Text>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Your List
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Events you've bookmarked, pinned for later.
        </Text>
        <View style={styles.metaRow}>
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            {isLoading ? "Loading…" : `${count} saved`}
          </Text>
          {count > 0 && (
            <Pressable
              onPress={() =>
                Alert.alert("Clear saved?", "This removes every saved event.", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Clear", style: "destructive", onPress: () => clear() },
                ])
              }
            >
              <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                Clear all
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.foreground} />
        </View>
      ) : events.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="bookmark" size={36} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            No bookmarks yet
          </Text>
          <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
            Tap the bookmark on any event to pin it here.
          </Text>
          <Pressable
            onPress={() => router.push("/" as any)}
            style={[styles.cta, { backgroundColor: colors.foreground }]}
          >
            <Text style={[styles.ctaText, { color: colors.background }]}>
              BROWSE EVENTS
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          ItemSeparatorComponent={() => (
            <View style={[styles.sep, { backgroundColor: colors.border }]} />
          )}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/event/${item.id}` as any)}
              style={({ pressed }) => [
                styles.row,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View
                style={[styles.thumb, { backgroundColor: colors.secondary }]}
              >
                {item.image ? (
                  <Image
                    source={{ uri: item.image }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                  />
                ) : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.rowTitle, { color: colors.foreground }]}
                  numberOfLines={2}
                >
                  {item.title}
                </Text>
                <Text
                  style={[styles.rowMeta, { color: colors.mutedForeground }]}
                  numberOfLines={1}
                >
                  {item.category} · {item.date}
                </Text>
                <Text
                  style={[styles.rowVenue, { color: colors.mutedForeground }]}
                  numberOfLines={1}
                >
                  {item.venue}
                </Text>
              </View>
              <Pressable
                onPress={() => remove(item.id)}
                hitSlop={10}
                style={styles.removeBtn}
              >
                <Feather name="x" size={18} color={colors.mutedForeground} />
              </Pressable>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    gap: 6,
  },
  eyebrow: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 3,
  },
  title: {
    fontSize: 32,
    fontFamily: "Inter_900Black",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  meta: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 4,
    overflow: "hidden",
  },
  rowTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  rowMeta: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    marginBottom: 2,
  },
  rowVenue: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  removeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  sep: { height: 1, marginHorizontal: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: "Inter_900Black",
    letterSpacing: -0.4,
    marginTop: 12,
  },
  emptyBody: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 280,
  },
  cta: {
    marginTop: 16,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 4,
  },
  ctaText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 2 },
});
