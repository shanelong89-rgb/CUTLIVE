import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { supabase } from "@/lib/supabase";

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const bg = isDark ? "#000000" : "#030213";
  const fg = "#ffffff";
  const muted = "rgba(255,255,255,0.45)";

  const cultiveOpacity = useRef(new Animated.Value(0)).current;
  const chineseOpacity = useRef(new Animated.Value(0)).current;
  const ruleOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  const [destination, setDestination] = useState<"/(tabs)" | "/auth" | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setDestination(data.session?.user ? "/(tabs)" : "/auth");
    });
  }, []);

  useEffect(() => {
    if (destination === null) return;

    Animated.sequence([
      // strobe: flash 1 on
      Animated.timing(cultiveOpacity, {
        toValue: 1,
        duration: 60,
        useNativeDriver: true,
      }),
      // strobe: flash 1 off
      Animated.timing(cultiveOpacity, {
        toValue: 0,
        duration: 80,
        useNativeDriver: true,
      }),
      // strobe: flash 2 on
      Animated.timing(cultiveOpacity, {
        toValue: 1,
        duration: 50,
        useNativeDriver: true,
      }),
      // strobe: flash 2 off
      Animated.timing(cultiveOpacity, {
        toValue: 0,
        duration: 60,
        useNativeDriver: true,
      }),
      // strobe: flash 3 on — stays
      Animated.timing(cultiveOpacity, {
        toValue: 1,
        duration: 60,
        useNativeDriver: true,
      }),
      // rule fades in right after
      Animated.timing(ruleOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      // chinese + tagline come in together
      Animated.parallel([
        Animated.timing(chineseOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      // hold
      Animated.delay(destination === "/auth" ? 900 : 600),
      // fade out
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start(() => {
      router.replace(destination as any);
    });
  }, [destination]);

  return (
    <Animated.View style={[styles.root, { backgroundColor: bg, opacity: screenOpacity }]}>
      <View style={[styles.center, { paddingBottom: insets.bottom + 40 }]}>
        <Animated.Text
          style={[styles.cultive, { color: fg, opacity: cultiveOpacity }]}
        >
          CULTIVE
        </Animated.Text>

        <Animated.View
          style={[styles.rule, { backgroundColor: fg, opacity: ruleOpacity }]}
        />

        <Animated.Text
          style={[styles.chinese, { color: fg, opacity: chineseOpacity }]}
        >
          文化活
        </Animated.Text>

        <Animated.Text
          style={[styles.tagline, { color: muted, opacity: taglineOpacity }]}
        >
          Hong Kong's curated cultural events
        </Animated.Text>
      </View>

      <Animated.Text
        style={[styles.footer, { color: muted, opacity: taglineOpacity, bottom: insets.bottom + 28 }]}
      >
        MADE IN HONG KONG
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    alignItems: "center",
    gap: 0,
  },
  cultive: {
    fontSize: 56,
    fontFamily: "Inter_900Black",
    letterSpacing: -2,
    lineHeight: 60,
  },
  rule: {
    width: 40,
    height: 1,
    marginTop: 18,
    marginBottom: 14,
  },
  chinese: {
    fontSize: 18,
    fontFamily: "Inter_500Medium",
    letterSpacing: 6,
    marginBottom: 16,
  },
  tagline: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  footer: {
    position: "absolute",
    fontSize: 9,
    fontFamily: "Inter_500Medium",
    letterSpacing: 3,
  },
});
