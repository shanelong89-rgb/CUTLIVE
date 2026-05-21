import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

export default function TicketsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const features = [
    "Reserve & pay for events in-app",
    "Members-only access to exclusive drops",
    "QR check-in at the venue",
    "Past tickets & receipts in one place",
  ];

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: insets.top + (isWeb ? 67 : 12),
        paddingBottom: insets.bottom + (isWeb ? 84 : 100),
        paddingHorizontal: 20,
      }}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>Tickets</Text>
      <Text style={[styles.sub, { color: colors.mutedForeground }]}>
        Your reservations and entry passes
      </Text>

      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card ?? colors.background,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.iconWrap}>
          <Feather name="award" size={28} color={colors.mutedForeground} />
        </View>
        <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>
          COMING SOON
        </Text>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>
          Ticketing is on the way
        </Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          Soon you'll be able to reserve spots, hold members-only passes, and
          show a QR code at the door — all from this screen.
        </Text>

        <View style={styles.featureList}>
          {features.map((f) => (
            <View key={f} style={styles.featureRow}>
              <View
                style={[styles.dot, { backgroundColor: colors.mutedForeground }]}
              />
              <Text
                style={[styles.featureText, { color: colors.foreground, flex: 1 }]}
              >
                {f}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  title: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  sub: {
    fontSize: 14,
    marginTop: 6,
    marginBottom: 28,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 24,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.04)",
    marginBottom: 18,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.4,
    fontWeight: "700",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 22,
  },
  featureList: {
    gap: 12,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  featureText: {
    fontSize: 14,
  },
});
