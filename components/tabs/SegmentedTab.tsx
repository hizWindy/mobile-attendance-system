// /components/tabs/SegmentedTab.tsx
//
// Scrollable horizontal pill-chip filter bar.
// Props are backwards-compatible with the original SegmentedTab.
// Optional `count` badge on each option for displaying item quantities.

import React, { useRef, useEffect } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";

export interface SegmentedTabOption {
  key: string;
  label: string;
  /** Optional count badge shown beside the label. */
  count?: number;
}

interface SegmentedTabProps {
  options: SegmentedTabOption[];
  activeKey: string;
  onChange: (key: string) => void;
  /**
   * Accent colour for the active chip.
   * Defaults to the app's "Trust Blue" #2563EB.
   */
  accentColor?: string;
}

export const SegmentedTab: React.FC<SegmentedTabProps> = ({
  options,
  activeKey,
  onChange,
  accentColor = "#2563EB",
}) => {
  const scrollRef = useRef<ScrollView>(null);
  const isDark = useColorScheme() === "dark";

  // Auto-scroll to the active chip whenever it changes
  const itemOffsets = useRef<Record<string, number>>({});

  const handleLayout = (key: string, x: number) => {
    itemOffsets.current[key] = x;
  };

  useEffect(() => {
    const x = itemOffsets.current[activeKey];
    if (x !== undefined && scrollRef.current) {
      scrollRef.current.scrollTo({ x: Math.max(0, x - 16), animated: true });
    }
  }, [activeKey]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.track}
      style={styles.scroll}
    >
      {options.map((option) => {
        const isActive = option.key === activeKey;
        return (
          <TouchableOpacity
            key={option.key}
            onLayout={(e) => handleLayout(option.key, e.nativeEvent.layout.x)}
            onPress={() => onChange(option.key)}
            activeOpacity={0.75}
            style={[
              styles.chip,
              isDark ? styles.chipDark : styles.chipLight,
              isActive && [
                styles.chipActive,
                { backgroundColor: accentColor, borderColor: accentColor },
              ],
            ]}
          >
            <Text
              style={[
                styles.chipText,
                isDark ? styles.chipTextDark : styles.chipTextLight,
                isActive && styles.chipTextActive,
              ]}
            >
              {option.label}
            </Text>

            {option.count !== undefined && option.count > 0 && (
              <View
                style={[
                  styles.countBadge,
                  isActive
                    ? styles.countBadgeActive
                    : isDark
                      ? styles.countBadgeDark
                      : styles.countBadgeLight,
                ]}
              >
                <Text
                  style={[
                    styles.countText,
                    isActive ? styles.countTextActive : styles.countTextInactive,
                  ]}
                >
                  {option.count > 99 ? "99+" : option.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
    marginBottom: 12,
  },
  track: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 100,
    borderWidth: 1.5,
  },
  chipLight: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },
  chipDark: {
    backgroundColor: "#1E293B",
    borderColor: "#334155",
  },
  chipActive: {
    // backgroundColor and borderColor set inline with accentColor
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },

  chipText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  chipTextLight: {
    color: "#64748B",
  },
  chipTextDark: {
    color: "#94A3B8",
  },
  chipTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  // Count badge
  countBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  countBadgeLight: {
    backgroundColor: "#E2E8F0",
  },
  countBadgeDark: {
    backgroundColor: "#334155",
  },
  countBadgeActive: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  countText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  countTextActive: {
    color: "#FFFFFF",
  },
  countTextInactive: {
    color: "#64748B",
  },
});
