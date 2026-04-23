// /components/cards/AttendanceCard.tsx
//
// Color-coded card for a single attendance record in the Participate tab.
// Follows the UX color semantics:
//   🟢 Ongoing  → #10B981
//   🔵 Upcoming → #3B82F6
//   ⚫ Completed → #64748B
//   🔴 Missed   → #EF4444

import { canCheckIn, canCheckOut, isCheckedOut, isMissed, isNoCheckout } from "@/hooks/useSessionStatus";
import { AttendanceCategory, AttendanceRecord } from "@/types/AttendanceTypes";
import { formatDuration, formatSeconds, formatTime12hr } from "@/utils/timeUtils";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ── Status config ─────────────────────────────────────────────────────────────
const CATEGORY_CONFIG: Record<
  AttendanceCategory,
  {
    label: string;
    color: string;
    bg: string;
    border: string;
    icon: React.ComponentProps<typeof Ionicons>["name"];
    dotColor: string;
  }
> = {
  ongoing: {
    label: "Ongoing",
    color: "#059669",
    bg: "#ECFDF5",
    border: "#A7F3D0",
    icon: "radio-button-on",
    dotColor: "#10B981",
  },
  upcoming: {
    label: "Upcoming",
    color: "#2563EB",
    bg: "#EFF6FF",
    border: "#BFDBFE",
    icon: "time-outline",
    dotColor: "#3B82F6",
  }, 
  completed: {
    label: "Completed",
    color: "#475569",
    bg: "#F8FAFC",
    border: "#E2E8F0",
    icon: "checkmark-circle-outline",
    dotColor: "#64748B",
  },
  incomplete: {
    label: "Incomplete",
    color: "#B45309",
    bg: "#FFFBEB",
    border: "#FDE68A",
    icon: "warning-outline",
    dotColor: "#D97706",
  },
  "no-checkout": {
    label: "No Check-out",
    color: "#D97706",
    bg: "#FFFBEB",
    border: "#FDE68A",
    icon: "exit-outline",
    dotColor: "#F59E0B",
  },
  missed: {
    label: "Missed",
    color: "#DC2626",
    bg: "#FEF2F2",
    border: "#FECACA",
    icon: "close-circle-outline",
    dotColor: "#EF4444",
  },
};

