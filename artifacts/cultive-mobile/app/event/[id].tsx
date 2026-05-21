import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useSavedEvents } from "@/hooks/useSavedEvents";
import { getEventById } from "@/lib/supabase";

const HERO_H = 320;

// Only allow http(s) URLs as external ticket links — blocks javascript:/data: payloads.
function safeHttpUrl(raw: string | null | undefined): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return "";
  try {
    const u = new URL(trimmed);
    if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
  } catch {
    // not a valid URL
  }
  return "";
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isSaved, toggle } = useSavedEvents();
  const saved = id ? isSaved(String(id)) : false;

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", id],
    queryFn: () => getEventById(String(id)),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View
        style={[
          styles.center,
          { backgroundColor: colors.background, flex: 1 },
        ]}
      >
        <ActivityIndicator color={colors.foreground} />
      </View>
    );
  }

  if (!event) {
    return (
      <View
        style={[
          styles.center,
          { backgroundColor: colors.background, flex: 1, padding: 24 },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>
          Event not found
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.foreground }]}
        >
          <Text style={[styles.backBtnText, { color: colors.background }]}>
            GO BACK
          </Text>
        </Pressable>
      </View>
    );
  }

  const isExclusive = event.is_exclusive || event.isExclusive;

  const ticketUrl = safeHttpUrl(event.ticket_url);
  const hasTicketUrl = ticketUrl.length > 0;
  const isFree = /free/i.test(event.price || "");
  const isInstagramUrl = ticketUrl.includes("instagram.com");
  const externalLabel = isInstagramUrl
    ? "VIEW ON INSTAGRAM"
    : isFree
    ? "RSVP AT SOURCE"
    : "BUY TICKETS";

  const onRSVP = () => {
    if (hasTicketUrl && !isExclusive) {
      Linking.openURL(ticketUrl).catch(() =>
        Alert.alert("Couldn't open link", ticketUrl),
      );
      return;
    }
    if (isExclusive) {
      router.push("/auth" as any);
    } else {
      Alert.alert("You're on the list!", "Check your tickets tab for the QR.");
    }
  };

  const isWeb = Platform.OS === "web";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 100,
        }}
      >
        <View style={{ height: HERO_H, backgroundColor: colors.secondary }}>
          {event.image ? (
            <Image
              source={{ uri: event.image }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
          ) : null}
        </View>

        <Pressable
          onPress={() => router.back()}
          style={[
            styles.closeBtn,
            {
              top: insets.top + (isWeb ? 67 : 12),
              backgroundColor: colors.background,
              borderColor: colors.border,
            },
          ]}
          hitSlop={8}
        >
          <Feather name="chevron-left" size={20} color={colors.foreground} />
        </Pressable>

        <Pressable
          onPress={() => id && toggle(String(id))}
          style={[
            styles.closeBtn,
            {
              top: insets.top + (isWeb ? 67 : 12),
              left: undefined,
              right: 16,
              backgroundColor: saved ? colors.foreground : colors.background,
              borderColor: saved ? colors.foreground : colors.border,
            },
          ]}
          hitSlop={8}
        >
          <Feather
            name="bookmark"
            size={18}
            color={saved ? colors.background : colors.foreground}
          />
        </Pressable>

        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text
              style={[styles.category, { color: colors.mutedForeground }]}
            >
              {event.category.toUpperCase()}
            </Text>
            {isExclusive ? (
              <View
                style={[
                  styles.exclusiveBadge,
                  { backgroundColor: colors.foreground },
                ]}
              >
                <Text
                  style={[
                    styles.exclusiveText,
                    { color: colors.background },
                  ]}
                >
                  MEMBERS ONLY
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={[styles.title, { color: colors.foreground }]}>
            {event.title}
          </Text>

          <View style={[styles.meta, { borderColor: colors.border }]}>
            <MetaRow icon="calendar" text={event.date} colors={colors} />
            <MetaRow icon="clock" text={event.time} colors={colors} />
            <MetaRow
              icon="map-pin"
              text={event.venue}
              colors={colors}
              onPress={() => {
                const q = encodeURIComponent(event.venue);
                Linking.openURL(
                  `https://www.google.com/maps/search/?api=1&query=${q}`,
                ).catch(() => {});
              }}
              showChevron
            />
            <MetaRow icon="tag" text={event.price} colors={colors} />
          </View>

          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            About this event
          </Text>
          <Text
            style={[styles.body, { color: colors.mutedForeground }]}
          >
            {event.description}
          </Text>

        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: insets.bottom + 12,
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.secondaryBtn,
            {
              borderColor: colors.border,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>
            BACK
          </Text>
        </Pressable>
        <Pressable
          onPress={onRSVP}
          style={({ pressed }) => [
            styles.primaryBtn,
            {
              backgroundColor: colors.foreground,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={[styles.primaryBtnText, { color: colors.background }]}>
            {isExclusive
              ? "GET MEMBERSHIP"
              : hasTicketUrl
                ? externalLabel
                : "RSVP FREE"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function MetaRow({
  icon,
  text,
  colors,
  onPress,
  showChevron,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  text: string;
  colors: ReturnType<typeof useColors>;
  onPress?: () => void;
  showChevron?: boolean;
}) {
  const content = (
    <>
      <Feather name={icon} size={15} color={colors.foreground} />
      <Text
        style={[
          styles.metaText,
          { color: colors.foreground, flex: 1 },
          onPress ? { textDecorationLine: "underline" } : null,
        ]}
      >
        {text}
      </Text>
      {showChevron ? (
        <Feather
          name="external-link"
          size={13}
          color={colors.mutedForeground}
        />
      ) : null}
    </>
  );
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.metaRow,
          { opacity: pressed ? 0.6 : 1 },
        ]}
      >
        {content}
      </Pressable>
    );
  }
  return <View style={styles.metaRow}>{content}</View>;
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  closeBtn: {
    position: "absolute",
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { padding: 20, gap: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  category: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
  },
  exclusiveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  exclusiveText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_900Black",
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  meta: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 16,
    gap: 12,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  metaText: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: 8,
  },
  body: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  bulletRow: { flexDirection: "row", gap: 8, paddingRight: 8 },
  bulletDot: { fontSize: 18, lineHeight: 22 },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 4,
    alignItems: "center",
  },
  secondaryBtnText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  primaryBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 4,
    alignItems: "center",
  },
  primaryBtnText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  backBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 4,
  },
  backBtnText: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 2 },
});
