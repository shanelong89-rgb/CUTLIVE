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
import { signOut, supabase } from "@/lib/supabase";

const MENU: { icon: React.ComponentProps<typeof Feather>["name"]; label: string }[] = [
  { icon: "user", label: "Edit Profile" },
  { icon: "award", label: "Membership" },
  { icon: "credit-card", label: "Payment Methods" },
  { icon: "file-text", label: "My Submissions" },
  { icon: "users", label: "Invite Friends" },
  { icon: "settings", label: "Settings" },
  { icon: "help-circle", label: "Help & Support" },
];

export default function AccountScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [email, setEmail] = useState<string | null>(null);

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

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + (isWeb ? 67 : 24),
        paddingBottom: insets.bottom + (isWeb ? 84 : 100),
      }}
    >
      <View style={styles.headerBlock}>
        <View
          style={[
            styles.avatar,
            { borderColor: colors.border, backgroundColor: colors.secondary },
          ]}
        >
          <Feather
            name={isLoggedIn ? "user-check" : "user"}
            size={36}
            color={colors.foreground}
          />
        </View>
        <Text style={[styles.name, { color: colors.foreground }]}>
          {isLoggedIn ? email : "Guest"}
        </Text>
        <Text style={[styles.status, { color: colors.mutedForeground }]}>
          {isLoggedIn ? "Premium Member" : "Sign in to access exclusive events"}
        </Text>

        {!isLoggedIn ? (
          <Pressable
            onPress={() => router.push("/auth" as any)}
            style={({ pressed }) => [
              styles.cta,
              {
                backgroundColor: colors.foreground,
                opacity: pressed ? 0.85 : 1,
              },
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
                borderColor: colors.border,
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

      <View
        style={[styles.menu, { borderTopColor: colors.border }]}
      >
        {MENU.map((item, i) => (
          <Pressable
            key={i}
            style={({ pressed }) => [
              styles.menuItem,
              {
                borderBottomColor: colors.border,
                opacity: pressed ? 0.6 : 1,
              },
            ]}
          >
            <Feather name={item.icon} size={18} color={colors.foreground} />
            <Text style={[styles.menuLabel, { color: colors.foreground }]}>
              {item.label}
            </Text>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </Pressable>
        ))}
      </View>

      <Text style={[styles.footer, { color: colors.mutedForeground }]}>
        CULTIVE v1.0.0 · Made in Hong Kong
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerBlock: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  name: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  status: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  cta: {
    marginTop: 24,
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 4,
  },
  ctaText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  menu: { borderTopWidth: 1 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  footer: {
    textAlign: "center",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    paddingTop: 32,
  },
});
