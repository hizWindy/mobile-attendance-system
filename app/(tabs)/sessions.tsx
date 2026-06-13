// /app/(tabs)/sessions.tsx
//
// Sessions screen — two primary roles:
//   Manage     → sessions the user CREATED (supervisor view) — data from MySessionsContext
//   Participate → the user's ATTENDANCE records               — data from MyAttendanceContext
//
// The SessionDetailsModal is lifted to SCREEN LEVEL so it renders outside the ScrollView,
// which guarantees it always stacks correctly on every platform.

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    FlatList,
    TextInput,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useColorScheme,
} from "react-native";

import { AttendanceCard } from "@/components/cards/AttendanceCard";
import { SessionCard } from "@/components/cards/SessionCard";
import { AttendanceLogsModal } from "@/components/modal/AttendanceLogsModal";
import { CheckInModal } from "@/components/modal/CheckInModal";
import { LiveAttendanceModal } from "@/components/modal/LiveAttendanceModal";
import { SessionDetailsModal } from "@/components/modal/SessionDetailsModal";
import { UpdateSessionModal } from "@/components/modal/UpdateSessionModal";
import { SmartSearchBar, SearchKey } from "@/components/search/SmartSearchBar";
import { SegmentedTab } from "@/components/tabs/SegmentedTab";
import { ActionToast } from "@/components/ui/ActionToast";
import { useMyAttendance } from "@/hooks/useMyAttendance";
import { useSession } from "@/hooks/useSession";
import { AttendanceCategory, AttendanceRecord } from "@/types/AttendanceTypes";
import { BackendSession } from "@/types/SessionTypes";

import AttendanceService, { SessionJoinData } from "@/api/AttendanceService";
import SessionService from "@/api/SessionService";
import { LocationContext } from "@/context/LocationContext";
import { getTimeStatus } from "@/hooks/useSessionStatus";

// ─── Filter types ─────────────────────────────────────────────────────────────
type MainTab = "manage" | "participate";
type ManageFilter = "all" | "active" | "upcoming" | "on_break" | "past";
type ParticipateFilter = "all" | "ongoing" | "upcoming" | "completed" | "missed";

// ─── Empty state ──────────────────────────────────────────────────────────────
const EmptyState = ({
  icon,
  title,
  subtitle,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle: string;
}) => (
  <View style={styles.emptyWrap}>
    <View style={styles.emptyIconWrap}>
      <Ionicons name={icon} size={36} color="#CBD5E1" />
    </View>
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptySubtitle}>{subtitle}</Text>
  </View>
);

