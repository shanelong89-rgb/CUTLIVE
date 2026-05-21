import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useInbox } from "@/contexts/InboxContext";
import { useColors } from "@/hooks/useColors";

export default function InboxScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const {
    messages,
    unreadCount,
    loading,
    signedIn,
    refresh,
    markRead,
    markAllRead,
  } = useInbox();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + (isWeb ? 96 : 32),
        paddingBottom: insets.bottom + (isWeb ? 84 : 100),
        paddingHorizontal: 20,
      }}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={refresh} />
      }
    >
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.foreground }]}>Inbox</Text>
        {unreadCount > 0 ? (
          <View style={[styles.badge, { backgroundColor: colors.foreground }]}>
            <Text style={[styles.badgeText, { color: colors.background }]}>
              {unreadCount}
            </Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.sub, { color: colors.mutedForeground }]}>
        Updates on your submissions and CULTIVE news
      </Text>

      {signedIn && unreadCount > 0 ? (
        <Pressable onPress={markAllRead} style={styles.markAll}>
          <Text style={[styles.markAllText, { color: colors.mutedForeground }]}>
            MARK ALL AS READ
          </Text>
        </Pressable>
      ) : null}

      {!signedIn ? (
        <View style={styles.empty}>
          <Feather name="bell" size={36} color={colors.mutedForeground} />
          <Text style={{ color: colors.mutedForeground, marginTop: 12 }}>
            Sign in to see your inbox
          </Text>
          <Pressable
            onPress={() => router.push("/account" as any)}
            style={styles.ctaBtn}
          >
            <Text style={[styles.ctaText, { color: colors.foreground }]}>
              GO TO ACCOUNT →
            </Text>
          </Pressable>
        </View>
      ) : loading && messages.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ color: colors.mutedForeground }}>Loading…</Text>
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="bell" size={36} color={colors.mutedForeground} />
          <Text style={{ color: colors.mutedForeground, marginTop: 12 }}>
            No messages yet
          </Text>
          <Pressable
            onPress={() => router.push("/submit" as any)}
            style={styles.ctaBtn}
          >
            <Text style={[styles.ctaText, { color: colors.foreground }]}>
              SUBMIT AN EVENT →
            </Text>
          </Pressable>
        </View>
      ) : (
        messages.map((msg) => {
          const isSoon = msg.kind === "saved-reminder-soon";
          return (
            <Pressable
              key={msg.id}
              onPress={() => {
                markRead(msg.id);
                if (msg.linkTo) router.push(msg.linkTo as any);
              }}
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
                <View
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
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
              {isSoon && msg.mapsUrl ? (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation?.();
                    Linking.openURL(msg.mapsUrl!);
                  }}
                  style={[styles.mapsBtn, { borderColor: colors.foreground }]}
                >
                  <Feather
                    name="map-pin"
                    size={12}
                    color={colors.foreground}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[styles.mapsBtnText, { color: colors.foreground }]}
                  >
                    GET DIRECTIONS
                  </Text>
                </Pressable>
              ) : null}
            </Pressable>
          );
        })
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
    marginBottom: 12,
  },
  markAll: { marginBottom: 16 },
  markAllText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1.2,
    textDecorationLine: "underline",
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
  ctaBtn: { marginTop: 16 },
  ctaText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
  },
  mapsBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  mapsBtnText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.1,
  },
});
