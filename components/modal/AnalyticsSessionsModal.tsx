import React, { useEffect, useState, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  useColorScheme,
  Platform,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AnalyticsService, {
  SupervisorSessionItem,
  AttendeeSessionItem,
} from "@/api/AnalyticsService";

// ─── Formatting Helpers ────────────────────────────────────────────────────────

function fmtSecs(secs: number): string {
  if (!secs || secs <= 0) return "0m";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function fmtPct(n: number): string {
  return `${n?.toFixed(1) ?? "0.0"}%`;
}

// ─── Progress Bar Component ──────────────────────────────────────────────────

interface ProgressRowProps {
  label: string;
  pct: number;
  color: string;
  isDark: boolean;
}

function ProgressRow({ label, pct, color, isDark }: ProgressRowProps) {
  const clampedPct = Math.min(Math.max(pct ?? 0, 0), 100);
  return (
    <View style={styles.progressRow}>
      <View style={styles.progressLabelRow}>
        <Text style={[styles.progressLabel, isDark && styles.textSecondaryDark]}>{label}</Text>
        <Text style={[styles.progressPct, { color }]}>{fmtPct(clampedPct)}</Text>
      </View>
      <View style={[styles.progressTrack, isDark && styles.progressTrackDark]}>
        <View style={[styles.progressFill, { width: `${clampedPct}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

// ─── Badge Components ─────────────────────────────────────────────────────────

function ResultBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    complete:   { bg: "#EEF2FF", text: "#4F46E5", label: "Complete"   },
    incomplete: { bg: "#FFF7ED", text: "#F97316", label: "Incomplete" },
    missed:     { bg: "#FEF2F2", text: "#EF4444", label: "Missed"     },
    no_checkout:{ bg: "#F9FAFB", text: "#9CA3AF", label: "No Checkout"},
  };
  const cfg = map[status] ?? { bg: "#F3F4F6", text: "#6B7280", label: status };
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

function ArrivalBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    "on-time": { bg: "#F0FDF4", text: "#22C55E", label: "On-time" },
    late:      { bg: "#FFF7ED", text: "#F97316", label: "Late"    },
    missed:    { bg: "#FEF2F2", text: "#EF4444", label: "Missed"  },
  };
  const cfg = map[status] ?? { bg: "#F3F4F6", text: "#6B7280", label: status };
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

// ─── Main Modal Component ─────────────────────────────────────────────────────

interface AnalyticsSessionsModalProps {
  visible: boolean;
  onClose: () => void;
  role: "supervisor" | "attendee" | null;
}

export default function AnalyticsSessionsModal({ visible, onClose, role }: AnalyticsSessionsModalProps) {
  const isDark = useColorScheme() === "dark";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [supSessions, setSupSessions] = useState<SupervisorSessionItem[]>([]);
  const [attSessions, setAttSessions] = useState<AttendeeSessionItem[]>([]);

  const fetchData = useCallback(async () => {
    if (!role || !visible) return;
    
    try {
      setLoading(true);
      setError(null);
      if (role === "supervisor") {
        const res = await AnalyticsService.getSupervisorSessions();
        setSupSessions(res.data ?? []);
      } else {
        const res = await AnalyticsService.getAttendeeSessions();
        setAttSessions(res.data ?? []);
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? e?.message ?? "Failed to load sessions");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [role, visible]);

  useEffect(() => {
    if (visible) {
      fetchData();
    } else {
      // Reset state when closing so it doesn't flash old data on next open
      setSupSessions([]);
      setAttSessions([]);
      setLoading(true);
      setError(null);
    }
  }, [visible, fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const renderContent = () => {
    if (loading && !refreshing) {
      return (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={[styles.centerText, isDark && styles.textSecondaryDark]}>Loading sessions...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerWrap}>
          <MaterialCommunityIcons name="wifi-alert" size={40} color="#EF4444" />
          <Text style={[styles.centerText, { color: "#EF4444", marginTop: 12 }]}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchData}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const title = role === "supervisor" ? "Supervised Sessions" : "Session History";
    const count = role === "supervisor" ? supSessions.length : attSessions.length;

    return (
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" colors={["#4F46E5"]} />
        }
      >
        <Text style={[styles.countText, isDark && styles.textSecondaryDark]}>
          {count} total sessions
        </Text>

        <View style={[styles.card, isDark && styles.cardDark]}>
          {role === "supervisor" && supSessions.length === 0 && (
            <Text style={[styles.emptyText, isDark && styles.textSecondaryDark]}>No supervised sessions found.</Text>
          )}
          {role === "attendee" && attSessions.length === 0 && (
            <Text style={[styles.emptyText, isDark && styles.textSecondaryDark]}>No attended sessions found.</Text>
          )}

          {/* Supervisor List */}
          {role === "supervisor" && supSessions.map((s, i) => (
            <View key={s.session_id} style={[styles.sessionRow, i > 0 && styles.sessionRowBorder, i > 0 && isDark && styles.sessionRowBorderDark]}>
              <View style={styles.sessionRowTop}>
                <Text style={[styles.sessionName, isDark && styles.textPrimaryDark]} numberOfLines={1}>
                  {s.session_name}
                </Text>
                <View style={[styles.statusPill, s.session_status === "active" ? styles.statusActive : styles.statusPast]}>
                  <Text style={[styles.statusPillText, s.session_status === "active" ? styles.statusActiveText : styles.statusPastText]}>
                    {s.session_status}
                  </Text>
                </View>
              </View>
              <View style={styles.sessionStats}>
                <View style={styles.sessionStatItem}>
                  <Text style={[styles.sessionStatValue, isDark && styles.textPrimaryDark]}>{s.total_enrolled}</Text>
                  <Text style={styles.sessionStatLabel}>Enrolled</Text>
                </View>
                <View style={styles.sessionStatItem}>
                  <Text style={[styles.sessionStatValue, { color: "#22C55E" }]}>{fmtPct(s.on_time_rate)}</Text>
                  <Text style={styles.sessionStatLabel}>On-time</Text>
                </View>
                <View style={styles.sessionStatItem}>
                  <Text style={[styles.sessionStatValue, { color: "#F97316" }]}>{fmtPct(s.late_rate)}</Text>
                  <Text style={styles.sessionStatLabel}>Late</Text>
                </View>
                <View style={styles.sessionStatItem}>
                  <Text style={[styles.sessionStatValue, { color: "#EF4444" }]}>{fmtPct(s.missed_rate)}</Text>
                  <Text style={styles.sessionStatLabel}>Missed</Text>
                </View>
              </View>
              <ProgressRow label="Completion" pct={s.completion_rate} color="#4F46E5" isDark={isDark} />
            </View>
          ))}

          {/* Attendee List */}
          {role === "attendee" && attSessions.map((s, i) => (
            <View key={s.session_id} style={[styles.sessionRow, i > 0 && styles.sessionRowBorder, i > 0 && isDark && styles.sessionRowBorderDark]}>
              <View style={styles.sessionRowTop}>
                <Text style={[styles.sessionName, isDark && styles.textPrimaryDark]} numberOfLines={1}>
                  {s.session_name}
                </Text>
                <ResultBadge status={s.result_status} />
              </View>
              <View style={styles.sessionBadgeRow}>
                <ArrivalBadge status={s.arrival_status} />
                <Text style={styles.sessionTimeText}>
                  {fmtSecs(s.total_time_rendered_secs)} rendered
                </Text>
              </View>
              <ProgressRow
                label="Completion"
                pct={s.completion_percentage}
                color="#4F46E5"
                isDark={isDark}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, isDark && styles.containerDark]}>
        {/* Modal Header */}
        <View style={[styles.header, isDark && styles.headerDark]}>
          <Text style={[styles.headerTitle, isDark && styles.textPrimaryDark]}>
            {role === "supervisor" ? "Supervised Sessions" : "Session History"}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <MaterialCommunityIcons name="close" size={24} color={isDark ? "#9CA3AF" : "#6B7280"} />
          </TouchableOpacity>
        </View>

        {renderContent()}
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  containerDark: { backgroundColor: "#0F172A" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 20 : 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerDark: {
    backgroundColor: "#1E293B",
    borderBottomColor: "#334155",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  closeBtn: {
    padding: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
  },
  
  scroll: { padding: 16, paddingBottom: 48 },
  countText: { fontSize: 13, fontWeight: "500", color: "#6B7280", marginBottom: 12, marginLeft: 4 },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardDark: { backgroundColor: "#1E293B" },

  // Session rows inside cards
  sessionRow: { paddingVertical: 12 },
  sessionRowBorder: { borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  sessionRowBorderDark: { borderTopColor: "#334155" },
  sessionRowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  sessionName: { fontSize: 14, fontWeight: "600", color: "#111827", flex: 1, marginRight: 8 },
  sessionStats: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  sessionStatItem: { alignItems: "center" },
  sessionStatValue: { fontSize: 15, fontWeight: "700", color: "#111827" },
  sessionStatLabel: { fontSize: 10, color: "#9CA3AF", marginTop: 2 },
  sessionBadgeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  sessionTimeText: { fontSize: 12, color: "#9CA3AF", fontWeight: "500" },

  // Progress bar
  progressRow: { marginBottom: 4 },
  progressLabelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  progressLabel: { fontSize: 13, fontWeight: "500", color: "#6B7280" },
  progressPct: { fontSize: 13, fontWeight: "700" },
  progressTrack: { height: 8, backgroundColor: "#F3F4F6", borderRadius: 4, overflow: "hidden" },
  progressTrackDark: { backgroundColor: "#334155" },
  progressFill: { height: 8, borderRadius: 4 },

  // Status pill
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusActive: { backgroundColor: "#DCFCE7" },
  statusPast: { backgroundColor: "#F1F5F9" },
  statusPillText: { fontSize: 11, fontWeight: "600" },
  statusActiveText: { color: "#16A34A" },
  statusPastText: { color: "#64748B" },

  // Badges
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: "600" },

  // Empty / Error / Loading
  emptyText: { fontSize: 14, color: "#9CA3AF", textAlign: "center", paddingVertical: 20 },
  centerWrap: { alignItems: "center", justifyContent: "center", flex: 1 },
  centerText: { fontSize: 14, color: "#6B7280", marginTop: 16, textAlign: "center" },
  retryBtn: { marginTop: 20, backgroundColor: "#4F46E5", paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  retryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },

  textPrimaryDark: { color: "#F9FAFB" },
  textSecondaryDark: { color: "#94A3B8" },
});
