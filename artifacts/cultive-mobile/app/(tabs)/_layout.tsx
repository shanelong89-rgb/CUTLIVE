import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useInboxMessages } from "@/hooks/useInboxMessages";

function NativeTabLayout({ unreadCount }: { unreadCount: number }) {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "newspaper", selected: "newspaper.fill" }} />
        <Label>Discover</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="tickets">
        <Icon sf={{ default: "ticket", selected: "ticket.fill" }} />
        <Label>Tickets</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="saved">
        <Icon sf={{ default: "bookmark", selected: "bookmark.fill" }} />
        <Label>Saved</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="inbox">
        <Icon sf={{ default: "envelope", selected: "envelope.fill" }} />
        <Label>{unreadCount > 0 ? `Inbox (${unreadCount > 9 ? "9+" : unreadCount})` : "Inbox"}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="account">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>Account</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout({ unreadCount }: { unreadCount: number }) {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  const icon = (
    name: React.ComponentProps<typeof Feather>["name"],
    sf: string,
    color: string,
  ) =>
    isIOS ? (
      <SymbolView name={sf as any} tintColor={color} size={24} />
    ) : (
      <Feather name={name} size={22} color={color} />
    );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.background },
              ]}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Discover",
          tabBarIcon: ({ color }) => icon("book-open", "newspaper", color),
        }}
      />
      <Tabs.Screen
        name="tickets"
        options={{
          title: "Tickets",
          tabBarIcon: ({ color }) => icon("award", "ticket", color),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: "Saved",
          tabBarIcon: ({ color }) => icon("bookmark", "bookmark", color),
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: "Inbox",
          tabBarIcon: ({ color }) => icon("mail", "envelope", color),
          tabBarBadge: unreadCount > 0 ? (unreadCount > 9 ? "9+" : unreadCount) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.foreground,
            color: colors.background,
            fontSize: 10,
            fontFamily: "Inter_700Bold",
            minWidth: 16,
            height: 16,
            lineHeight: 16,
          },
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ color }) => icon("user", "person", color),
        }}
      />
      {/* Submit tab hidden from bar but keeps its route accessible */}
      <Tabs.Screen
        name="submit"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const { unreadCount } = useInboxMessages();

  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout unreadCount={unreadCount} />;
  }
  return <ClassicTabLayout unreadCount={unreadCount} />;
}
