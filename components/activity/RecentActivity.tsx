import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ActivityItem } from "@/api/ActivityService";
import { ActivityPeekCard } from "./ActivityPeekCard";
import { ActivityDetailModal } from "@/components/modal/ActivityDetailModal";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getVisibleCount = (height: number): number => {
  if (height >= 900) return 4;
  if (height >= 750) return 3;
  return 2;
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface RecentActivityProps {
  activities: ActivityItem[];
  onViewAllPress: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const RecentActivity: React.FC<RecentActivityProps> = ({
  activities,
  onViewAllPress,
}) => {
  const { height } = useWindowDimensions();
  const isDark     = useColorScheme() === "dark";

  const [selectedItem, setSelectedItem]     = useState<ActivityItem | null>(null);
  const [modalVisible,  setModalVisible]    = useState(false);

  const visibleCount = getVisibleCount(height);
  const slice        = activities.slice(0, visibleCount);

  const handleCardPress = (item: ActivityItem) => {
    setSelectedItem(item);
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setTimeout(() => setSelectedItem(null), 300);
  };

  return (
    <>
      <View style={styles.wrapper}>

        {/* ── Header ────────────────────────────────────────────────────── */}
        <View style={styles.headerRow}>
          <Text style={[styles.heading, isDark && styles.headingDark]}>
            Recent Activity
          </Text>

          <Pressable
            onPress={onViewAllPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={({ pressed }) => [pressed && styles.pressed]}
          >
            <Text style={styles.viewAllText}>View All →</Text>
          </Pressable>
        </View>

        {/* ── Group container ───────────────────────────────────────────── */}
        <View style={[styles.group, isDark && styles.groupDark]}>
          {slice.length > 0 ? (
            slice.map((item, index) => (
              <Pressable
                key={item.activity_id}
                onPress={() => handleCardPress(item)}
                style={({ pressed }) => [pressed && styles.pressed]}
              >
                <ActivityPeekCard
                  activity={item}
                  showSeparator={index < slice.length - 1}
                />
              </Pressable>
            ))
          ) : (
            <View style={styles.empty}>
              <Ionicons name="folder-open-outline" size={32} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No recent activity</Text>
              <Text style={styles.emptySub}>Your actions will appear here</Text>
            </View>
          )}
        </View>

      </View>

      {/* ── Detail modal (self-contained) ──────────────────────────────── */}
      <ActivityDetailModal
        visible={modalVisible}
        activity={selectedItem}
        onClose={handleModalClose}
        onViewAll={onViewAllPress}
      />
    </>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 18,
    marginBottom: 8,
    width: "100%",
  },

  // Header
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  heading: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  headingDark: {
    color: "#F9FAFB",
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  pressed: {
    opacity: 0.6,
  },

  // Single group container
  group: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  groupDark: {
    backgroundColor: "#1E293B",
    shadowOpacity: 0,
    elevation: 0,
  },

  // Empty state
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 8,
  },
  emptySub: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
  },
});
