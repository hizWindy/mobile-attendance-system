// /components/modal/LiveAttendanceModal.tsx
//
// A bottom-sheet modal for supervisors to monitor who is currently
// checked in to an active session.  Fetches from:
//   GET /analytics/session/live-attendees/{session_id}

import AnalyticsService, { LiveAttendee } from "@/api/AnalyticsService";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  PanResponder,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.82;

// ─── Status pill config ───────────────────────────────────────────────────────
const getStatusCfg = (status: string) => {
  const norm = status.toLowerCase();
  let baseCfg = { color: "#64748B", bg: "#F8FAFC", border: "#E2E8F0" };
  let label = status;

  if (norm.includes("on-time") || norm.includes("on_time") || norm.includes("ontime") || norm.includes("present")) {
    baseCfg = { color: "#059669", bg: "#F0FDF4", border: "#BBF7D0" };
    label = status.replace(/on-time|on_time|ontime|present/i, "On Time");
  } else if (norm.includes("late")) {
    baseCfg = { color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" };
    label = status.replace(/late/i, "Late");
  }

  return { label, ...baseCfg };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt12 = (input: string): string => {
  if (!input) return "—";
  
  let hours = 0;
  let minutes = 0;

  if (input.includes("T")) {
    // Handle ISO date strings: "2026-04-20T14:30:00Z"
    const d = new Date(input);
    if (isNaN(d.getTime())) return input;
    hours = d.getHours();
    minutes = d.getMinutes();
  } else if (input.includes(":")) {
    // Handle plain time strings: "14:30:00"
    const parts = input.split(":");
    hours = parseInt(parts[0], 10);
    minutes = parseInt(parts[1], 10);
    if (isNaN(hours) || isNaN(minutes)) return input;
  } else {
    return input;
  }

  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const mStr = minutes < 10 ? "0" + minutes : minutes;
  
  return `${hours}:${mStr} ${ampm}`;
};

// ─── Separator ──────────────────────────────────────────────────────────────────
const Separator = () => <View style={styles.rowBorder} />;

// ─── Attendee Row ─────────────────────────────────────────────────────────────
const AttendeeRow: React.FC<{ attendee: LiveAttendee }> = ({ attendee }) => {
  const cfg = getStatusCfg(attendee.status);
  return (
    <View style={styles.row}>
      {/* Avatar circle */}
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {attendee.full_name.trim().charAt(0).toUpperCase()}
        </Text>
      </View>

      {/* Name + check-in time */}
      <View style={styles.rowInfo}>
        <Text style={styles.rowName} numberOfLines={1}>{attendee.full_name}</Text>
        <View style={styles.rowMeta}>
          <Ionicons name="time-outline" size={11} color="#94A3B8" />
          <Text style={styles.rowTime}>Checked in: {fmt12(attendee.check_in_time)}</Text>
        </View>
      </View>

      {/* Status badge */}
      <View style={[styles.statusBadge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
        <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
      </View>
    </View>
  );
};

// ─── Props ───────────────────────────────────────────────────────────────────
interface Props {
  visible: boolean;
  sessionId: number | null;
  sessionName?: string;
  onClose: () => void;
}

// ─── Main Component ──────────────────────────────────────────────────────────
export const LiveAttendanceModal: React.FC<Props> = ({
  visible,
  sessionId,
  sessionName = "Session",
  onClose,
}) => {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;

  const [attendees, setAttendees] = useState<LiveAttendee[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const DISMISS_THRESHOLD = 120;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, { dy }) => dy > 2,
      onPanResponderMove: (_, { dy }) => {
        if (dy > 0) dragY.setValue(dy);
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        if (dy > DISMISS_THRESHOLD || vy > 0.8) {
          Animated.timing(dragY, { toValue: SHEET_MAX_HEIGHT, duration: 200, useNativeDriver: true }).start(() => {
            dragY.setValue(0);
            onClose();
          });
        } else {
          Animated.spring(dragY, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const fetchAttendees = useCallback(async (isRefresh = false) => {
    if (!sessionId) return;
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const resp = await AnalyticsService.getLiveAttendees(sessionId);
      setAttendees(resp.attendees ?? []);
      setCount(resp.count ?? 0);
    } catch {
      setError("Could not load attendees. Please try again.");
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (visible) {
      dragY.setValue(0);
      setAttendees([]);
      setCount(0);
      setError(null);

      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
      ]).start();

      fetchAttendees();
    } else {
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {/* Dim overlay */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlay, { opacity: opacityAnim }]} />
      </TouchableWithoutFeedback>

      {/* Bottom sheet */}
      <Animated.View
        style={[styles.sheet, { transform: [{ translateY: Animated.add(slideAnim, dragY) }] }]}
        pointerEvents="box-none"
      >
        {/* Drag handle */}
        <View style={styles.dragHandleWrap} {...panResponder.panHandlers}>
          <View style={styles.dragHandle} />
          <Text style={styles.dragHint}>drag to dismiss</Text>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <MaterialCommunityIcons name="account-eye-outline" size={20} color="#2563EB" />
            <Text style={styles.headerTitle}>Live Attendance</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        <Text style={styles.sessionLabel} numberOfLines={1}>{sessionName}</Text>

        {/* Total Present pill */}
        <View style={styles.summaryPill}>
          <MaterialCommunityIcons name="account-check-outline" size={16} color="#059669" />
          <Text style={styles.summaryText}>
            Total Present: <Text style={styles.summaryCount}>{count}</Text>
          </Text>
          {/* Manual refresh */}
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={() => fetchAttendees(true)}
            activeOpacity={0.7}
            disabled={refreshing}
          >
            <Ionicons
              name="refresh-outline"
              size={15}
              color={refreshing ? "#CBD5E1" : "#2563EB"}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* Body */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Loading attendees…</Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Ionicons name="cloud-offline-outline" size={32} color="#FCA5A5" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => fetchAttendees()} activeOpacity={0.8}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : attendees.length === 0 ? (
          <View style={styles.centered}>
            <MaterialCommunityIcons name="account-off-outline" size={36} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No attendees yet</Text>
            <Text style={styles.emptySubtitle}>No one has checked in to this session</Text>
          </View>
        ) : (
          <FlatList
            data={attendees}
            keyExtractor={(item) => item.user_id.toString()}
            renderItem={({ item }) => <AttendeeRow attendee={item} />}
            ItemSeparatorComponent={Separator}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchAttendees(true)}
                colors={["#2563EB"]}
                tintColor="#2563EB"
              />
            }
          />
        )}
      </Animated.View>
    </Modal>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: SHEET_MAX_HEIGHT,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  dragHandleWrap: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 6,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
  },
  dragHint: {
    fontSize: 10,
    color: "#CBD5E1",
    marginTop: 3,
    letterSpacing: 0.5,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 2,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  sessionLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  // Summary
  summaryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  summaryText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  summaryCount: {
    fontWeight: "800",
    color: "#059669",
  },
  refreshBtn: {
    padding: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginHorizontal: 20,
    marginBottom: 6,
  },

  // List
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },

  // Row
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  rowBorder: {
    height: 1,
    backgroundColor: "#F1F5F9",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2563EB",
  },
  rowInfo: {
    flex: 1,
    gap: 3,
  },
  rowName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  rowMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rowTime: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    flexShrink: 0,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // States
  centered: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "500",
  },
  errorText: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    maxWidth: 240,
  },
  retryBtn: {
    marginTop: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  retryText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#64748B",
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
  },
});