// ── Literal Backend Status config ─────────────────────────────────────────────
const RAW_STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  complete: { color: "#059669", bg: "#F0FDF4", border: "#BBF7D0", icon: "checkmark-done" },
  completed: { color: "#059669", bg: "#F0FDF4", border: "#BBF7D0", icon: "checkmark-done" },
  incomplete: { color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", icon: "warning-outline" },
  "no-checkout": { color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", icon: "exit-outline" },
  "checked-in": { color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", icon: "radio-button-on" },
  missed: { color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", icon: "close-circle" },
  late: { color: "#EA580C", bg: "#FFF7ED", border: "#FFEDD5", icon: "time-outline" },
  "on-time": { color: "#059669", bg: "#F0FDF4", border: "#BBF7D0", icon: "checkmark" },
  present: { color: "#059669", bg: "#F0FDF4", border: "#BBF7D0", icon: "checkmark" },
  absent: { color: "#64748B", bg: "#F8FAFC", border: "#E2E8F0", icon: "remove-circle-outline" },
  pending: { color: "#64748B", bg: "#F8FAFC", border: "#E2E8F0", icon: "ellipsis-horizontal" },
  excused: { color: "#4F46E5", bg: "#EEF2FF", border: "#E0E7FF", icon: "shield-checkmark-outline" },
};

// Removed local fmt12, using formatTime12hr
// ── Props ─────────────────────────────────────────────────────────────────────
interface AttendanceCardProps {
  record: AttendanceRecord;
  category: AttendanceCategory;
  onPress?: () => void;
  onCheckInPress?: () => void;
  onCheckOutPress?: () => void;
  onViewLogs?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export const AttendanceCard: React.FC<AttendanceCardProps> = ({
  record,
  category,
  onPress,
  onCheckInPress,
  onCheckOutPress,
  onViewLogs,
}) => {
  // SESSION STATE controls main card style: 
  // Any variations of 'done' states (incomplete, no-checkout, completed) fall back to the neutral card theme.
  const themeCategory = (category === "incomplete" || category === "no-checkout") ? "completed" : category;
  const cfg = CATEGORY_CONFIG[themeCategory];
  
  const { session, total_time_rendered, status } = record;
  const schedule = session?.schedule;

  const startLabel = schedule?.start_time ? formatTime12hr(schedule.start_time) : "—";
  const endLabel = schedule?.end_time ? formatTime12hr(schedule.end_time) : "—";
  const dateLabel = schedule?.start_date ?? "—";
  // Time rendered: backend stores in SECONDS, use formatSeconds for proper display
  const timeRendered = formatSeconds(total_time_rendered ?? undefined) ?? formatDuration(undefined);

  const showCheckIn = canCheckIn(record);
  const showCheckOut = canCheckOut(record);
  const sessionIsNoCheckout = isNoCheckout(record);

  // Derive Top-Right Status Badge strictly per UX Rules
  let topBadgeKey: string | null = null;
  const isCheckedOutLocal = record.has_checked_out || record.live_state === "checked-out";
  
  const now = new Date();
  let sessionEnded = false;
  if (schedule?.end_time && schedule?.end_date) {
    const endDateTime = new Date(`${schedule.end_date}T${schedule.end_time}:00`);
    sessionEnded = now > endDateTime;
  }

  if (sessionEnded || isCheckedOutLocal) {
    // Final state evaluation
    // Strict Missed Rule: if no participation happened (time rendered is 0 or null)
    if (!record.total_time_rendered || record.total_time_rendered === 0) {
      topBadgeKey = "missed";
    } else if (record.result_status) {
      topBadgeKey = record.result_status;
    } else {
      // Manual fallback deduction if missing
      if (isCheckedOutLocal) topBadgeKey = "complete";
      else if (record.live_state === "checked-in") topBadgeKey = "no-checkout";
      else topBadgeKey = "missed";
    }
  } else {
    // Real-time evaluation (session is still active)
    if (record.live_state === "checked-in") {
      topBadgeKey = "checked-in";
    }
  }

  // Inject matching style dynamically
  const activeRawStyle = topBadgeKey ? RAW_STATUS_CONFIG[topBadgeKey] || RAW_STATUS_CONFIG.pending : null;
  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.75 : 1}
      onPress={onPress}
      style={[styles.card, { borderColor: cfg.border, backgroundColor: cfg.bg }]}
    >
      {/* Left accent strip */}
      <View style={[styles.accentStrip, { backgroundColor: cfg.dotColor }]} />

      <View style={styles.body}>
        {/* Top row: session name + strict specific attendance statuses */}
        <View style={styles.topRow}>
          <Text style={styles.sessionName} numberOfLines={1}>
            {session?.session_name ?? "Untitled Session"}
          </Text>
          {topBadgeKey && activeRawStyle && (
            <View style={[styles.badge, { backgroundColor: activeRawStyle.bg, borderColor: activeRawStyle.border }]}>
               <Ionicons name={activeRawStyle.icon as any} size={10} color={activeRawStyle.color} />
               <Text style={[styles.badgeText, { color: activeRawStyle.color }]}>
                 {topBadgeKey === "no-checkout" ? "NO CHECK-OUT" : topBadgeKey.toUpperCase()}
               </Text>
            </View>
          )}
        </View>

        {/* Middle: date + time range */}
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={13} color="#94A3B8" />
          <Text style={styles.metaText}>{dateLabel}</Text>
          <View style={styles.divider} />
          <Ionicons name="time-outline" size={13} color="#94A3B8" />
          <Text style={styles.metaText}>
            {startLabel} – {endLabel}
          </Text>
        </View>

        {/* Bottom row: time rendered + Unified Action Area */}
        <View style={styles.bottomRow}>
          {timeRendered ? (
            <View style={styles.timeChip}>
              <Ionicons name="hourglass-outline" size={12} color={cfg.color} />
              <Text style={[styles.timeChipText, { color: cfg.color }]}>
                {timeRendered} rendered
              </Text>
            </View>
          ) : (
             <View style={{ flex: 1 }} />
          )}

          {/* Unified Action Slot */}
          {showCheckIn && onCheckInPress ? (
            <TouchableOpacity
              style={styles.cardCheckInBtn}
              activeOpacity={0.8}
              onPress={(e) => {
                e.stopPropagation();
                onCheckInPress();
              }}
            >
              <Ionicons name="scan-outline" size={14} color="#fff" />
              <Text style={styles.cardCheckInBtnText}>Check In</Text>
            </TouchableOpacity>
          ) : showCheckOut && onCheckOutPress ? (
            <TouchableOpacity
              style={styles.cardCheckOutBtn}
              activeOpacity={0.8}
              onPress={(e) => {
                e.stopPropagation();
                onCheckOutPress();
              }}
            >
              <Ionicons name="log-out-outline" size={14} color="#fff" />
              <Text style={styles.cardCheckOutBtnText}>Check Out</Text>
            </TouchableOpacity>
          ) : onViewLogs ? (
            <TouchableOpacity
              style={styles.viewLogsBtn}
              activeOpacity={0.8}
              onPress={(e) => {
                e.stopPropagation();
                onViewLogs();
              }}
            >
              <Ionicons name="time-outline" size={13} color="#0D9488" />
              <Text style={styles.viewLogsBtnText}>View Logs</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Right arrow caret */}
      {onPress && (
        <Ionicons
          name="chevron-forward"
          size={18}
          color="#CBD5E1"
          style={styles.caret}
        />
      )}
    </TouchableOpacity>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1.5,
    marginBottom: 12,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  accentStrip: {
    width: 4,
    alignSelf: "stretch",
  },
  body: {
    flex: 1,
    padding: 14,
    gap: 6,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  sessionName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    flex: 1,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  divider: {
    width: 1,
    height: 10,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 2,
  },

  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  timeChipText: {
    fontSize: 11,
    fontWeight: "700",
  },
  rawStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: "auto",
  },
  rawStatusText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  cardCheckInBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0D9488",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 5,
    marginLeft: "auto",
    elevation: 2,
    shadowColor: "#0D9488",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  cardCheckInBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.3,
  },
  cardCheckOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EF4444",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 5,
    marginLeft: "auto",
    elevation: 2,
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  cardCheckOutBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.3,
  },
  viewLogsBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#0D9488",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 5,
    marginLeft: "auto",
  },
  viewLogsBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0D9488",
    letterSpacing: 0.3,
  },
  caret: {
    paddingRight: 12,
  },
});
