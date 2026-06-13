// /components/search/SmartSearchBar.tsx
//
// A smart search bar with a "Search By" dropdown pill.
// Each search key enforces its own input type constraints:
//   - name       → free text
//   - code       → auto-CAPS, max 6 chars
//   - time       → time-based (HH:MM formatted)
//   - location   → no digits allowed
//   - type       → preset enum picker (on-site, remote, hybrid)
//   - frequency  → preset enum picker (daily, weekly, etc.)

import React, { useState, useRef, useCallback } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  useColorScheme,
  Animated,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SearchKey =
  | "name"
  | "code"
  | "time"
  | "location"
  | "type"
  | "frequency";

export type SessionSetupType = "on-site" | "remote" | "hybrid";
export type FrequencyType =
  | "one-time"
  | "daily"
  | "weekly"
  | "monthly"
  | "term"
  | "custom";

interface SearchByOption {
  key: SearchKey;
  label: string;
  icon: string;
  placeholder: string;
  color: string;
}

const SEARCH_OPTIONS: SearchByOption[] = [
  {
    key: "name",
    label: "Name",
    icon: "text-outline",
    placeholder: "e.g. Math 101, CS50...",
    color: "#2563EB",
  },
  {
    key: "code",
    label: "Code",
    icon: "key-outline",
    placeholder: "6-char code (e.g. A8F9B2)",
    color: "#7C3AED",
  },
  {
    key: "time",
    label: "Time",
    icon: "time-outline",
    placeholder: "e.g. 08:00, 14:30...",
    color: "#0891B2",
  },
  {
    key: "location",
    label: "Location",
    icon: "location-outline",
    placeholder: "e.g. Room 304, Zoom...",
    color: "#059669",
  },
  {
    key: "type",
    label: "Type",
    icon: "layers-outline",
    placeholder: "Pick a session type",
    color: "#D97706",
  },
  {
    key: "frequency",
    label: "Frequency",
    icon: "repeat-outline",
    placeholder: "Pick a frequency",
    color: "#DC2626",
  },
];

const TYPE_OPTIONS: { label: string; value: SessionSetupType }[] = [
  { label: "On Site", value: "on-site" },
  { label: "Remote", value: "remote" },
  { label: "Hybrid", value: "hybrid" },
];

