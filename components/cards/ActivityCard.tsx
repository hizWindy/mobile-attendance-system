import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ActivityItem, ActionType } from "@/api/ActivityService";

// ─── Config ──────────────────────────────────────────────────────────────────

export interface ActionConfig {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  iconColor: string;
  iconBg: string;
  iconBgDark: string;
  actionLabel: string;
  verb: string;
}

export const ACTION_CONFIG: Record<ActionType, ActionConfig> = {
  delete_session:  { icon: "trash-can-outline",   iconColor: "#EF4444", iconBg: "#FEE2E2", iconBgDark: "rgba(239,68,68,0.2)",   actionLabel: "Deleted session",  verb: "Deleted Session"  },
  create_session:  { icon: "calendar-plus",        iconColor: "#3B82F6", iconBg: "#DBEAFE", iconBgDark: "rgba(59,130,246,0.2)",  actionLabel: "Created session",  verb: "Created Session"  },
  join_session:    { icon: "account-plus-outline", iconColor: "#8B5CF6", iconBg: "#EDE9FE", iconBgDark: "rgba(139,92,246,0.2)", actionLabel: "Joined session",   verb: "Joined Session"   },
  check_in:        { icon: "login",                iconColor: "#22C55E", iconBg: "#DCFCE7", iconBgDark: "rgba(34,197,94,0.2)",  actionLabel: "Checked in to",    verb: "Checked In"       },
  check_out:       { icon: "logout",               iconColor: "#F97316", iconBg: "#FFEDD5", iconBgDark: "rgba(249,115,22,0.2)", actionLabel: "Checked out of",   verb: "Checked Out"      },
  update_session:  { icon: "pencil-outline",       iconColor: "#EAB308", iconBg: "#FEF9C3", iconBgDark: "rgba(234,179,8,0.2)",  actionLabel: "Updated session",  verb: "Updated Session"  },
};

export const formatTimestamp = (iso: string): string => {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
  );
};

const getLocationLabel = (extra?: Record<string, any> | null): string | null => {
  if (!extra) return null;
  const map: Record<string, string> = { on_site: "On Site", remote: "Remote", hybrid: "Hybrid" };
  return (
    extra.location ??
    extra.address ??
    extra.venue ??
    (extra.setup_type ? (map[extra.setup_type] ?? extra.setup_type) : null)
  );
};

// ─── Card ─────────────────────────────────────────────────────────────────────

interface ActivityCardProps {
  activity: ActivityItem;
  onPress: (activity: ActivityItem) => void;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({ activity, onPress }) => {
  const isDark = useColorScheme() === "dark";
  const cfg = ACTION_CONFIG[activity.action_type] ?? ACTION_CONFIG.create_session;

  const sessionName =
    activity.extra_data?.session_name ??
    activity.extra_data?.name ??
    "Untitled Session";
  const location = getLocationLabel(activity.extra_data);

  const updatedFields = activity.extra_data?.updated_fields;
  const formattedFields = Array.isArray(updatedFields) && updatedFields.length > 0
    ? updatedFields.map((f: string) => f.charAt(0).toUpperCase() + f.slice(1).replace(/_/g, " ")).join(", ")
    : null;

  return (
    <View style={[styles.card, isDark ? styles.cardDark : styles.cardLight]}>
      {/* Left accent bar */}
      <View style={[styles.accentBar, { backgroundColor: cfg.iconColor }]} />

      {/* Horizontal row: icon + content + view button */}
      <View style={styles.row}>

        {/* Icon */}
        <View style={[styles.iconWrap, { backgroundColor: isDark ? cfg.iconBgDark : cfg.iconBg }]}>
          <MaterialCommunityIcons name={cfg.icon} size={22} color={cfg.iconColor} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Meta row: date + location */}
          <View style={styles.metaRow}>
            <MaterialCommunityIcons name="clock-outline" size={11} color="#9CA3AF" style={styles.metaIcon} />
            <Text style={styles.date} numberOfLines={1}>
              {formatTimestamp(activity.created_at)}
            </Text>
            {location != null && (
              <>
                <Text style={styles.metaDot}>·</Text>
                <MaterialCommunityIcons name="map-marker-outline" size={11} color="#9CA3AF" />
                <Text style={styles.locationText} numberOfLines={1}>
                  {location}
                </Text>
              </>
            )}
          </View>

          {/* Action sentence */}
          <View style={styles.actionRow}>
            <Text style={[styles.actionLabel, isDark && styles.actionLabelDark]}>
              {activity.action_type === "update_session" && formattedFields
                ? `Updated ${formattedFields} in `
                : `${cfg.actionLabel} `}
            </Text>
            <Text
              style={[styles.sessionName, { color: cfg.iconColor }]}
              numberOfLines={2}
            >
              {sessionName}
            </Text>
          </View>
        </View>

        {/* View button */}
        <TouchableOpacity
          onPress={() => onPress(activity)}
          style={[styles.viewBtn, { borderColor: cfg.iconColor + "33" }]}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.viewBtnText, { color: cfg.iconColor }]}>View</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export const ActivityCardSkeleton: React.FC = () => {
  const isDark = useColorScheme() === "dark";
  const b1 = isDark ? "#1F2937" : "#E5E7EB";
  const b2 = isDark ? "#374151" : "#F3F4F6";
  return (
    <View style={[styles.card, isDark ? styles.cardDark : styles.cardLight]}>
      <View style={[styles.accentBar, { backgroundColor: b2 }]} />
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: b2 }]} />
        <View style={styles.content}>
          <View style={[styles.skel, { width: 150, backgroundColor: b1, marginBottom: 8 }]} />
          <View style={[styles.skel, { width: "70%", height: 14, backgroundColor: b1 }]} />
        </View>
        <View style={[styles.skel, { width: 44, height: 28, borderRadius: 8, backgroundColor: b2 }]} />
      </View>
    </View>
  );
};

// ─── Separator ────────────────────────────────────────────────────────────────

export const CardSeparator: React.FC<{ isDark?: boolean }> = ({ isDark }) => (
  <View style={[styles.separator, isDark && styles.separatorDark]} />
);

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",   // accent bar + inner row side by side
    marginHorizontal: 16,
    marginVertical: 5,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  cardLight: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  cardDark: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1F2937",
    shadowOpacity: 0.25,
  },

  // Left accent bar
  accentBar: {
    width: 4,
    alignSelf: "stretch",
  },

  // Horizontal row (icon, content, view btn)
  row: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },

  // Icon
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  // Content block
  content: {
    flex: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
    flexWrap: "nowrap",
  },
  metaIcon: {
    marginRight: 4,
  },
  metaDot: {
    fontSize: 11,
    color: "#9CA3AF",
    marginHorizontal: 4,
  },
  date: {
    fontSize: 12,
    fontWeight: "400",
    color: "#9CA3AF",
    flexShrink: 1,
  },
  locationText: {
    fontSize: 11,
    color: "#9CA3AF",
    marginLeft: 2,
    maxWidth: 70,
    flexShrink: 1,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "400",
    color: "#6B7280",
    lineHeight: 20,
  },
  actionLabelDark: {
    color: "#9CA3AF",
  },
  sessionName: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    flexShrink: 1,
  },

  // View button
  viewBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1.5,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  viewBtnText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // Separator
  separator: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginHorizontal: 16,
  },
  separatorDark: {
    backgroundColor: "#1F2937",
  },

  skel: { height: 11, borderRadius: 6 },
});
