import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_900Black,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { InboxProvider } from "@/contexts/InboxContext";
import { registerAndStorePushToken } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";
import { REMEMBER_ME_KEY } from "@/lib/utils";

SplashScreen.preventAutoHideAsync();

// staleTime: 5 min — events fetched within the last 5 minutes are served
// from React Query's in-memory cache without hitting Supabase. Discover and
// Saved share the same ['events'] query key so they always reuse the same data.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
    },
  },
});

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="event/[id]"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="auth"
        options={{ presentation: "modal", title: "Sign In" }}
      />
      <Stack.Screen
        name="my-submissions"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="admin"
        options={{ headerShown: false, presentation: "card" }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_900Black,
  });

  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    // Sign out when app backgrounds if the user chose not to be remembered
    const appStateSub = AppState.addEventListener("change", async (state) => {
      if (state === "background" || state === "inactive") {
        try {
          const val = await AsyncStorage.getItem(REMEMBER_ME_KEY);
          if (val === "false") {
            await supabase.auth.signOut();
          }
        } catch { /* ignore */ }
      }
    });

    // Register push token when user signs in
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user?.email) {
          registerAndStorePushToken(session.user.email).catch(() => {});
        }
      },
    );

    // Navigate to inbox when user taps a submission-status notification
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as
          | Record<string, unknown>
          | undefined;
        if (data?.screen === "inbox") {
          router.push("/(tabs)/inbox" as any);
        }
      });

    return () => {
      appStateSub.remove();
      authListener.subscription.unsubscribe();
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
      // Skip the welcome animation for returning signed-in users — go straight to tabs.
      // Only show the welcome screen (with sign-in prompt) to unauthenticated users.
      supabase.auth.getSession().then(({ data }) => {
        if (data.session?.user) {
          router.replace("/(tabs)" as any);
        } else {
          router.replace("/welcome" as any);
        }
      });
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView>
            <KeyboardProvider>
              <InboxProvider>
                <RootLayoutNav />
              </InboxProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