// ─── Inline error+retry ───────────────────────────────────────────────────────
const ErrorState = ({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) => (
  <View style={styles.emptyWrap}>
    <Ionicons name="cloud-offline-outline" size={36} color="#FCA5A5" />
    <Text style={styles.errorText}>{message}</Text>
    <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
      <Text style={styles.retryText}>Try Again</Text>
    </TouchableOpacity>
  </View>
);

// ─── Manage tab ───────────────────────────────────────────────────────────────
interface ManageTabProps {
  onViewSession: (session: BackendSession) => void;
  onLiveAttendance: (session: BackendSession) => void;
  onSessionDeleted?: (sessionName: string) => void;
}

const ManageTab: React.FC<ManageTabProps> = ({ onViewSession, onLiveAttendance, onSessionDeleted }) => {
  const { sessions, loading, error, getSessions, removeSession, loadMore, hasMore } = useSession();
  const [filter, setFilter] = useState<ManageFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchKey, setSearchKey] = useState<SearchKey>("name");

  // Re-fetch every time this screen is focused
  useFocusEffect(
    useCallback(() => {
      getSessions(true);
    }, [getSessions]),
  );

  // Poll every 60 seconds while active
  useEffect(() => {
    const interval = setInterval(() => {
        getSessions(true, true);
    }, 60000);
    return () => clearInterval(interval);
  }, [getSessions]);

  // Filtered list — searchKey-aware
  const filtered = useMemo(() => {
    let base = sessions;
    if (filter !== "all") {
      base = sessions.filter((s: BackendSession) => {
        const ts = s.session_status;
        if (filter === "active") return ts === "active";
        if (filter === "upcoming") return ts === "upcoming";
        if (filter === "on_break") return ts === "on_break";
        if (filter === "past") return ts === "past";
        return true;
      });
    }

    if (!searchQuery.trim()) return base;
    const q = searchQuery.toLowerCase().trim();

    return base.filter((s: BackendSession) => {
      const loc = s.location || {};
      const sch = s.schedule || {};
      const det = s.details || {};

      switch (searchKey) {
        case "name":
          return s.session_name?.toLowerCase().includes(q);
        case "code":
          return s.session_code?.toLowerCase().includes(q);
        case "time":
          return sch.start_time?.includes(q) || sch.end_time?.includes(q);
        case "location": {
          const locStr = [loc.address, loc.room, loc.building, (loc as any).name, loc.platform]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return locStr.includes(q);
        }
        case "type": {
          // Normalize: on-site / on_site / onsite → same bucket
          const norm = (v: string) => v.toLowerCase().replace(/[\s_-]/g, "");
          return norm(s.session_setup || "") === norm(q);
        }
        case "frequency": {
          const norm = (v: string) => v.toLowerCase().replace(/[\s_-]/g, "");
          return norm(sch.type || "") === norm(q);
        }
        default: {
          // Omni fallback
          const allStr = [
            s.session_name, s.session_code, loc.address, loc.room,
            loc.platform, s.session_setup, sch.type, sch.start_time,
            ...(s.methods || []), Object.values(det).join(" ")
          ].filter(Boolean).map(v => String(v).toLowerCase());
          return allStr.some(v => v.includes(q));
        }
      }
    });
  }, [sessions, filter, searchQuery, searchKey]);

  // Count badges
  const counts = useMemo(() => {
    const c = { all: sessions.length, active: 0, upcoming: 0, on_break: 0, past: 0 };
    sessions.forEach((s: BackendSession) => {
      const ts = s.session_status;
      if (ts === "active") c.active++;
      else if (ts === "upcoming") c.upcoming++;
      else if (ts === "on_break") c.on_break++;
      else if (ts === "past") c.past++;
    });
    return c;
  }, [sessions]);

  const filterOptions = [
    { key: "all", label: "All", count: counts.all },
    { key: "active", label: "Active", count: counts.active },
    { key: "upcoming", label: "Upcoming", count: counts.upcoming },
    { key: "on_break", label: "On Break", count: counts.on_break },
    { key: "past", label: "Records", count: counts.past },
  ];

  if (loading.list && sessions.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading sessions…</Text>
      </View>
    );
  }

  if (error.list && sessions.length === 0) {
    return <ErrorState message={error.list} onRetry={getSessions} />;
  }

  return (
    <View style={styles.tabBody}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.session_id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={{ paddingBottom: 8 }}>
            <SmartSearchBar
              value={searchQuery}
              searchKey={searchKey}
              onChangeText={setSearchQuery}
              onChangeKey={(k) => { setSearchKey(k); setSearchQuery(""); }}
            />

            <SegmentedTab
              options={filterOptions}
              activeKey={filter}
              onChange={(k) => setFilter(k as ManageFilter)}
            />
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={loading.list && sessions.length > 0}
            onRefresh={() => getSessions(true)}
            colors={["#2563EB"]}
            tintColor="#2563EB"
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          hasMore && loading.list ? (
            <View style={{ paddingVertical: 20 }}>
              <ActivityIndicator size="small" color="#2563EB" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title={filter === "all" ? "No sessions yet" : `No ${filter} sessions`}
            subtitle={
              filter === "all"
                ? "Create one via the Home tab"
                : "Try a different filter above"
            }
          />
        }
        renderItem={({ item: session }) => {
          const normalizedSession: BackendSession = {
            ...session,
            role_type:
              session.role_type === "unknown" || !session.role_type
                ? "Supervisors"
                : session.role_type,
            details: session.details ?? {},
            location: session.location ?? {},
            attended: session.attended ?? false,
          };
          return (
            <SessionCard
              session={normalizedSession}
              onViewDetails={() => onViewSession(normalizedSession)}
              onManageSession={() => onViewSession(normalizedSession)}
              onCheckIn={() => onViewSession(normalizedSession)}
              onLiveAttendance={() => onLiveAttendance(normalizedSession)}
              onDeleteSession={async (sessionId) => {
                try {
                  await removeSession(sessionId);
                  onSessionDeleted?.(normalizedSession.session_name);
                } catch {
                  // Error already handled
                }
              }}
            />
          );
        }}
      />
    </View>
  );
};

