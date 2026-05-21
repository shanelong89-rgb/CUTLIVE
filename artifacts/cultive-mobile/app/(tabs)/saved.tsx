import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
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
import { addEventToCalendar } from "@/lib/calendar";
import { getEvents, supabase, type Event } from "@/lib/supabase";

export default function SavedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { ids, count, remove, clear } = useSavedEvents();
  const [signedIn, setSignedIn] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSignedIn(!!data.session?.user);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session?.user);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  const [addingCalId, setAddingCalId] = useState<string | null>(null);

  const { data: allEvents = [], isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: getEvents,
  });

  const events = useMemo(() => {
    const map = new Map(allEvents.map((e) => [e.id, e] as const));
    return ids.map((id) => map.get(id)).filter((e): e is Event => !!e);
  }, [allEvents, ids]);

  async function handleAddToCalendar(item: Event) {
    setAddingCalId(item.id);
    try {
      const added = await addEventToCalendar(item);
      if (added) {
        Alert.alert("Added to Calendar", `"${item.title}" has been saved to your calendar.`);
      } else {
        Alert.alert(
          "Calendar Access Needed",
          "Please allow CULTIVE to access your calendar in Settings.",
        );
      }
    } catch {
      Alert.alert("Couldn't add to calendar", "Please try again.");
    } finally {
      setAddingCalId(null);
    }
  }

  if (signedIn === false) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[styles.header, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
          <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>SAVED</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Your List</Text>
        </View>
        <View style={styles.empty}>
          <Feather name="bookmark" size={36} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sign in to save events</Text>
          <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
            Create a free account to bookmark events and access them from any device.
          </Text>
          <Pressable
            onPress={() => router.push("/auth" as any)}
            style={[styles.cta, { backgroundColor: colors.foreground }]}
          >
            <Text style={[styles.ctaText, { color: colors.background }]}>SIGN IN / SIGN UP</Text>
          </Pressable>
        </View>
      </View>
    );
  }

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
                  {item.category} · {item.date_end ? (() => {
                    const isoS = /^(\d{4})-(\d{2})-(\d{2})$/.exec((item.date || '').trim());
                    const isoE = /^(\d{4})-(\d{2})-(\d{2})$/.exec(item.date_end.trim());
                    if (isoS && isoE) {
                      const s = new Date(+isoS[1], +isoS[2]-1, +isoS[3]);
                      const e = new Date(+isoE[1], +isoE[2]-1, +isoE[3]);
                      const mo = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                      return s.getMonth() === e.getMonth() ? `${mo[s.getMonth()]} ${s.getDate()} – ${e.getDate()}` : `${mo[s.getMonth()]} ${s.getDate()} – ${mo[e.getMonth()]} ${e.getDate()}`;
                    }
                    return item.date;
                  })() : item.date}
                </Text>
                <Text
                  style={[styles.rowVenue, { color: colors.mutedForeground }]}
                  numberOfLines={1}
                >
                  {item.venue}
                </Text>
              </View>
              <View style={styles.rowActions}>
                <Pressable
                  onPress={() => handleAddToCalendar(item)}
                  hitSlop={8}
                  style={styles.actionBtn}
                  disabled={addingCalId === item.id}
                >
                  <Feather
                    name="calendar"
                    size={16}
                    color={addingCalId === item.id ? colors.border : colors.mutedForeground}
                  />
                </Pressable>
                <Pressable
                  onPress={() => remove(item.id)}
                  hitSlop={8}
                  style={styles.actionBtn}
                >
                  <Feather name="x" size={18} color={colors.mutedForeground} />
                </Pressable>
              </View>
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
  rowActions: {
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  },
  actionBtn: {
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
