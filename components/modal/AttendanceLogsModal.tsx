// /components/modal/AttendanceLogsModal.tsx
//
// Slide-up bottom sheet showing attendance logs fetched from
// GET /attendances/session-logs/{session_id}.
// Displays session info, summary stats, and an activity timeline.

import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  SectionList,
  RefreshControl,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import AttendanceService from "@/api/AttendanceService";
import { formatTime12hr } from "@/utils/timeUtils";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.88;
const TEAL = "#0D9488";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format an ISO datetime or HH:mm:ss to 12-hour string. */
const fmt12 = (input: string | null | undefined): string => {
  if (!input) return "—";
  if (input.includes("T")) {
    const d = new Date(input);
    if (isNaN(d.getTime())) return input;
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  }
  return formatTime12hr(input) || input;
};

/** Format seconds into a readable duration. Shows only relevant units. */
const fmtDuration = (seconds: number | null | undefined): string => {
  if (!seconds || seconds <= 0) return "0s";

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60); // Ensure no decimals for seconds

  if (h > 0) return `${h}h ${m > 0 ? m + "m" : ""}`.trim();
  if (m > 0) return `${m}m ${s > 0 ? s + "s" : ""}`.trim();
  return `${s}s`;
};

/** Format a method string for display. */
const fmtMethod = (method: string | null | undefined): string => {
  if (!method) return "";
  return method.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

// ─── Status style config ──────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, { color: string; bg: string; icon: string }> = {
  "checked-in":  { color: "#059669", bg: "#F0FDF4", icon: "log-in-outline" },
  "checked-out": { color: "#DC2626", bg: "#FEF2F2", icon: "log-out-outline" },
  "check-in":    { color: "#059669", bg: "#F0FDF4", icon: "log-in-outline" },
  "check-out":   { color: "#DC2626", bg: "#FEF2F2", icon: "log-out-outline" },
  "on-time":     { color: "#059669", bg: "#F0FDF4", icon: "checkmark-circle" },
  "late":        { color: "#EA580C", bg: "#FFF7ED", icon: "time-outline" },
  "complete":    { color: "#059669", bg: "#F0FDF4", icon: "checkmark-done" },
  "incomplete":  { color: "#D97706", bg: "#FFFBEB", icon: "warning-outline" },
  "missed":      { color: "#DC2626", bg: "#FEF2F2", icon: "close-circle-outline" },
};

const getStatusStyle = (status: string) =>
  STATUS_STYLES[status] ?? { color: "#64748B", bg: "#F8FAFC", icon: "ellipsis-horizontal" };

// ─── Timeline Event Row ───────────────────────────────────────────────────────
interface TimelineEvent {
  action_type: string;
  method?: string;
  latitude?: number;
  longitude?: number;
  log_time?: string;
}

const EventRow: React.FC<{ event: TimelineEvent; isLast: boolean }> = ({ event, isLast }) => {
  const isCheckIn = event.action_type === "check-in";
  const style = getStatusStyle(event.action_type);

  return (
    <View style={styles.eventRow}>
      {/* Timeline connector */}
      <View style={styles.timelineCol}>
        <View style={[styles.timelineDot, { backgroundColor: style.color }]}>
          <Ionicons name={style.icon as any} size={10} color="#fff" />
        </View>
        {!isLast && <View style={styles.timelineLine} />}
      </View>

      {/* Event content */}
      <View style={styles.eventContent}>
        <View style={styles.eventHeader}>
          <View style={[styles.eventTypeBadge, { backgroundColor: style.bg }]}>
            <Text style={[styles.eventTypeText, { color: style.color }]}>
              {isCheckIn ? "Check-in" : "Check-out"}
            </Text>
          </View>
          {event.method ? (
            <Text style={styles.eventMethod}>{fmtMethod(event.method)}</Text>
          ) : null}
        </View>
        <Text style={styles.eventTime}>
          {event.log_time ? fmt12(event.log_time) : "—"}
        </Text>
      </View>
    </View>
  );
};

// ─── Summary Card ─────────────────────────────────────────────────────────────
interface SummaryData {
  live_state?: string;
  arrival_status?: string;
  result_status?: string;
  total_time_rendered?: number;
}

