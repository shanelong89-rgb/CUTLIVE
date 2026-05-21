import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { submitEvent } from "@/lib/supabase";

const CATEGORY_OPTIONS = ["Music", "Arts", "Nightlife", "Food", "Wellness"];

export default function SubmitScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const [form, setForm] = useState({
    title: "",
    category: "Music",
    price: "",
    date: "",
    time: "",
    venue: "",
    description: "",
    submitter_name: "",
    submitter_email: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const onChange = (key: keyof typeof form, value: string) =>
    setForm((p) => ({ ...p, [key]: value }));

  const onSubmit = async () => {
    if (
      !form.title ||
      !form.date ||
      !form.time ||
      !form.venue ||
      !form.description ||
      !form.submitter_name ||
      !form.submitter_email
    ) {
      Alert.alert("Missing fields", "Please complete all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      await submitEvent({
        title: form.title,
        date: form.date,
        time: form.time,
        venue: form.venue,
        category: form.category,
        price: form.price,
        description: form.description,
        image: "",
        is_exclusive: false,
        district: form.venue.split(",")[0] || "",
        submitter_name: form.submitter_name,
        submitter_email: form.submitter_email,
      });
      setSubmitted(true);
      setForm({
        title: "",
        category: "Music",
        price: "",
        date: "",
        time: "",
        venue: "",
        description: "",
        submitter_name: "",
        submitter_email: "",
      });
      setTimeout(() => setSubmitted(false), 3000);
    } catch {
      Alert.alert("Error", "Could not submit event. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const Label = ({ children }: { children: React.ReactNode }) => (
    <Text style={[styles.label, { color: colors.foreground }]}>{children}</Text>
  );

  const Input = (props: React.ComponentProps<typeof TextInput>) => (
    <TextInput
      placeholderTextColor={colors.mutedForeground}
      {...props}
      style={[
        styles.input,
        {
          borderColor: colors.border,
          color: colors.foreground,
          backgroundColor: colors.background,
        },
        props.style,
      ]}
    />
  );

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + (isWeb ? 67 : 12),
        paddingBottom: insets.bottom + (isWeb ? 84 : 120),
        paddingHorizontal: 20,
      }}
      bottomOffset={20}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, { color: colors.foreground }]}>
        Submit an Event
      </Text>
      <Text style={[styles.sub, { color: colors.mutedForeground }]}>
        Share what you know. Freelance editors get paid for approved
        submissions.
      </Text>

      {submitted ? (
        <View style={[styles.successBox, { borderColor: "#166534" }]}>
          <Feather name="check-circle" size={16} color="#166534" />
          <Text style={[styles.successText, { color: "#166534" }]}>
            Submitted! We'll review within 24 hours.
          </Text>
        </View>
      ) : null}

      <Label>Event Title *</Label>
      <Input
        value={form.title}
        onChangeText={(v) => onChange("title", v)}
        placeholder="e.g. Sunset Jazz at The Peak"
      />

      <Label>Category *</Label>
      <View style={styles.catRow}>
        {CATEGORY_OPTIONS.map((c) => {
          const active = form.category === c;
          return (
            <Pressable
              key={c}
              onPress={() => onChange("category", c)}
              style={[
                styles.catPill,
                {
                  borderColor: active ? colors.foreground : colors.border,
                  backgroundColor: active
                    ? colors.foreground
                    : "transparent",
                },
              ]}
            >
              <Text
                style={{
                  color: active ? colors.background : colors.foreground,
                  fontFamily: "Inter_500Medium",
                  fontSize: 12,
                }}
              >
                {c}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Label>Price *</Label>
      <Input
        value={form.price}
        onChangeText={(v) => onChange("price", v)}
        placeholder="e.g. Free, $100"
      />

      <Label>Date *</Label>
      <Input
        value={form.date}
        onChangeText={(v) => onChange("date", v)}
        placeholder="e.g. Sat, Jun 7"
      />

      <Label>Time *</Label>
      <Input
        value={form.time}
        onChangeText={(v) => onChange("time", v)}
        placeholder="e.g. 8:00 PM"
      />

      <Label>Venue / Location *</Label>
      <Input
        value={form.venue}
        onChangeText={(v) => onChange("venue", v)}
        placeholder="e.g. The Peninsula, Tsim Sha Tsui"
      />

      <Label>Description *</Label>
      <Input
        value={form.description}
        onChangeText={(v) => onChange("description", v)}
        placeholder="Tell us what makes this event special..."
        multiline
        numberOfLines={4}
        style={{ minHeight: 100, textAlignVertical: "top" }}
      />

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <Label>Your Name *</Label>
      <Input
        value={form.submitter_name}
        onChangeText={(v) => onChange("submitter_name", v)}
        placeholder="Jane Smith"
        autoCapitalize="words"
      />

      <Label>Your Email *</Label>
      <Input
        value={form.submitter_email}
        onChangeText={(v) => onChange("submitter_email", v)}
        placeholder="payment goes here once approved"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Pressable
        onPress={onSubmit}
        disabled={submitting}
        style={({ pressed }) => [
          styles.submitBtn,
          {
            backgroundColor: colors.foreground,
            opacity: submitting ? 0.6 : pressed ? 0.85 : 1,
          },
        ]}
      >
        {submitting ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text
            style={[styles.submitBtnText, { color: colors.background }]}
          >
            SUBMIT EVENT
          </Text>
        )}
      </Pressable>

      <Text style={[styles.footnote, { color: colors.mutedForeground }]}>
        Freelance editors earn $50 HKD per approved event submission
      </Text>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 32,
    fontFamily: "Inter_900Black",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  sub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 20,
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  catRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  divider: { height: 1, marginVertical: 24 },
  submitBtn: {
    marginTop: 28,
    paddingVertical: 16,
    borderRadius: 4,
    alignItems: "center",
  },
  submitBtnText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  footnote: {
    textAlign: "center",
    marginTop: 16,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    padding: 12,
    borderRadius: 4,
    marginBottom: 12,
    backgroundColor: "#dcfce7",
  },
  successText: { fontFamily: "Inter_500Medium", fontSize: 13 },
});
