import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import {
  adminListSubmissions,
  approveSubmission,
  rejectSubmission,
  type Submission,
} from "@/lib/supabase";

type Filter = "all" | "pending" | "approved" | "rejected";

const FILTER_OPTIONS: { label: string; value: Filter }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: "#fef9c3", text: "#854d0e" },
  approved: { bg: "#dcfce7", text: "#166534" },
  rejected: { bg: "#fee2e2", text: "#991b1b" },
};

function StatusBadge({ status }: { status?: string }) {
  const s = status || "pending";
  const { bg, text } = STATUS_COLORS[s] ?? STATUS_COLORS.pending;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: text }]}>{s.toUpperCase()}</Text>
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

export default function AdminScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("pending");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await adminListSubmissions();
    setSubmissions(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = (sub: Submission) => {
    Alert.alert(
      "Approve Submission",
      `Approve "${sub.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: async () => {
            setActionLoading(sub.id);
            try {
              await approveSubmission(sub.id);
              setSubmissions((prev) =>
                prev.map((s) =>
                  s.id === sub.id ? { ...s, status: "approved" } : s,
                ),
              );
            } catch {
              Alert.alert("Error", "Could not approve submission.");
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
    );
  };

  const handleReject = (sub: Submission) => {
    Alert.alert(
      "Reject Submission",
      `Reject "${sub.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            setActionLoading(sub.id);
            try {
              await rejectSubmission(sub.id);
              setSubmissions((prev) =>
                prev.map((s) =>
                  s.id === sub.id ? { ...s, status: "rejected" } : s,
                ),
              );
            } catch {
              Alert.alert("Error", "Could not reject submission.");
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
    );
  };

  const filtered =
    filter === "all"
      ? submissions
      : submissions.filter((s) => (s.status || "pending") === filter);

  const pendingCount = submissions.filter(
    (s) => !s.status || s.status === "pending",
  ).length;

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
        style={({ pressed }) => [
          styles.backBtn,
          { opacity: pressed ? 0.6 : 1 },
        ]}
      >
        <Feather name="arrow-left" size={18} color={colors.foreground} />
        <Text style={[styles.backText, { color: colors.foreground }]}>
          Account
        </Text>
      </Pressable>

      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Admin
        </Text>
        {pendingCount > 0 && (
          <View
            style={[
              styles.pendingBadge,
              { backgroundColor: colors.foreground },
            ]}
          >
            <Text
              style={[styles.pendingBadgeText, { color: colors.background }]}
            >
              {pendingCount} pending
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.sub, { color: colors.mutedForeground }]}>
        Review and manage event submissions
      </Text>

      <View style={styles.filterRow}>
        {FILTER_OPTIONS.map((opt) => {
          const active = filter === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => setFilter(opt.value)}
              style={[
                styles.filterPill,
                {
                  borderColor: active ? colors.foreground : colors.border,
                  backgroundColor: active ? colors.foreground : "transparent",
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_500Medium",
                  color: active ? colors.background : colors.foreground,
                }}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading && submissions.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.mutedForeground} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="inbox" size={36} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {filter === "pending"
              ? "No pending submissions"
              : `No ${filter} submissions`}
          </Text>
        </View>
      ) : (
        filtered.map((sub) => (
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

            <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>
              {[sub.date, sub.venue].filter(Boolean).join(" · ")}
            </Text>
            {sub.category ? (
              <Text
                style={[styles.cardCategory, { color: colors.mutedForeground }]}
              >
                {sub.category.toUpperCase()}
                {sub.price ? ` · ${sub.price}` : ""}
              </Text>
            ) : null}
            {sub.description ? (
              <Text
                style={[styles.cardDesc, { color: colors.mutedForeground }]}
                numberOfLines={3}
              >
                {sub.description}
              </Text>
            ) : null}

            <View style={styles.cardFooter}>
              <Text
                style={[styles.submittedBy, { color: colors.mutedForeground }]}
              >
                {sub.submitter_name || sub.submitter_email || "Anonymous"} ·{" "}
                {formatDate(sub.created_at)}
              </Text>
            </View>

            {(!sub.status || sub.status === "pending") && (
              <View style={styles.actionRow}>
                {actionLoading === sub.id ? (
                  <ActivityIndicator
                    color={colors.mutedForeground}
                    style={{ marginTop: 12 }}
                  />
                ) : (
                  <>
                    <Pressable
                      onPress={() => handleReject(sub)}
                      style={({ pressed }) => [
                        styles.rejectBtn,
                        {
                          borderColor: colors.border,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.rejectBtnText,
                          { color: colors.foreground },
                        ]}
                      >
                        REJECT
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleApprove(sub)}
                      style={({ pressed }) => [
                        styles.approveBtn,
                        {
                          backgroundColor: colors.foreground,
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.approveBtnText,
                          { color: colors.background },
                        ]}
                      >
                        APPROVE
                      </Text>
                    </Pressable>
                  </>
                )}
              </View>
            )}
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
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 6,
  },
  title: {
    fontSize: 32,
    fontFamily: "Inter_900Black",
    letterSpacing: -0.5,
  },
  pendingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  sub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 20,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  center: {
    paddingTop: 60,
    alignItems: "center",
  },
  empty: {
    paddingTop: 60,
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  card: {
    borderWidth: 1,
    borderRadius: 8,
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
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 2,
  },
  cardCategory: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    marginTop: 4,
  },
  cardFooter: {
    marginTop: 8,
  },
  submittedBy: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  rejectBtn: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: "center",
  },
  rejectBtnText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  approveBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: "center",
  },
  approveBtnText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
});
