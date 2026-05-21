import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { getMySubmissions, type Submission } from "@/lib/supabase";

function StatusBadge({ status }: { status?: string }) {
  const colors = useColors();
  const s = status || "pending";

  const badgeColors: Record<string, { bg: string; text: string }> = {
    pending: { bg: "#fef9c3", text: "#854d0e" },
    approved: { bg: "#dcfce7", text: "#166534" },
    rejected: { bg: "#fee2e2", text: "#991b1b" },
  };

  const { bg, text } = badgeColors[s] ?? badgeColors.pending;

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: text }]}>
        {s.toUpperCase()}
      </Text>
    </View>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function MySubmissionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const subs = await getMySubmissions();
    setSubmissions(subs);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + (isWeb ? 96 : 32),
        paddingBottom: insets.bottom + (isWeb ? 84 : 100),
        paddingHorizontal: 20,
      }}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} />
      }
    >
      <Pressable
        onPress={() => router.back()}
        style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Feather name="arrow-left" size={18} color={colors.foreground} />
        <Text style={[styles.backText, { color: colors.foreground }]}>Account</Text>
      </Pressable>

      <Text style={[styles.title, { color: colors.foreground }]}>
        My Submissions
      </Text>
      <Text style={[styles.sub, { color: colors.mutedForeground }]}>
        Events you've submitted for review
      </Text>

      {loading && submissions.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.mutedForeground} />
        </View>
      ) : submissions.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="inbox" size={36} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No submissions yet
          </Text>
          <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>
            Share what you know — approved submissions earn $50 HKD.
          </Text>
          <Pressable
            onPress={() => router.push("/(tabs)/submit" as any)}
            style={({ pressed }) => [
              styles.cta,
              { borderColor: colors.foreground, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[styles.ctaText, { color: colors.foreground }]}>
              SUBMIT AN EVENT →
            </Text>
          </Pressable>
        </View>
      ) : (
        submissions.map((sub) => (
          <View
            key={sub.id}
            style={[
              styles.card,
              { borderColor: colors.border, backgroundColor: colors.background },
            ]}
          >
            <View style={styles.cardHeader}>
              <Text
                style={[styles.cardTitle, { color: colors.foreground }]}
                numberOfLines={2}
              >
                {sub.title}
              </Text>
              <StatusBadge status={sub.status} />
            </View>
            <View style={styles.cardMeta}>
              <Text style={[styles.cardMetaText, { color: colors.mutedForeground }]}>
                {sub.date}
                {sub.venue ? ` · ${sub.venue}` : ""}
              </Text>
            </View>
            <Text style={[styles.cardDate, { color: colors.mutedForeground }]}>
              Submitted {formatDate(sub.created_at)}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 20,
  },
  backText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  title: {
    fontSize: 32,
    fontFamily: "Inter_900Black",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  sub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 24,
  },
  center: {
    paddingTop: 60,
    alignItems: "center",
  },
  empty: {
    paddingTop: 60,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    maxWidth: 260,
    lineHeight: 18,
    marginBottom: 24,
  },
  cta: {
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 4,
  },
  ctaText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  card: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 6,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 20,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: "flex-start",
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
  },
  cardMeta: {
    marginBottom: 4,
  },
  cardMetaText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  cardDate: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
});
