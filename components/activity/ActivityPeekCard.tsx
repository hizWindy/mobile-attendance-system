import React from "react";
import { StyleSheet, Text, View, useColorScheme } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ActivityItem } from "@/api/ActivityService";
import { ACTION_CONFIG } from "../cards/ActivityCard";

// ─── Config ───────────────────────────────────────────────────────────────────

const formatTimeOnly = (iso: string): string => {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

// ─── Component ────────────────────────────────────────────────────────────────

interface ActivityPeekCardProps {
  activity: ActivityItem;
  showSeparator: boolean;
}

export const ActivityPeekCard: React.FC<ActivityPeekCardProps> = ({
  activity,
  showSeparator,
}) => {
  const isDark = useColorScheme() === "dark";
  const cfg = ACTION_CONFIG[activity.action_type] ?? ACTION_CONFIG.create_session;

  const sessionName =
    activity.extra_data?.session_name ??
    activity.extra_data?.name ??
    "Untitled Session";
  const timeStr = formatTimeOnly(activity.created_at);

  const updatedFields = activity.extra_data?.updated_fields;
  const formattedFields = Array.isArray(updatedFields) && updatedFields.length > 0
    ? updatedFields.map((f) => f.replace(/_/g, " ")).join(", ")
    : null;

  // The bottom label text ("Checked in", "Updated: schedule", etc.)
  const actionText =
    activity.action_type === "update_session" && formattedFields
      ? `Updated: ${formattedFields}`
      : cfg.actionLabel;

  return (
    <>
      <View style={styles.card}>
        {/* Icon */}
        <View style={[styles.iconWrap, { backgroundColor: isDark ? cfg.iconBgDark : cfg.iconBg }]}>
          <MaterialCommunityIcons name={cfg.icon} size={18} color={cfg.iconColor} />
        </View>

        {/* Text block */}
        <View style={styles.textBlock}>
          {/* Top Row: Session Name + Time */}
          <View style={styles.rowTop}>
            <Text style={[styles.sessionName, isDark && styles.sessionNameDark]} numberOfLines={1}>
              {sessionName}
            </Text>
            <Text style={styles.time}>{timeStr}</Text>
          </View>

          {/* Bottom Row: Action Label */}
          <Text style={[styles.actionLabel, isDark && styles.actionLabelDark]} numberOfLines={1}>
            {actionText}
          </Text>
        </View>
      </View>

      {showSeparator && <View style={[styles.separator, isDark && styles.separatorDark]} />}
    </>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  textBlock: {
    flex: 1,
    justifyContent: "center",
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  sessionName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginRight: 8,
  },
  sessionNameDark: {
    color: "#F9FAFB",
  },
  time: {
    fontSize: 12,
    fontWeight: "500",
    color: "#9CA3AF",
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: "400",
    color: "#6B7280",
    textTransform: "capitalize",
  },
  actionLabelDark: {
    color: "#9CA3AF",
  },
  separator: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginLeft: 68, // aligns with the text block
  },
  separatorDark: {
    backgroundColor: "#1F2937",
  },
});
