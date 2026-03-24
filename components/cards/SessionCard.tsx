import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View, StyleSheet } from "react-native";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];
type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

export type SessionStatus = "upcoming" | "action-now" | "completed" | "missed";
export type AttendanceStatus = "Present" | "Absent" | "Missed" | null;

export interface Session {
  id: string;
  status: SessionStatus;
  title: string;
  instructor: string;
  location: string;
  timeStart: string;
  timeEnd: string;
  role?: string;
  idBadge?: string;
  date?: string;
  attendance?: AttendanceStatus;
}

interface SessionCardProps {
  session: Session;
  onManageSession?: () => void;
  onCheckIn?: () => void;
  onViewDetails?: () => void;
}

const STATUS_CONFIG: Record<SessionStatus, { label: string; labelColor: string; labelBg: string; borderColor: string }> = {
  "upcoming": { label: "Upcoming", labelColor: "#1D4ED8", labelBg: "#EFF6FF", borderColor: "#BFDBFE" },
  "action-now": { label: "Action Now", labelColor: "#B45309", labelBg: "#FFFBEB", borderColor: "#FDE68A" },
  "completed": { label: "Completed", labelColor: "#065F46", labelBg: "#ECFDF5", borderColor: "#A7F3D0" },
  "missed": { label: "Missed", labelColor: "#991B1B", labelBg: "#FEF2F2", borderColor: "#FECACA" },
};

const ATTENDANCE_CONFIG: Record<string, { color: string; bg: string }> = {
  Present: { color: "#065F46", bg: "#ECFDF5" },
  Absent: { color: "#991B1B", bg: "#FEF2F2" },
  Missed: { color: "#991B1B", bg: "#FEF2F2" },
};

export const SessionCard: React.FC<SessionCardProps> = ({
  session,
  onManageSession,
  onCheckIn,
  onViewDetails,
}) => {
  const config = STATUS_CONFIG[session.status];
  const attendanceConfig = session.attendance ? ATTENDANCE_CONFIG[session.attendance] : null;

  return (
    <View style={[styles.card, { borderColor: config.borderColor }]}>
      {/* Top Status */}
      <View style={[styles.topBar, { backgroundColor: config.labelBg }]}>
        <Text style={[styles.statusLabel, { color: config.labelColor }]}>{config.label}</Text>
        <View style={styles.topRight}>
          {session.role && <Text style={[styles.role, { color: config.labelColor }]}>{session.role}</Text>}
          {session.idBadge && <Text style={[styles.idBadge, { color: config.labelColor }]}>{session.idBadge}</Text>}
          {session.date && <Text style={[styles.dateText, { color: config.labelColor }]}>{session.date}</Text>}
        </View>
      </View>

      {/* Body */}
      <View style={styles.body}>
        <Text style={styles.title}>{session.title}</Text>

        <View style={styles.instructorRow}>
          <Ionicons name="person-outline" size={12} color="#9CA3AF" />
          <Text style={styles.instructorText}>{session.instructor} · {session.location}</Text>
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.timeContainer}>
            <Ionicons name="time-outline" size={13} color="#6B7280" />
            <Text style={styles.timeText}>{session.timeStart} – {session.timeEnd}</Text>
          </View>

          {session.status === "upcoming" && onManageSession && (
            <TouchableOpacity style={styles.manageBtn} onPress={onManageSession}>
              <MaterialCommunityIcons name="cog-outline" size={14} color="#fff" />
              <Text style={styles.btnText}>Manage Session</Text>
            </TouchableOpacity>
          )}

          {session.status === "action-now" && onCheckIn && (
            <TouchableOpacity style={styles.checkInBtn} onPress={onCheckIn}>
              <Ionicons name="checkmark-circle-outline" size={14} color="#fff" />
              <Text style={styles.btnText}>Check In</Text>
            </TouchableOpacity>
          )}

          {(session.status === "completed" || session.status === "missed") && onViewDetails && (
            <TouchableOpacity onPress={onViewDetails}>
              <Text style={styles.viewDetailsText}>View Details</Text>
            </TouchableOpacity>
          )}
        </View>

        {session.attendance && attendanceConfig && (
          <View style={styles.attendanceContainer}>
            <Text style={styles.attendanceLabel}>Attendance</Text>
            <View style={[styles.attendanceBadge, { backgroundColor: attendanceConfig.bg }]}>
              <Text style={[styles.attendanceText, { color: attendanceConfig.color }]}>{session.attendance}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  topRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  role: { fontSize: 10, fontWeight: "600" },
  idBadge: { fontSize: 10, opacity: 0.7 },
  dateText: { fontSize: 10, opacity: 0.7 },
  body: { paddingHorizontal: 12, paddingVertical: 10 },
  title: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  instructorRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 },
  instructorText: { fontSize: 12, color: "#6B7280" },
  bottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  timeContainer: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#F3F4F6", paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8 },
  timeText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  manageBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#0A0F1E", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  checkInBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#059669", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  btnText: { fontSize: 12, fontWeight: "bold", color: "#fff" },
  viewDetailsText: { fontSize: 12, fontWeight: "bold", color: "#3B82F6" },
  attendanceContainer: { marginTop: 8, borderTopWidth: 1, borderTopColor: "#E5E7EB", paddingTop: 6 },
  attendanceLabel: { fontSize: 10, fontWeight: "600", color: "#6B7280", marginBottom: 2, textTransform: "uppercase" },
  attendanceBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  attendanceText: { fontSize: 10, fontWeight: "bold" },
});