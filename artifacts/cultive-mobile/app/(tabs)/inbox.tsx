import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

interface Message {
  id: number;
  title: string;
  preview: string;
  time: string;
  unread: boolean;
}

const INITIAL: Message[] = [
  {
    id: 1,
    title: "Welcome to CULTIVE",
    preview:
      "Your curated guide to Hong Kong's best events starts now...",
    time: "2h ago",
    unread: true,
  },
  {
    id: 2,
    title: "Your Jazz Night RSVP confirmed",
    preview:
      "Show your QR code at The Peninsula entrance. See you there!",
    time: "1d ago",
    unread: false,
  },
  {
    id: 3,
    title: "New exclusive: Hidden Speakeasy Tour",
    preview:
      "Members-only access to 4 secret bars in Central. Limited spots...",
    time: "2d ago",
    unread: false,
  },
  {
    id: 4,
    title: "Payment received: $50 HKD",
    preview:
      "Thanks for submitting 'Street Art Workshop' — it's now live!",
    time: "3d ago",
    unread: false,
  },
];

export default function InboxScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [messages, setMessages] = useState(INITIAL);
  const unread = messages.filter((m) => m.unread).length;

  const markRead = (id: number) =>
    setMessages((p) =>
      p.map((m) => (m.id === id ? { ...m, unread: false } : m)),
    );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + (isWeb ? 67 : 12),
        paddingBottom: insets.bottom + (isWeb ? 84 : 100),
        paddingHorizontal: 20,
      }}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Inbox
        </Text>
        {unread > 0 ? (
          <View style={[styles.badge, { backgroundColor: colors.foreground }]}>
            <Text style={[styles.badgeText, { color: colors.background }]}>
              {unread}
            </Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.sub, { color: colors.mutedForeground }]}>
        Updates, confirmations, and exclusive invites
      </Text>

      {messages.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="bell" size={36} color={colors.mutedForeground} />
          <Text style={{ color: colors.mutedForeground, marginTop: 12 }}>
            No messages yet
          </Text>
        </View>
      ) : (
        messages.map((msg) => (
          <Pressable
            key={msg.id}
            onPress={() => markRead(msg.id)}
            style={({ pressed }) => [
              styles.msgCard,
              {
                borderColor: colors.border,
                backgroundColor: msg.unread
                  ? colors.secondary
                  : colors.background,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <View style={styles.msgHeader}>
              <View style={{ flex: 1, flexDirection: "row", gap: 8, alignItems: "center" }}>
                {msg.unread ? (
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: colors.foreground },
                    ]}
                  />
                ) : null}
                <Text
                  style={[
                    styles.msgTitle,
                    {
                      color: colors.foreground,
                      fontFamily: msg.unread
                        ? "Inter_700Bold"
                        : "Inter_500Medium",
                    },
                  ]}
                  numberOfLines={1}
                >
                  {msg.title}
                </Text>
              </View>
              <Text
                style={[styles.msgTime, { color: colors.mutedForeground }]}
              >
                {msg.time}
              </Text>
            </View>
            <Text
              style={[styles.msgPreview, { color: colors.mutedForeground }]}
              numberOfLines={2}
            >
              {msg.preview}
            </Text>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: {
    fontSize: 32,
    fontFamily: "Inter_900Black",
    letterSpacing: -0.5,
  },
  badge: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  sub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
    marginBottom: 20,
  },
  msgCard: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 14,
    marginBottom: 10,
  },
  msgHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 12,
  },
  msgTitle: { fontSize: 14, flex: 1 },
  msgTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  msgPreview: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  empty: { padding: 48, alignItems: "center" },
});