const SummaryCard: React.FC<{ summary: SummaryData }> = ({ summary }) => {
  const liveStyle = getStatusStyle(summary.live_state || "");
  const arrivalStyle = getStatusStyle(summary.arrival_status || "");
  const resultStyle = getStatusStyle(summary.result_status || "");

  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>Current Status</Text>

      <View style={styles.summaryGrid}>
        {/* Live State */}
        <View style={styles.summaryItem}>
          <Ionicons name="radio-button-on" size={14} color={liveStyle.color} />
          <View>
            <Text style={styles.summaryLabel}>Live State</Text>
            <Text style={[styles.summaryValue, { color: liveStyle.color }]}>
              {summary.live_state?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "—"}
            </Text>
          </View>
        </View>

        {/* Arrival */}
        <View style={styles.summaryItem}>
          <Ionicons name="flag-outline" size={14} color={arrivalStyle.color} />
          <View>
            <Text style={styles.summaryLabel}>Arrival</Text>
            <Text style={[styles.summaryValue, { color: arrivalStyle.color }]}>
              {summary.arrival_status?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "—"}
            </Text>
          </View>
        </View>

        {/* Result */}
        <View style={styles.summaryItem}>
          <Ionicons name="shield-checkmark-outline" size={14} color={resultStyle.color} />
          <View>
            <Text style={styles.summaryLabel}>Result</Text>
            <Text style={[styles.summaryValue, { color: resultStyle.color }]}>
              {summary.result_status?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "—"}
            </Text>
          </View>
        </View>

        {/* Time Rendered */}
        <View style={styles.summaryItem}>
          <Ionicons name="hourglass-outline" size={14} color={TEAL} />
          <View>
            <Text style={styles.summaryLabel}>Time Rendered</Text>
            <Text style={[styles.summaryValue, { color: TEAL }]}>
              {fmtDuration(summary.total_time_rendered)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  visible: boolean;
  onClose: () => void;
  sessionName: string;
  sessionId: number;
  /** Legacy prop — kept for backwards compatibility but no longer needed */
  records?: any[];
}

// ─── Main Component ───────────────────────────────────────────────────────────
export const AttendanceLogsModal: React.FC<Props> = ({
  visible,
  onClose,
  sessionName,
  sessionId,
}) => {
  const slideAnim = useRef(new Animated.Value(SHEET_MAX_HEIGHT)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logData, setLogData] = useState<any>(null);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [visibleCount, setVisibleCount] = useState(15);

  // ── Pan responder for drag-to-dismiss ───────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 5,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) dragY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 100 || g.vy > 0.5) {
          onClose();
        } else {
          Animated.spring(dragY, {
            toValue: 0,
            tension: 80,
            friction: 10,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // ── Animate in/out ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      dragY.setValue(0);
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SHEET_MAX_HEIGHT,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // ── Fetch logs from backend ─────────────────────────────────────────────────
  useEffect(() => {
    if (visible && sessionId) {
      setVisibleCount(15);
      fetchLogs();
    }
  }, [visible, sessionId]);

  const fetchLogs = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const response = await AttendanceService.getAttendanceLogs(sessionId);
      setLogData(response.data ?? response);
    } catch (err: any) {
      console.error("[AttendanceLogsModal] Fetch error:", err);
      setError("Failed to load attendance logs.");
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  };

  // ── Download Report ─────────────────────────────────────────────────────────
  const handleDownloadReport = useCallback(async () => {
    if (downloadingReport) return;
    setDownloadingReport(true);
    try {
      const data = await AttendanceService.getAttendanceReport(sessionId);
      const uint8 = new Uint8Array(data);
      let binary = "";
      for (let i = 0; i < uint8.length; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      const base64 = btoa(binary);

      const fileUri = `${FileSystem.cacheDirectory}report_session_${sessionId}.pdf`;
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: "base64",
      });
      await Sharing.shareAsync(fileUri, {
        mimeType: "application/pdf",
        dialogTitle: "Share Attendance Report",
        UTI: "com.adobe.pdf",
      });
    } catch (err: any) {
      console.error("[AttendanceLogsModal] Report download error:", err);
      Alert.alert("Download Failed", "Could not download the report. Please try again.");
    } finally {
      setDownloadingReport(false);
    }
  }, [sessionId, downloadingReport]);

  // ── Derived data ────────────────────────────────────────────────────────────
  const sessionInfo = logData?.session;
  const summary: SummaryData | null = logData?.summary ?? null;
  const events: TimelineEvent[] = logData?.events ?? [];

  // Group events into sections for the timeline
  const timelineSections = React.useMemo(() => {
    const sliced = events.slice(0, visibleCount);
    const groups: { title: string; data: TimelineEvent[] }[] = [];
    sliced.forEach((e) => {
      let title = "Unknown Date";
      if (e.log_time) {
        const d = new Date(e.log_time);
        if (!isNaN(d.getTime())) {
          title = d.toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
            year: "numeric",
          });
        }
      }
      const last = groups[groups.length - 1];
      if (last && last.title === title) {
        last.data.push(e);
      } else {
        groups.push({ title, data: [e] });
      }
    });
    return groups;
  }, [events, visibleCount]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlay, { opacity: opacityAnim }]} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.sheet,
          {
            transform: [{ translateY: Animated.add(slideAnim, dragY) }],
          },
        ]}
        pointerEvents="box-none"
      >
        {/* Drag handle */}
        <View style={styles.dragHandleWrapper} {...panResponder.panHandlers}>
          <View style={styles.dragHandle} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Attendance Logs</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {sessionInfo?.session_name || sessionName}
            </Text>
            {sessionInfo?.session_code ? (
              <Text style={styles.headerCode}>Code: {sessionInfo.session_code}</Text>
            ) : null}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* ── Content ── */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={TEAL} />
            <Text style={styles.loadingText}>Loading logs…</Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Ionicons name="cloud-offline-outline" size={36} color="#FCA5A5" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchLogs}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <SectionList
            sections={timelineSections}
            keyExtractor={(_, i) => String(i)}
            style={styles.listArea}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchLogs(true)}
                colors={[TEAL]}
                tintColor={TEAL}
              />
            }
            ListHeaderComponent={
              <>
                {/* Summary */}
                {summary && <SummaryCard summary={summary} />}

                {/* Timeline header */}
                {events.length > 0 && (
                  <Text style={styles.timelineHeader}>Activity Timeline</Text>
                )}
              </>
            }
            renderSectionHeader={({ section: { title } }) => (
              <View style={styles.sectionHeader}>
                <Ionicons name="calendar-outline" size={14} color="#64748B" />
                <Text style={styles.sectionHeaderText}>{title}</Text>
              </View>
            )}
            renderItem={({ item, index, section }) => (
              <EventRow event={item} isLast={index === section.data.length - 1} />
            )}
            ListFooterComponent={
              events.length > visibleCount ? (
                <TouchableOpacity
                  style={styles.loadMoreBtn}
                  onPress={() => setVisibleCount((prev) => prev + 15)}
                >
                  <Text style={styles.loadMoreText}>See More Logs</Text>
                  <Ionicons name="chevron-down-outline" size={16} color="#64748B" />
                </TouchableOpacity>
              ) : events.length > 0 && events.length === timelineSections.reduce((acc, s) => acc + s.data.length, 0) ? (
                 <Text style={styles.endOfListText}>End of logs reached.</Text>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="documents-outline" size={40} color="#CBD5E1" />
                <Text style={styles.emptyText}>No activity events found.</Text>
              </View>
            }
            stickySectionHeadersEnabled={false}
          />
        )}

        {/* Sticky Footer — Download Report */}
        {!loading && !error && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.exportBtn}
              activeOpacity={0.8}
              onPress={handleDownloadReport}
              disabled={downloadingReport}
            >
              {downloadingReport ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={18} color="#fff" />
                  <Text style={styles.exportBtnText}>Download Report</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: SHEET_MAX_HEIGHT,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  dragHandleWrapper: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 4,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748B",
    marginTop: 2,
  },
  headerCode: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    marginTop: 3,
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  // Summary Card
  summaryCard: {
    backgroundColor: "#F0FDFA",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#CCFBF1",
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: 0.3,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  summaryGrid: {
    gap: 14,
  },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: 1,
  },

  // Timeline
  timelineHeader: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 16,
    marginBottom: 12,
    gap: 6,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  eventRow: {
    flexDirection: "row",
    minHeight: 60,
  },
  timelineCol: {
    width: 32,
    alignItems: "center",
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#E2E8F0",
    marginTop: 4,
    marginBottom: 4,
  },
  eventContent: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 20,
  },
  eventHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  eventTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  eventTypeText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  eventMethod: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94A3B8",
  },
  eventTime: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginTop: 4,
  },

  // List
  listArea: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  loadMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 16,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    gap: 6,
  },
  loadMoreText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  endOfListText: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
    marginTop: 24,
    marginBottom: 8,
  },

  // States
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#94A3B8",
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#EF4444",
    textAlign: "center",
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    marginTop: 4,
  },
  retryText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#94A3B8",
  },

  // Footer
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    backgroundColor: "#fff",
  },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: TEAL,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    elevation: 3,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  exportBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.2,
  },
});
