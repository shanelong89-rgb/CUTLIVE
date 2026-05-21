import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useInboxMessages } from "@/hooks/useInboxMessages";
import { signOut, supabase } from "@/lib/supabase";

const ADMIN_EMAILS = ["shanelong@gmail.com"];

const MENU_ITEMS: { label: string; route?: string }[] = [
  { label: "Edit Profile" },
  { label: "Membership" },
  { label: "Payment Methods" },
  { label: "My Submissions" },
  { label: "Invite Friends" },
  { label: "Settings" },
  { label: "Help & Support" },
];

export default function AccountScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [email, setEmail] = useState<string | null>(null);
  const { unreadCount } = useInboxMessages();

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setEmail(data.session?.user.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user.email ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (e: any) {
      Alert.alert("Sign out failed", e?.message ?? "Try again.");
    }
  };

  const isLoggedIn = !!email;
  const isAdmin = !!email && ADMIN_EMAILS.includes(email.toLowerCase());
  const initial = (isLoggedIn ? email!.trim().charAt(0) : "G").toUpperCase();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + (isWeb ? 67 : 24),
        paddingBottom: insets.bottom + (isWeb ? 84 : 100),
      }}
    >
      <View style={styles.kicker}>
        <Text style={[styles.kickerText, { color: colors.mutedForeground }]}>
          MEMBER · NO. {isLoggedIn ? "001" : "000"}
        </Text>
      </View>

      <View style={styles.headerBlock}>
        <View
          style={[
            styles.avatar,
            { borderColor: colors.foreground, backgroundColor: colors.background },
          ]}
        >
          <Text style={[styles.avatarInitial, { color: colors.foreground }]}>
            {initial}
          </Text>
        </View>
        <Text style={[styles.name, { color: colors.foreground }]}>
          {isLoggedIn ? email : "Guest"}
        </Text>
        <View style={[styles.statusRule, { backgroundColor: colors.foreground }]} />
        <Text style={[styles.status, { color: colors.mutedForeground }]}>
          {isLoggedIn ? "PREMIUM MEMBER" : "SIGN IN TO ACCESS EXCLUSIVE EVENTS"}
        </Text>

        {!isLoggedIn ? (
          <Pressable
            onPress={() => router.push("/auth" as any)}
            style={({ pressed }) => [
              styles.cta,
              { backgroundColor: colors.foreground, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={[styles.ctaText, { color: colors.background }]}>
              SIGN IN / SIGN UP
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleSignOut}
            style={({ pressed }) => [
              styles.cta,
              {
                backgroundColor: "transparent",
                borderWidth: 1,
                borderColor: colors.foreground,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Text style={[styles.ctaText, { color: colors.foreground }]}>
              SIGN OUT
            </Text>
          </Pressable>
        )}
      </View>

      <View style={styles.sectionLabelRow}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          INDEX
        </Text>
        <View style={[styles.sectionLabelRule, { backgroundColor: colors.border }]} />
      </View>

      <View style={[styles.menu, { borderTopColor: colors.border }]}>
        {/* Inbox row — shows unread badge */}
        <Pressable
          onPress={() => router.push("/(tabs)/inbox" as any)}
          style={({ pressed }) => [
            styles.menuItem,
            { borderBottomColor: colors.border, opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Text style={[styles.menuIndex, { color: colors.mutedForeground }]}>00</Text>
          <Text style={[styles.menuLabel, { color: colors.foreground }]}>Inbox</Text>
          {unreadCount > 0 && (
            <View style={[styles.inboxBadge, { backgroundColor: colors.foreground }]}>
              <Text style={[styles.inboxBadgeText, { color: colors.background }]}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </Text>
            </View>
          )}
          <Text style={[styles.menuArrow, { color: colors.foreground }]}>—</Text>
        </Pressable>

        {/* Submit Event (non-admin) or Admin Console (admin) */}
        {isAdmin ? (
          <Pressable
            onPress={() => router.push("/admin" as any)}
            style={({ pressed }) => [
              styles.menuItem,
              { borderBottomColor: colors.border, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Text style={[styles.menuIndex, { color: colors.mutedForeground }]}>—</Text>
            <Text style={[styles.menuLabel, { color: colors.foreground }]}>
              Admin Console
            </Text>
            <Text style={[styles.menuArrow, { color: colors.foreground }]}>—</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => router.push("/(tabs)/submit" as any)}
            style={({ pressed }) => [
              styles.menuItem,
              { borderBottomColor: colors.border, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Text style={[styles.menuIndex, { color: colors.mutedForeground }]}>—</Text>
            <Text style={[styles.menuLabel, { color: colors.foreground }]}>
              Submit Event
            </Text>
            <Text style={[styles.menuArrow, { color: colors.foreground }]}>—</Text>
          </Pressable>
        )}

        {/* Regular menu items */}
        {MENU_ITEMS.map((item, i) => (
          <Pressable
            key={i}
            style={({ pressed }) => [
              styles.menuItem,
              { borderBottomColor: colors.border, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Text style={[styles.menuIndex, { color: colors.mutedForeground }]}>
              {String(i + 1).padStart(2, "0")}
            </Text>
            <Text style={[styles.menuLabel, { color: colors.foreground }]}>
              {item.label}
            </Text>
            <Text style={[styles.menuArrow, { color: colors.foreground }]}>—</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.footer, { color: colors.mutedForeground }]}>
        CULTIVE · V1.0.0 · MADE IN HONG KONG
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  kicker: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    alignItems: "center",
  },
  kickerText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    letterSpacing: 2.5,
  },
  headerBlock: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  avatarInitial: {
    fontSize: 38,
    fontFamily: "Inter_900Black",
    letterSpacing: -1,
  },
  name: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    marginBottom: 12,
    textAlign: "center",
  },
  statusRule: {
    width: 24,
    height: 1,
    marginBottom: 12,
  },
  status: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    letterSpacing: 2,
  },
  cta: {
    marginTop: 28,
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 2,
  },
  ctaText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2.5,
  },
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2.5,
  },
  sectionLabelRule: {
    flex: 1,
    height: 1,
  },
  menu: { borderTopWidth: 1 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuIndex: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1.5,
    width: 22,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  menuArrow: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  inboxBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  inboxBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0,
  },
  footer: {
    textAlign: "center",
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    letterSpacing: 2,
    paddingTop: 36,
  },
});
