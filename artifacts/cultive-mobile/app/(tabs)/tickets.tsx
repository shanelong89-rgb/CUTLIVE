import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { mockEvents } from "@/data/events";
import { useColors } from "@/hooks/useColors";

export default function TicketsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const myTickets = [
    {
      event: mockEvents[0],
      ticketId: "CULT-240520-001",
      status: "active" as const,
      qrCode:
        "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=CULT-240520-001",
    },
    {
      event: mockEvents[2],
      ticketId: "CULT-240522-002",
      status: "active" as const,
      qrCode:
        "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=CULT-240522-002",
    },
  ];

  const pastTickets = [
    {
      event: mockEvents[4],
      ticketId: "CULT-240515-003",
      status: "used" as const,
      date: "May 15, 2024",
    },
  ];

  const isWeb = Platform.OS === "web";

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: insets.top + (isWeb ? 67 : 12),
        paddingBottom: insets.bottom + (isWeb ? 84 : 100),
        paddingHorizontal: 20,
      }}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>
        My Tickets
      </Text>
      <Text style={[styles.sub, { color: colors.mutedForeground }]}>
        Show QR code at the door for entry
      </Text>

      <Text style={[styles.section, { color: colors.mutedForeground }]}>
        UPCOMING
      </Text>

      {myTickets.map((t) => (
        <View
          key={t.ticketId}
          style={[
            styles.card,
            { borderColor: colors.border, backgroundColor: colors.card },
          ]}
        >
          <View style={styles.cardHeader}>
            <Image
              source={{ uri: t.event.image }}
              style={[styles.thumb, { backgroundColor: colors.secondary }]}
              contentFit="cover"
            />
            <View style={{ flex: 1, gap: 4 }}>
              <Text
                style={[styles.ticketTitle, { color: colors.foreground }]}
                numberOfLines={2}
              >
                {t.event.title}
              </Text>
              <Text
                style={[styles.ticketMeta, { color: colors.mutedForeground }]}
              >
                {t.event.date} · {t.event.time}
              </Text>
              <Text
                style={[styles.ticketMeta, { color: colors.mutedForeground }]}
              >
                {t.event.venue}
              </Text>
              <View style={[styles.badge, { backgroundColor: "#dcfce7" }]}>
                <Feather name="check-circle" size={10} color="#166534" />
                <Text style={[styles.badgeText, { color: "#166534" }]}>
                  CONFIRMED
                </Text>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.qrZone,
              { borderTopColor: colors.border },
            ]}
          >
            <Image
              source={{ uri: t.qrCode }}
              style={styles.qr}
              contentFit="contain"
            />
            <Text
              style={[styles.ticketId, { color: colors.mutedForeground }]}
            >
              {t.ticketId}
            </Text>
          </View>
        </View>
      ))}

      <Text style={[styles.section, { color: colors.mutedForeground, marginTop: 24 }]}>
        PAST
      </Text>

      {pastTickets.map((t) => (
        <View
          key={t.ticketId}
          style={[
            styles.card,
            {
              borderColor: colors.border,
              backgroundColor: colors.card,
              opacity: 0.55,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <Image
              source={{ uri: t.event.image }}
              style={[styles.thumb, { backgroundColor: colors.secondary }]}
              contentFit="cover"
            />
            <View style={{ flex: 1, gap: 4 }}>
              <Text
                style={[styles.ticketTitle, { color: colors.foreground }]}
                numberOfLines={2}
              >
                {t.event.title}
              </Text>
              <Text
                style={[styles.ticketMeta, { color: colors.mutedForeground }]}
              >
                {t.date}
              </Text>
              <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
                <Text
                  style={[styles.badgeText, { color: colors.mutedForeground }]}
                >
                  ATTENDED
                </Text>
              </View>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
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
  section: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2,
    marginBottom: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
    overflow: "hidden",
  },
  cardHeader: { flexDirection: "row", padding: 12, gap: 12 },
  thumb: { width: 80, height: 80, borderRadius: 4 },
  ticketTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  ticketMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 4,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  qrZone: {
    alignItems: "center",
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderStyle: "dashed",
  },
  qr: { width: 160, height: 160, borderRadius: 4 },
  ticketId: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1,
    marginTop: 8,
  },
});
