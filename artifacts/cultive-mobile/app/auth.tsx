import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { useColors } from "@/hooks/useColors";
import { signIn, signUp } from "@/lib/supabase";

export default function AuthScreen() {
  const colors = useColors();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!email || !password) {
      Alert.alert("Missing fields", "Please enter email and password.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
      router.back();
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
});
