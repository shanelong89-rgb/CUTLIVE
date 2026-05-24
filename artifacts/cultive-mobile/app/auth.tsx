import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { useColors } from "@/hooks/useColors";
import { signIn, signInWithGoogle, signUp, supabase } from "@/lib/supabase";
import { REMEMBER_ME_KEY } from "@/lib/utils";

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
  const colors = useColors();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const redirectTo = Linking.createURL("/");
      const data = await signInWithGoogle(redirectTo);
      if (!data?.url) throw new Error("No auth URL returned");

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type === "success" && result.url) {
        const raw = result.url.includes("#")
          ? result.url.split("#")[1]
          : result.url.split("?")[1] ?? "";
        const params = new URLSearchParams(raw);
        const code = params.get("code");
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        }

        await AsyncStorage.setItem(REMEMBER_ME_KEY, "true");
        router.replace("/(tabs)" as any);
      }
    } catch (e: any) {
      Alert.alert("Google sign-in failed", e?.message ?? "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async () => {
    if (!email || !password) {
      Alert.alert("Missing fields", "Please enter email and password.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
        await AsyncStorage.setItem(REMEMBER_ME_KEY, String(rememberMe));
      } else {
        await signUp(email, password);
        await AsyncStorage.setItem(REMEMBER_ME_KEY, "true");
      }
      router.replace("/(tabs)" as any);
    } catch (e: any) {
      Alert.alert(
        mode === "signin" ? "Sign in failed" : "Sign up failed",
        e?.message ?? "Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.root}
      bottomOffset={20}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, { color: colors.foreground }]}>
        {mode === "signin" ? "Welcome back" : "Join CULTIVE"}
      </Text>
      <Text style={[styles.sub, { color: colors.mutedForeground }]}>
        {mode === "signin"
          ? "Sign in to access exclusive events"
          : "Get access to members-only events"}
      </Text>

      <Pressable
        onPress={handleGoogleSignIn}
        disabled={loading}
        style={({ pressed }) => [
          styles.googleBtn,
          {
            borderColor: colors.border,
            backgroundColor: colors.background,
            opacity: loading ? 0.6 : pressed ? 0.8 : 1,
          },
        ]}
      >
        <View style={styles.googleIcon}>
          {/* Google G icon using colored squares approximation */}
          <Text style={styles.googleG}>G</Text>
        </View>
        <Text style={[styles.googleBtnText, { color: colors.foreground }]}>
          Continue with Google
        </Text>
      </Pressable>

      <View style={styles.dividerRow}>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>
          or continue with email
        </Text>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
      </View>

      <TextInput
        placeholder="Email"
        placeholderTextColor={colors.mutedForeground}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        style={[
          styles.input,
          {
            borderColor: colors.border,
            color: colors.foreground,
          },
        ]}
      />
      <TextInput
        placeholder="Password"
        placeholderTextColor={colors.mutedForeground}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={[
          styles.input,
          {
            borderColor: colors.border,
            color: colors.foreground,
          },
        ]}
      />

      {mode === "signin" && (
        <View style={styles.rememberRow}>
          <Text style={[styles.rememberLabel, { color: colors.mutedForeground }]}>
            Remember me
          </Text>
          <Switch
            value={rememberMe}
            onValueChange={setRememberMe}
            trackColor={{ false: colors.border, true: colors.foreground }}
            thumbColor={colors.background}
          />
        </View>
      )}

      <Pressable
        onPress={onSubmit}
        disabled={loading}
        style={({ pressed }) => [
          styles.btn,
          {
            backgroundColor: colors.foreground,
            opacity: loading ? 0.6 : pressed ? 0.85 : 1,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text style={[styles.btnText, { color: colors.background }]}>
            {mode === "signin" ? "SIGN IN" : "CREATE ACCOUNT"}
          </Text>
        )}
      </Pressable>

      <Pressable
        onPress={() => setMode(mode === "signin" ? "signup" : "signin")}
        style={({ pressed }) => ({
          paddingVertical: 12,
          alignSelf: "center",
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Text style={[styles.switchText, { color: colors.mutedForeground }]}>
          {mode === "signin"
            ? "New here? Create an account"
            : "Already have an account? Sign in"}
        </Text>
      </Pressable>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  root: { padding: 24, paddingTop: 32 },
  title: {
    fontSize: 28,
    fontFamily: "Inter_900Black",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  sub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginBottom: 12,
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    marginTop: 4,
  },
  rememberLabel: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  btn: {
    paddingVertical: 16,
    borderRadius: 4,
    alignItems: "center",
    marginTop: 12,
  },
  btnText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  switchText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginTop: 12,
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 10,
  },
  googleIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  googleG: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#4285F4",
    lineHeight: 18,
  },
  googleBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    whiteSpace: "nowrap" as any,
  },
});