const FREQUENCY_OPTIONS: { label: string; value: FrequencyType }[] = [
  { label: "One-Time", value: "one-time" },
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Term", value: "term" },
  { label: "Custom", value: "custom" },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface SmartSearchBarProps {
  value: string;
  searchKey: SearchKey;
  onChangeText: (text: string) => void;
  onChangeKey: (key: SearchKey) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const SmartSearchBar: React.FC<SmartSearchBarProps> = ({
  value,
  searchKey,
  onChangeText,
  onChangeKey,
}) => {
  const isDark = useColorScheme() === "dark";
  const [showKeyPicker, setShowKeyPicker] = useState(false);
  const [showValuePicker, setShowValuePicker] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const activeOption = SEARCH_OPTIONS.find((o) => o.key === searchKey)!;
  const isPresetPicker = searchKey === "type" || searchKey === "frequency";
  const presetOptions =
    searchKey === "type"
      ? TYPE_OPTIONS
      : searchKey === "frequency"
      ? FREQUENCY_OPTIONS
      : [];

  // ── Press animation ─────────────────────────────────────────────────────────
  const pressIn = () =>
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  const pressOut = () =>
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();

  // ── Input transformation per key ────────────────────────────────────────────
  const handleChangeText = useCallback(
    (raw: string) => {
      if (searchKey === "code") {
        // Auto-CAPS, max 6 chars, alphanumeric only
        const cleaned = raw
          .replace(/[^A-Za-z0-9]/g, "")
          .toUpperCase()
          .slice(0, 6);
        onChangeText(cleaned);
      } else if (searchKey === "time") {
        // Allow only digits and colon, auto-insert colon after 2 digits
        const digits = raw.replace(/[^0-9]/g, "");
        if (digits.length <= 2) {
          onChangeText(digits);
        } else {
          onChangeText(`${digits.slice(0, 2)}:${digits.slice(2, 4)}`);
        }
      } else if (searchKey === "location") {
        // Remove any numeric-only tokens — allow place names
        const noNumbers = raw.replace(/^\d+$/, "").replace(/\s\d+\s/g, " ");
        onChangeText(raw.replace(/^[\d\s]+$/, ""));
      } else {
        onChangeText(raw);
      }
    },
    [searchKey, onChangeText]
  );

  const handleKeyChange = (key: SearchKey) => {
    onChangeKey(key);
    onChangeText(""); // clear value when switching key
    setShowKeyPicker(false);
    // auto-open value picker for preset types
    if (key === "type" || key === "frequency") {
      setTimeout(() => setShowValuePicker(true), 200);
    } else {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  };

  // ── Get display value for preset pickers ────────────────────────────────────
  const displayValue = () => {
    if (!value) return "";
    if (searchKey === "type") {
      return (
        TYPE_OPTIONS.find(
          (o) =>
            o.value === value ||
            o.value === value.toLowerCase().replace(/[\s_]/g, "-")
        )?.label ?? value
      );
    }
    if (searchKey === "frequency") {
      return (
        FREQUENCY_OPTIONS.find(
          (o) =>
            o.value === value ||
            o.value === value.toLowerCase().replace(/[\s_]/g, "-")
        )?.label ?? value
      );
    }
    return value;
  };

  return (
    <>
      <View
        style={[
          styles.container,
          isDark && styles.containerDark,
          { borderColor: value ? activeOption.color : isDark ? "#334155" : "#E2E8F0" },
        ]}
      >
        {/* ── Left: Search By pill ── */}
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            style={[
              styles.keyPill,
              { backgroundColor: activeOption.color + "18" },
            ]}
            onPress={() => setShowKeyPicker(true)}
            onPressIn={pressIn}
            onPressOut={pressOut}
            activeOpacity={0.7}
          >
            <Ionicons
              name={activeOption.icon as any}
              size={13}
              color={activeOption.color}
            />
            <Text style={[styles.keyPillText, { color: activeOption.color }]}>
              {activeOption.label}
            </Text>
            <Ionicons
              name="chevron-down"
              size={11}
              color={activeOption.color}
            />
          </TouchableOpacity>
        </Animated.View>

        {/* ── Divider ── */}
        <View
          style={[
            styles.divider,
            { backgroundColor: isDark ? "#334155" : "#E2E8F0" },
          ]}
        />

        {/* ── Input or Preset display ── */}
        {isPresetPicker ? (
          <TouchableOpacity
            style={styles.presetRow}
            onPress={() => setShowValuePicker(true)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.presetText,
                !value && styles.presetPlaceholder,
                value && { color: activeOption.color },
              ]}
            >
              {value ? displayValue() : activeOption.placeholder}
            </Text>
            <Ionicons
              name="chevron-down"
              size={16}
              color={value ? activeOption.color : "#94A3B8"}
            />
          </TouchableOpacity>
        ) : (
          <TextInput
            ref={inputRef}
            style={[styles.input, isDark && styles.inputDark]}
            placeholder={activeOption.placeholder}
            placeholderTextColor="#94A3B8"
            value={value}
            onChangeText={handleChangeText}
            autoCapitalize={searchKey === "code" ? "characters" : "none"}
            maxLength={searchKey === "code" ? 6 : searchKey === "time" ? 5 : undefined}
            keyboardType={searchKey === "time" ? "numeric" : "default"}
          />
        )}

        {/* ── Clear button ── */}
        {value.length > 0 && (
          <TouchableOpacity onPress={() => onChangeText("")} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}

        {/* ── Search icon right side ── */}
        {value.length === 0 && (
          <Ionicons name="search" size={18} color="#94A3B8" style={styles.searchIcon} />
        )}
      </View>

      {/* ── Search Key Picker Modal ── */}
      <Modal
        visible={showKeyPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowKeyPicker(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setShowKeyPicker(false)}
        >
          <View style={[styles.sheet, isDark && styles.sheetDark]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, isDark && styles.sheetTitleDark]}>
              Search By
            </Text>
            <Text style={[styles.sheetSubtitle, isDark && styles.sheetSubtitleDark]}>
              Choose what you want to search
            </Text>

            <View style={styles.optionGrid}>
              {SEARCH_OPTIONS.map((opt) => {
                const isActive = opt.key === searchKey;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.optionCard,
                      isDark && styles.optionCardDark,
                      isActive && { borderColor: opt.color, backgroundColor: opt.color + "12" },
                    ]}
                    onPress={() => handleKeyChange(opt.key)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.optionIcon,
                        { backgroundColor: opt.color + "20" },
                      ]}
                    >
                      <Ionicons
                        name={opt.icon as any}
                        size={20}
                        color={opt.color}
                      />
                    </View>
                    <Text
                      style={[
                        styles.optionLabel,
                        isDark && styles.optionLabelDark,
                        isActive && { color: opt.color, fontWeight: "800" },
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {isActive && (
                      <View style={[styles.activeCheck, { backgroundColor: opt.color }]}>
                        <Ionicons name="checkmark" size={10} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* ── Value Picker Modal (for type / frequency) ── */}
      <Modal
        visible={showValuePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowValuePicker(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setShowValuePicker(false)}
        >
          <View style={[styles.sheet, isDark && styles.sheetDark]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, isDark && styles.sheetTitleDark]}>
              {searchKey === "type" ? "Session Type" : "Frequency"}
            </Text>
            <Text style={[styles.sheetSubtitle, isDark && styles.sheetSubtitleDark]}>
              {searchKey === "type"
                ? "Filter sessions by their setup type"
                : "Filter sessions by their schedule frequency"}
            </Text>

            {presetOptions.map((opt) => {
              const normalizedValue = value.toLowerCase().replace(/[\s_]/g, "-");
              const isActive = opt.value === normalizedValue || opt.value === value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.valueRow,
                    isDark && styles.valueRowDark,
                    isActive && {
                      backgroundColor: activeOption.color + "12",
                      borderColor: activeOption.color,
                    },
                  ]}
                  onPress={() => {
                    onChangeText(opt.value);
                    setShowValuePicker(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.valueLabel,
                      isDark && styles.valueLabelDark,
                      isActive && { color: activeOption.color, fontWeight: "700" },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {isActive && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={activeOption.color}
                    />
                  )}
                </TouchableOpacity>
              );
            })}

            {value && (
              <TouchableOpacity
                style={styles.clearChoice}
                onPress={() => {
                  onChangeText("");
                  setShowValuePicker(false);
                }}
              >
                <Text style={styles.clearChoiceText}>Clear Selection</Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 10,
    marginBottom: 12,
    height: 50,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    gap: 6,
  },
  containerDark: {
    backgroundColor: "#1E293B",
  },

  keyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 100,
  },
  keyPillText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  divider: {
    width: 1,
    height: 20,
    marginHorizontal: 2,
  },

  input: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
    paddingVertical: 0,
  },
  inputDark: {
    color: "#F1F5F9",
  },

  presetRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  presetText: {
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "500",
  },
  presetPlaceholder: {
    color: "#94A3B8",
    fontWeight: "400",
  },

  clearBtn: {
    padding: 2,
  },
  searchIcon: {
    marginRight: 2,
  },

  // ── Modals ──────────────────────────────────────────────────────────────────

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 24,
    paddingTop: 12,
  },
  sheetDark: {
    backgroundColor: "#1E293B",
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  sheetTitleDark: {
    color: "#F1F5F9",
  },
  sheetSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 20,
  },
  sheetSubtitleDark: {
    color: "#94A3B8",
  },

  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  optionCard: {
    width: "30%",
    flexGrow: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    position: "relative",
  },
  optionCardDark: {
    backgroundColor: "#0F172A",
    borderColor: "#334155",
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  optionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    textAlign: "center",
  },
  optionLabelDark: {
    color: "#94A3B8",
  },
  activeCheck: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    marginBottom: 8,
  },
  valueRowDark: {
    backgroundColor: "#0F172A",
    borderColor: "#334155",
  },
  valueLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#334155",
  },
  valueLabelDark: {
    color: "#CBD5E1",
  },

  clearChoice: {
    alignItems: "center",
    paddingVertical: 14,
  },
  clearChoiceText: {
    fontSize: 14,
    color: "#94A3B8",
    fontWeight: "600",
  },
});