// ─── Participate tab ──────────────────────────────────────────────────────────
interface ParticipateTabProps {
  onViewSession: (session: BackendSession) => void;
  onOpenCheckIn: (record: AttendanceRecord, action: "check-in" | "check-out") => void;
  onViewLogs: (sessionId: number, sessionName: string) => void;
}

const ParticipateTab: React.FC<ParticipateTabProps> = ({ onViewSession, onOpenCheckIn, onViewLogs }) => {
  const { categorized, loading, error, refresh } = useMyAttendance();
  const [filter, setFilter] = useState<ParticipateFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchKey, setSearchKey] = useState<SearchKey>("name");

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  // Flatten or slice by category
  const records = useMemo<{ record: AttendanceRecord; category: AttendanceCategory }[]>(() => {
    let baseRecords: { record: AttendanceRecord; category: AttendanceCategory }[] = [];
    if (filter === "all") {
      baseRecords = [
        ...categorized.ongoing.map((r) => ({ record: r, category: "ongoing" as AttendanceCategory })),
        ...categorized.upcoming.map((r) => ({ record: r, category: "upcoming" as AttendanceCategory })),
        ...categorized.completed.map((r) => ({ record: r, category: "completed" as AttendanceCategory })),
        ...categorized.incomplete.map((r) => ({ record: r, category: "incomplete" as AttendanceCategory })),
        ...categorized["no-checkout"].map((r) => ({ record: r, category: "no-checkout" as AttendanceCategory })),
        ...categorized.missed.map((r) => ({ record: r, category: "missed" as AttendanceCategory })),
      ];
    }
    // "completed" filter tab shows all post-session records together
    else if (filter === "completed") {
      baseRecords = [
        ...categorized.completed.map((r) => ({ record: r, category: "completed" as AttendanceCategory })),
        ...categorized.incomplete.map((r) => ({ record: r, category: "incomplete" as AttendanceCategory })),
        ...categorized["no-checkout"].map((r) => ({ record: r, category: "no-checkout" as AttendanceCategory })),
      ];
    } else {
      baseRecords = (categorized[filter as keyof typeof categorized] || []).map((r) => ({
        record: r,
        category: filter as AttendanceCategory,
      }));
    }

    if (!searchQuery.trim()) return baseRecords;
    const q = searchQuery.toLowerCase().trim();
    return baseRecords.filter(item => {
      const s = item.record.session;
      if (!s) return false;
      const loc = s.location || {};
      const sch = s.schedule || {};
      const det = s.details || {};

      switch (searchKey) {
        case "name":
          return s.session_name?.toLowerCase().includes(q);
        case "code":
          return s.session_code?.toLowerCase().includes(q);
        case "time":
          return sch.start_time?.includes(q) || sch.end_time?.includes(q);
        case "location": {
          const locStr = [loc.address, loc.room, loc.building, (loc as any).name, loc.platform]
            .filter(Boolean).join(" ").toLowerCase();
          return locStr.includes(q);
        }
        case "type": {
          const norm = (v: string) => v.toLowerCase().replace(/[\s_-]/g, "");
          return norm(s.session_setup || "") === norm(q);
        }
        case "frequency": {
          const norm = (v: string) => v.toLowerCase().replace(/[\s_-]/g, "");
          return norm(sch.type || "") === norm(q);
        }
        default: {
          const allStr = [
            s.session_name, s.session_code, loc.address, loc.room,
            loc.platform, s.session_setup, sch.type, sch.start_time,
            ...(s.methods || []), Object.values(det).join(" ")
          ].filter(Boolean).map(v => String(v).toLowerCase());
          return allStr.some(v => v.includes(q));
        }
      }
    });
  }, [categorized, filter, searchQuery, searchKey]);

  // Count badges
  const counts = useMemo(() => ({
    all:
      categorized.ongoing.length +
      categorized.upcoming.length +
      categorized.completed.length +
      categorized.incomplete.length +
      categorized["no-checkout"].length +
      categorized.missed.length,
    ongoing: categorized.ongoing.length,
    upcoming: categorized.upcoming.length,
    // "Done" tab aggregates all post-session outcomes
    completed: categorized.completed.length + categorized.incomplete.length + categorized["no-checkout"].length,
    missed: categorized.missed.length,
  }), [categorized]);

  const filterOptions = [
    { key: "all",       label: "All",     count: counts.all },
    { key: "ongoing",   label: "Ongoing", count: counts.ongoing },
    { key: "upcoming",  label: "Upcoming",count: counts.upcoming },
    { key: "completed", label: "Done",    count: counts.completed },
    { key: "missed",    label: "Missed",  count: counts.missed },
  ];

  if (loading && counts.all === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading attendance…</Text>
      </View>
    );
  }

  if (error && counts.all === 0) {
    return <ErrorState message={error} onRetry={refresh} />;
  }

  return (
    <View style={styles.tabBody}>
      <FlatList
        data={records}
        keyExtractor={(item) => item.record.attendance_id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={{ paddingBottom: 8 }}>
            <SmartSearchBar
              value={searchQuery}
              searchKey={searchKey}
              onChangeText={setSearchQuery}
              onChangeKey={(k) => { setSearchKey(k); setSearchQuery(""); }}
            />

            <SegmentedTab
              options={filterOptions}
              activeKey={filter}
              onChange={(k) => setFilter(k as ParticipateFilter)}
              accentColor={
                filter === "missed"
                  ? "#DC2626"
                  : filter === "ongoing"
                    ? "#059669"
                    : "#001F54"
              }
            />

            {filter === "all" && categorized.ongoing.length > 0 && !searchQuery && (
              <View style={styles.activeBanner}>
                <View style={styles.activeBannerDot} />
                <Text style={styles.activeBannerText}>
                  {categorized.ongoing.length} session{categorized.ongoing.length > 1 ? "s" : ""} active now
                </Text>
              </View>
            )}
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            colors={["#2563EB"]}
            tintColor="#2563EB"
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="checkmark-circle-outline"
            title={filter === "all" ? "No attendance records" : `No ${filter} sessions`}
            subtitle={
              filter === "all"
                ? "Join a session from the Home tab"
                : "Try a different filter above"
            }
          />
        }
        renderItem={({ item: { record, category } }) => (
          <AttendanceCard
            record={record}
            category={category}
            onCheckInPress={() => {
              if (record.session) {
                onOpenCheckIn(record, "check-in");
              }
            }}
            onCheckOutPress={() => {
              if (record.session) {
                onOpenCheckIn(record, "check-out");
              }
            }}
            onViewLogs={() => {
              if (record.session) {
                onViewLogs(record.session.session_id, record.session.session_name || "Session");
              }
            }}
          />
        )}
      />
    </View>
  );
};

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function SessionsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const { location } = useContext(LocationContext);
  
  const [mainTab, setMainTab] = useState<MainTab>("participate");
  
  // Need refresh here to update the Participate tab counts once we check in
  const { attendances: myAttendances, refresh: myAttendancesRefresh } = useMyAttendance();

  const [selectedSession, setSelectedSession] = useState<BackendSession | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);

  const { updateSessionInState } = useSession();
  
  // ── Separated CheckInModal State ─────────────────────────────────────────────
  const [checkInModalData, setCheckInModalData] = useState<SessionJoinData | null>(null);
  const [checkInActionType, setCheckInActionType] = useState<"check-in" | "check-out">("check-in");

  // ── Live Attendance Modal State ──────────────────────────────────────────────
  const [liveAttendanceVisible, setLiveAttendanceVisible] = useState(false);
  const [liveAttendanceSessionId, setLiveAttendanceSessionId] = useState<number | null>(null);
  const [liveAttendanceSessionName, setLiveAttendanceSessionName] = useState("");

  // ── Attendance Logs Modal State ─────────────────────────────────────────────
  const [logsModalVisible, setLogsModalVisible] = useState(false);
  const [logsSessionId, setLogsSessionId] = useState<number>(0);
  const [logsSessionName, setLogsSessionName] = useState("");

  const [toastConfig, setToastConfig] = useState<{
    visible: boolean;
    type: "success" | "error" | "info";
    title: string;
    message?: string;
  }>({
    visible: false,
    type: "info",
    title: "",
  });

  const handleViewSession = useCallback((session: BackendSession) => {
    setSelectedSession(session);
    setModalVisible(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
    // Small delay before clearing so slide-out animation completes cleanly
    setTimeout(() => setSelectedSession(null), 300);
  }, []);
  
  const handleOpenCheckInModal = useCallback((record: AttendanceRecord, action: "check-in" | "check-out") => {
    if (!record.session) return;
    const s = record.session;
    const timeStatus = getTimeStatus(s);
    const loc = s.location;
    const locationStr = loc?.address || loc?.room || (loc as any)?.name || loc?.platform || "Not specified";
    
    setCheckInActionType(action);
    setCheckInModalData({
      session_id: s.session_id,
      attendance_id: record.attendance_id,
      session_name: s.session_name || "Untitled Session",
      location: locationStr,
      is_active: timeStatus === "active",
      allowed_methods: s.methods || ["manual"],
      status: timeStatus,
    });
  }, []);

  return (
    <View style={[styles.root, isDark && styles.rootDark]}>
      {/* ── Screen-level details modal — always on top ── */}
      <SessionDetailsModal
        session={selectedSession}
        visible={modalVisible}
        onClose={handleCloseModal}
        isParticipant={mainTab === "participate"}
        onLiveAttendance={() => {
          if (!selectedSession) return;
          setLiveAttendanceSessionId(selectedSession.session_id);
          setLiveAttendanceSessionName(selectedSession.session_name || "Session");
          handleCloseModal();
          // Small delay to let details modal animate out before opening live modal
          setTimeout(() => setLiveAttendanceVisible(true), 350);
        }}
        onCheckInWithMethod={(method) => {
          if (!selectedSession) return;
          const now = new Date();
          const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
          const dateStr = now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
          
          setToastConfig({
            visible: true,
            type: "success",
            title: "Checked In Successfully",
            message: `At ${timeStr}, ${dateStr}\nMethod: ${method.toUpperCase()}`,
          });
        }}
        onEditSession={() => {
          setModalVisible(false);
          setTimeout(() => setUpdateModalVisible(true), 350);
        }}
      />

      <UpdateSessionModal
        session={selectedSession}
        visible={updateModalVisible}
        onClose={() => {
          setUpdateModalVisible(false);
          setTimeout(() => setSelectedSession(null), 300);
        }}
        onUpdate={async (payload) => {
          if (!selectedSession) return;
          const updatedSession = await SessionService.updateSession(selectedSession.session_id, payload);
          updateSessionInState(updatedSession);
          setSelectedSession(updatedSession);
          setToastConfig({
            visible: true,
            type: "success",
            title: "Session Updated",
            message: "Your changes have been saved.",
          });
        }}
      />

      <LiveAttendanceModal
        visible={liveAttendanceVisible}
        sessionId={liveAttendanceSessionId}
        sessionName={liveAttendanceSessionName}
        onClose={() => setLiveAttendanceVisible(false)}
      />

      <AttendanceLogsModal
        visible={logsModalVisible}
        onClose={() => setLogsModalVisible(false)}
        sessionName={logsSessionName}
        sessionId={logsSessionId}
      />

      <CheckInModal
        visible={!!checkInModalData}
        session={checkInModalData}
        actionType={checkInActionType}
        onClose={() => setCheckInModalData(null)}
        onQRScan={async (scanResult, actionType) => {
          if (!checkInModalData) return;
          setCheckInModalData(null); // Visually close immediately
          try {
            const result = await AttendanceService.logAttendance({
              session_id: checkInModalData.session_id,
              action_type: actionType,
              method: "qr",
              latitude: scanResult.latitude,
              longitude: scanResult.longitude,
              qr_token: scanResult.qrData,
              metadata: { status: "Scanned via QR" },
            });
            await myAttendancesRefresh();
            const now = new Date();
            const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
            const ts = result?.time_stats;
            const timeRenderedStr = ts
              ? (ts.hours > 0 ? `${ts.hours}h ${ts.minutes}m` : ts.minutes > 0 ? `${ts.minutes}m` : `${ts.seconds}s`)
              : null;
            setToastConfig({
              visible: true,
              type: "success",
              title: actionType === "check-in" ? "Checked In Successfully" : "Checked Out Successfully",
              message: `QR Verified · ${timeStr}` + (timeRenderedStr ? `\nTime Rendered: ${timeRenderedStr}` : ""),
            });
          } catch (err: any) {
            const detail = err?.response?.data?.detail;
            setToastConfig({
              visible: true,
              type: "error",
              title: actionType === "check-in" ? "QR Check-in Failed" : "QR Check-out Failed",
              message: detail || "Failed to verify QR attendance. Please try again.",
            });
          }
        }}
        onSelectType={async (type, actionType) => {
          if (!checkInModalData) return;

          const doAction = async () => {
            try {
              // Strictly enforce backend validations for method:
              const t = type.toLowerCase();
              let strictMethod = "manual";
              if (t.includes("qr")) strictMethod = "qr";
              else if (t.includes("geo") || t.includes("location")) strictMethod = "geolocation";
              else if (t.includes("face") || t.includes("facial")) strictMethod = "facial";
              else if (t.includes("rfid") || t.includes("nfc")) strictMethod = "rfid";
              else if (t.includes("bio") || t.includes("fingerprint")) strictMethod = "biometric";
              else if (t.includes("manual")) strictMethod = "manual";

              const result = await AttendanceService.logAttendance({
                session_id: checkInModalData.session_id,
                action_type: actionType,
                method: strictMethod,
                latitude: location?.coords.latitude || 0,
                longitude: location?.coords.longitude || 0,
                metadata: strictMethod === "manual" ? { status: "present" } : {},
              });

              await myAttendancesRefresh();

              const now = new Date();
              const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
              const dateStr = now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
              const ts = result?.time_stats;
              const timeRenderedStr = ts
                ? (ts.hours > 0
                    ? `${ts.hours}h ${ts.minutes}m`
                    : ts.minutes > 0
                    ? `${ts.minutes} minute${ts.minutes !== 1 ? "s" : ""}`
                    : `${ts.seconds} second${ts.seconds !== 1 ? "s" : ""}`)
                : null;

              if (actionType === "check-in") {
                const arrStatus = result.arrival_status ? `\nStatus: ${result.arrival_status.toUpperCase()}` : "";
                setToastConfig({
                  visible: true,
                  type: "success",
                  title: "Checked In Successfully",
                  message: `At ${timeStr}, ${dateStr}${arrStatus}\n📍 ${checkInModalData.location}`,
                });
              } else {
                setToastConfig({
                  visible: true,
                  type: "success",
                  title: "Checked Out",
                  message: `At ${timeStr}, ${dateStr}` +
                           (timeRenderedStr ? `\n⏱ Time Rendered: ${timeRenderedStr}` : "") +
                           `\n📍 ${checkInModalData.location}`,
                });
              }
            } catch (err: any) {
              const detail = err?.response?.data?.detail;
              setToastConfig({
                visible: true,
                type: "error",
                title: actionType === "check-in" ? "Check-in Failed" : "Check-out Failed",
                message: detail || "Failed to log attendance. Please try again.",
              });
            }
          };

          if (actionType === "check-out") {
            Alert.alert(
              "Confirm Check-out",
              "Are you sure you want to check out? You will not be able to check in again after this.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Check Out", style: "destructive", onPress: doAction },
              ]
            );
          } else {
            await doAction();
          }
        }}
      />

      <ActionToast
        visible={toastConfig.visible}
        type={toastConfig.type}
        title={toastConfig.title}
        message={toastConfig.message}
        onClose={() => setToastConfig((prev) => ({ ...prev, visible: false }))}
      />

      {/* ── Primary role toggle ── */}
      <View style={[styles.toggleCard, isDark && styles.toggleCardDark]}>
        {(["manage", "participate"] as const).map((tab) => {
          const isActive = mainTab === tab;
          const icon: React.ComponentProps<typeof Ionicons>["name"] =
            tab === "manage"
              ? isActive ? "cog" : "cog-outline"
              : isActive ? "people" : "people-outline";
          const label = tab === "manage" ? "Manage" : "Participate";

          return (
            <TouchableOpacity
              key={tab}
              style={[styles.toggleBtn, isActive && styles.toggleBtnActive]}
              onPress={() => setMainTab(tab)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={icon}
                size={17}
                color={isActive ? "#fff" : isDark ? "#94A3B8" : "#64748B"}
              />
              <Text
                style={[
                  styles.toggleText,
                  isDark && styles.toggleTextDark,
                  isActive && styles.toggleTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Context hint ── */}
      <Text style={[styles.contextHint, isDark && styles.contextHintDark]}>
        {mainTab === "manage"
          ? "Sessions you created or supervise"
          : "Sessions you are enrolled in"}
      </Text>

      {/* ── Tab content ── */}
      {mainTab === "manage" ? (
        <ManageTab
          onViewSession={handleViewSession}
          onLiveAttendance={(session) => {
            setLiveAttendanceSessionId(session.session_id);
            setLiveAttendanceSessionName(session.session_name || "Session");
            setLiveAttendanceVisible(true);
          }}
          onSessionDeleted={(name) => {
            setToastConfig({
              visible: true,
              type: "success",
              title: "Session Deleted",
              message: `"${name}" has been removed.`,
            });
          }}
        />
      ) : (
        <ParticipateTab
          onViewSession={handleViewSession}
          onOpenCheckIn={handleOpenCheckInModal}
          onViewLogs={(sessionId, sessionName) => {
            setLogsSessionId(sessionId);
            setLogsSessionName(sessionName);
            setLogsModalVisible(true);
          }}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F1F5FF",
  },
  rootDark: {
    backgroundColor: "#0F172A",
  },

  // Primary toggle card
  toggleCard: {
    flexDirection: "row",
    margin: 16,
    marginBottom: 4,
    backgroundColor: "#E8EFFE",
    borderRadius: 20,
    padding: 4,
    // Subtle shadow
    shadowColor: "#001F54",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  toggleCardDark: {
    backgroundColor: "#1E293B",
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 13,
    borderRadius: 16,
  },
  toggleBtnActive: {
    backgroundColor: "#001F54",
    shadowColor: "#001F54",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 7,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.1,
  },
  toggleTextDark: {
    color: "#94A3B8",
  },
  toggleTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  // Context hint subtitle
  contextHint: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94A3B8",
    textAlign: "center",
    letterSpacing: 0.3,
    marginBottom: 12,
  },
  contextHintDark: {
    color: "#475569",
  },

  // Tab body (filter + list)
  tabBody: {
    flex: 1,
    paddingHorizontal: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 12,
    marginBottom: 12,
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#0F172A',
  },

  // Card list
  list: {
    paddingBottom: 32,
  },

  // Loading
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: "#94A3B8",
    fontWeight: "500",
  },

  // Error
  errorText: {
    fontSize: 14,
    color: "#EF4444",
    fontWeight: "600",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 24,
  },
  retryBtn: {
    marginTop: 10,
    paddingHorizontal: 22,
    paddingVertical: 9,
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
  },
  retryText: {
    color: "#2563EB",
    fontWeight: "700",
    fontSize: 13,
  },

  // Empty state
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 56,
    gap: 8,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#94A3B8",
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#CBD5E1",
    fontWeight: "500",
  },

  // Active sessions banner
  activeBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    gap: 8,
  },
  activeBannerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  activeBannerText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#059669",
  },
});
