import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
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
import { submitEvent, supabase, uploadSubmissionImage } from "@/lib/supabase";

const CATEGORY_OPTIONS = ["Music", "Arts", "Nightlife", "Food", "Wellness", "Market", "Workshops"];

const AVAILABLE_TAGS = [
  { id: "music",      label: "Music" },
  { id: "electronic", label: "Electronic" },
  { id: "nightlife",  label: "Nightlife" },
  { id: "art",        label: "Art" },
  { id: "market",     label: "Market" },
  { id: "food",       label: "Food" },
  { id: "wellness",   label: "Wellness" },
  { id: "workshops",  label: "Workshops" },
  { id: "community",  label: "Community" },
];

export default function SubmitScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const [userDefaults, setUserDefaults] = useState({ name: "", email: "" });

  const [form, setForm] = useState({
    title: "",
    category: "Music",
    price: "",
    date: "",
    date_end: "",
    time: "",
    venue: "",
    description: "",
    ticket_url: "",
    submitter_name: "",
    submitter_email: "",
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (!user) return;
      const email = user.email ?? "";
      const name =
        (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined) ||
        email.split("@")[0];
      setUserDefaults({ name, email });
      setForm((prev) => ({
        ...prev,
        submitter_email: prev.submitter_email || email,
        submitter_name: prev.submitter_name || name,
      }));
    });
  }, []);
  const [pickedImageUri, setPickedImageUri] = useState<string | null>(null);
  const [pickedImageMime, setPickedImageMime] = useState<string>("image/jpeg");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const pickImage = async () => {
    if (Platform.OS === "web") {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]) {
        setPickedImageUri(result.assets[0].uri);
        setPickedImageMime(result.assets[0].mimeType ?? "image/jpeg");
      }
      return;
    }

    Alert.alert("Add Event Photo", "Choose a source", [
      {
        text: "Camera",
        onPress: async () => {
          const { granted } = await ImagePicker.requestCameraPermissionsAsync();
          if (!granted) {
            Alert.alert("Permission needed", "Camera access is required to take a photo.");
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 0.7,
          });
          if (!result.canceled && result.assets[0]) {
            setPickedImageUri(result.assets[0].uri);
            setPickedImageMime(result.assets[0].mimeType ?? "image/jpeg");
          }
        },
      },
      {
        text: "Photo Library",
        onPress: async () => {
          const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!granted) {
            Alert.alert("Permission needed", "Photo library access is required to select a photo.");
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            quality: 0.7,
          });
          if (!result.canceled && result.assets[0]) {
            setPickedImageUri(result.assets[0].uri);
            setPickedImageMime(result.assets[0].mimeType ?? "image/jpeg");
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const onChange = (key: keyof typeof form, value: string) =>
    setForm((p) => ({ ...p, [key]: value }));

  const onSubmit = async () => {
    if (
      !form.title ||
      !form.price ||
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
      let imageUrl = "";
      if (pickedImageUri) {
        imageUrl = await uploadSubmissionImage(pickedImageUri, pickedImageMime);
      }
      await submitEvent({
        title: form.title,
        date: form.date,
        date_end: form.date_end || null,
        time: form.time,
        venue: form.venue,
        category: form.category,
        price: form.price,
        description: form.description,
        image: imageUrl,
        is_exclusive: false,
        district: form.venue.split(",")[0] || "",
        ticket_url: form.ticket_url.trim() || null,
        tags: selectedTags,
        submitter_name: form.submitter_name,
        submitter_email: form.submitter_email,
      });
      setSubmitted(true);
      setSelectedTags([]);
      setPickedImageUri(null);
      setForm({
        title: "",
        category: "Music",
        price: "",
        date: "",
        date_end: "",
        time: "",
        venue: "",
        description: "",
        ticket_url: "",
        submitter_name: userDefaults.name,
        submitter_email: userDefaults.email,
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
        paddingTop: insets.top + (isWeb ? 96 : 32),
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

      {!userDefaults.name && (
        <>
          <Label>Your Name *</Label>
          <Input
            value={form.submitter_name}
            onChangeText={(v) => onChange("submitter_name", v)}
            placeholder="Jane Smith"
            autoCapitalize="words"
          />
        </>
      )}

      {!userDefaults.email && (
        <>
          <Label>Your Email *</Label>
          <Input
            value={form.submitter_email}
            onChangeText={(v) => onChange("submitter_email", v)}
            placeholder="we'll notify you when it's approved"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </>
      )}

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

      <Label>Tags <Text style={{ fontWeight: "400", color: colors.mutedForeground }}>(select all that apply)</Text></Label>
      <View style={styles.catRow}>
        {AVAILABLE_TAGS.map((tag) => {
          const active = selectedTags.includes(tag.id);
          return (
            <Pressable
              key={tag.id}
              onPress={() =>
                setSelectedTags((prev) =>
                  active ? prev.filter((t) => t !== tag.id) : [...prev, tag.id]
                )
              }
              style={[
                styles.catPill,
                {
                  borderColor: active ? colors.foreground : colors.border,
                  backgroundColor: active ? colors.foreground : "transparent",
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
                {tag.label}
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

      <Label>Start Date *</Label>
      <Input
        value={form.date}
        onChangeText={(v) => onChange("date", v)}
        placeholder="e.g. Sat, Jun 7"
      />

      <Label>End Date <Text style={{ fontWeight: "400", opacity: 0.6 }}>(optional, for multi-day events)</Text></Label>
      <Input
        value={form.date_end}
        onChangeText={(v) => onChange("date_end", v)}
        placeholder="e.g. Sun, Jun 27"
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

      <Label>Ticket / RSVP link (optional)</Label>
      <Input
        value={form.ticket_url}
        onChangeText={(v) => onChange("ticket_url", v)}
        placeholder="https://… leave blank to RSVP through CULTIVE"
        autoCapitalize="none"
        keyboardType="url"
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

      <Label>
        Event Photo{" "}
        <Text style={{ fontWeight: "400", color: colors.mutedForeground }}>
          (optional)
        </Text>
      </Label>
      {pickedImageUri ? (
        <View>
          <Image
            source={{ uri: pickedImageUri }}
            style={[styles.imagePreview, { borderColor: colors.border }]}
            contentFit="cover"
          />
          <Pressable
            onPress={() => setPickedImageUri(null)}
            style={[styles.removeImageBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
          >
            <Feather name="x" size={14} color={colors.foreground} />
            <Text style={[styles.removeImageText, { color: colors.foreground }]}>
              Remove
            </Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={pickImage}
          style={({ pressed }) => [
            styles.imagePicker,
            {
              borderColor: colors.border,
              backgroundColor: pressed ? colors.border : "transparent",
            },
          ]}
        >
          <Feather name="image" size={20} color={colors.mutedForeground} />
          <Text style={[styles.imagePickerText, { color: colors.mutedForeground }]}>
            Tap to add a photo
          </Text>
        </Pressable>
      )}

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

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
  imagePicker: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 4,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  imagePickerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  imagePreview: {
    width: "100%",
    height: 180,
    borderRadius: 4,
    borderWidth: 1,
  },
  removeImageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
  },
  removeImageText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
});
