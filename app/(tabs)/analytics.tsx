/**
 * app/(tabs)/analytics.tsx
 *
 * Role-aware Analytics screen:
 *  - Supervisor view: overview KPIs, punctuality breakdown, sessions list
 *  - Attendee view: personal KPIs, streak card, time summary, arrival breakdown, session history
 *  - All data fetched live from the backend via AnalyticsService
 *  - No third-party chart libraries — custom progress bars and stat cards only
 */

import AnalyticsService, {
  AttendeeOverview,
  AttendeeSessionItem,
  SupervisorOverview,
  SupervisorSessionItem,
} from "@/api/AnalyticsService";
import { SegmentedTab } from "@/components/tabs/SegmentedTab";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import AnalyticsSessionsModal from "@/components/modal/AnalyticsSessionsModal";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Sub-components ───────────────────────────────────────────────────────────

interface KpiCardProps {
  value: string;
  label: string;
  isDark: boolean;
}

function KpiCard({ value, label, isDark }: KpiCardProps) {
  return (
    <View style={[styles.kpiCard, isDark && styles.kpiCardDark]}>
      <Text style={[styles.kpiValue, isDark && styles.kpiValueDark]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.kpiLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

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

interface SectionHeaderProps {
  title: string;
  isDark: boolean;
  onSeeAll?: () => void;
  seeAllCount?: number;
}

function SectionTitle({ title, isDark, onSeeAll, seeAllCount }: SectionHeaderProps) {
  return (
    <View style={styles.sectionTitleRow}>
      <View style={styles.sectionTitleLeft}>
        <View style={styles.sectionAccent} />
        <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>{title}</Text>
      </View>
      {onSeeAll && (
        <TouchableOpacity style={styles.seeAllBtn} onPress={onSeeAll}>
          <Text style={styles.seeAllText}>See All {seeAllCount ? `(${seeAllCount}) ` : ""}→</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

interface ResultBadgeProps {
  status: string;
}

function ResultBadge({ status }: ResultBadgeProps) {
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

interface ArrivalBadgeProps {
  status: string;
}

function ArrivalBadge({ status }: ArrivalBadgeProps) {
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

// ─── Empty / Error / Loading ──────────────────────────────────────────────────

function LoadingView() {
  return (
    <View style={styles.centerWrap}>
      <ActivityIndicator size="large" color="#4F46E5" />
      <Text style={styles.centerText}>Loading analytics...</Text>
    </View>
  );
}

function ErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.centerWrap}>
      <MaterialCommunityIcons name="wifi-alert" size={40} color="#EF4444" />
      <Text style={[styles.centerText, { color: "#EF4444", marginTop: 12 }]}>{message}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
        <Text style={styles.retryText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Supervisor View ──────────────────────────────────────────────────────────

interface SupervisorViewProps {
  isDark: boolean;
  overview: SupervisorOverview;
  sessions: SupervisorSessionItem[];
  onShowAll: () => void;
}

function SupervisorView({ isDark, overview, sessions, onShowAll }: SupervisorViewProps) {
  return (
    <>
      {/* KPI Row 1 */}
      <View style={styles.kpiRow}>
        <KpiCard value={String(overview.total_sessions)}  label="Sessions"  isDark={isDark} />
        <KpiCard value={String(overview.total_enrolled)}  label="Enrolled"  isDark={isDark} />
        <KpiCard value={fmtPct(overview.overall_completion_rate)} label="Complete" isDark={isDark} />
      </View>

      {/* KPI Row 2 */}
      <View style={styles.kpiRow}>
        <KpiCard value={String(overview.active_sessions)}   label="Active"      isDark={isDark} />
        <KpiCard value={fmtPct(overview.overall_attendance_rate)} label="Attendance" isDark={isDark} />
        <KpiCard value={String(overview.total_no_checkout)} label="No Checkout" isDark={isDark} />
      </View>

      {/* Punctuality Breakdown */}
      <View style={[styles.card, isDark && styles.cardDark]}>
        <SectionTitle title="Punctuality Breakdown" isDark={isDark} />
        <View style={styles.cardBody}>
          <ProgressRow label="On-time" pct={overview.overall_on_time_rate} color="#22C55E" isDark={isDark} />
          <ProgressRow label="Late"    pct={overview.overall_late_rate}    color="#F97316" isDark={isDark} />
          <ProgressRow label="Missed"  pct={overview.overall_missed_rate}  color="#EF4444" isDark={isDark} />
        </View>
      </View>

      {/* Sessions List */}
      <View style={[styles.card, isDark && styles.cardDark]}>
        <SectionTitle 
          title="My Sessions Performance" 
          isDark={isDark} 
          onSeeAll={sessions.length > 3 ? onShowAll : undefined}
          seeAllCount={sessions.length > 3 ? sessions.length : undefined}
        />
        {sessions.length === 0 ? (
          <Text style={styles.emptyText}>No sessions found.</Text>
        ) : (
          sessions.slice(0, 3).map((s, i) => (
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
          ))
        )}
      </View>
    </>
  );
}

// ─── Attendee View ────────────────────────────────────────────────────────────

interface AttendeeViewProps {
  isDark: boolean;
  overview: AttendeeOverview;
  sessions: AttendeeSessionItem[];
  onShowAll: () => void;
}

function AttendeeView({ isDark, overview, sessions, onShowAll }: AttendeeViewProps) {
  return (
    <>
      {/* KPI Row 1 */}
      <View style={styles.kpiRow}>
        <KpiCard value={String(overview.total_sessions_joined)} label="Joined"   isDark={isDark} />
        <KpiCard value={fmtPct(overview.completion_rate)}       label="Complete" isDark={isDark} />
        <KpiCard value={fmtPct(overview.on_time_rate)}          label="On-time"  isDark={isDark} />
      </View>

      {/* Streak Card */}
      <View style={styles.streakCard}>
        <View style={styles.streakItem}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <Text style={styles.streakValue}>{overview.current_streak}</Text>
          <Text style={styles.streakLabel}>Current Streak</Text>
        </View>
        <View style={styles.streakDivider} />
        <View style={styles.streakItem}>
          <Text style={styles.streakEmoji}>🏆</Text>
          <Text style={[styles.streakValue, styles.streakLongest]}>{overview.longest_streak}</Text>
          <Text style={styles.streakLabel}>Longest Streak</Text>
        </View>
      </View>

      {/* Time Summary */}
      <View style={[styles.card, isDark && styles.cardDark]}>
        <SectionTitle title="⏱️ Time Summary" isDark={isDark} />
        <View style={styles.timeSummary}>
          <View style={styles.timeSummaryItem}>
            <Text style={[styles.timeSummaryValue, isDark && styles.textPrimaryDark]}>
              {fmtSecs(overview.total_time_rendered_secs)}
            </Text>
            <Text style={styles.timeSummaryLabel}>Total Time</Text>
          </View>
          <View style={[styles.timeDivider, isDark && styles.timeDividerDark]} />
          <View style={styles.timeSummaryItem}>
            <Text style={[styles.timeSummaryValue, isDark && styles.textPrimaryDark]}>
              {fmtSecs(overview.avg_time_rendered_secs)}
            </Text>
            <Text style={styles.timeSummaryLabel}>Avg per Session</Text>
          </View>
          <View style={[styles.timeDivider, isDark && styles.timeDividerDark]} />
          <View style={styles.timeSummaryItem}>
            <Text style={[styles.timeSummaryValue, { color: "#EF4444" }]}>{overview.no_checkout_count}</Text>
            <Text style={styles.timeSummaryLabel}>No Checkout</Text>
          </View>
        </View>
      </View>

      {/* Arrival Breakdown */}
      <View style={[styles.card, isDark && styles.cardDark]}>
        <SectionTitle title="Arrival Breakdown" isDark={isDark} />
        <View style={styles.cardBody}>
          <ProgressRow label="On-time" pct={overview.on_time_rate} color="#22C55E" isDark={isDark} />
          <ProgressRow label="Late"    pct={overview.late_rate}    color="#F97316" isDark={isDark} />
          <ProgressRow label="Missed"  pct={overview.missed_rate}  color="#EF4444" isDark={isDark} />
        </View>
      </View>

      {/* Session History */}
      <View style={[styles.card, isDark && styles.cardDark]}>
        <SectionTitle 
          title="My Session History" 
          isDark={isDark} 
          onSeeAll={sessions.length > 3 ? onShowAll : undefined}
          seeAllCount={sessions.length > 3 ? sessions.length : undefined}
        />
        {sessions.length === 0 ? (
          <Text style={styles.emptyText}>No sessions found.</Text>
        ) : (
          sessions.slice(0, 3).map((s, i) => (
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
          ))
        )}
      </View>
    </>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AnalyticsScreen() {
  const isDark = useColorScheme() === "dark";
  const [activeTab, setActiveTab] = useState<"attendee" | "supervisor">("attendee");

  const [modalVisible, setModalVisible] = useState(false);
  const [modalRole, setModalRole] = useState<"supervisor" | "attendee" | null>(null);

  // Supervisor state
  const [supOverview, setSupOverview] = useState<SupervisorOverview | null>(null);
  const [supSessions, setSupSessions] = useState<SupervisorSessionItem[]>([]);
  const [supLoading, setSupLoading] = useState(false);
  const [supError, setSupError] = useState<string | null>(null);

  // Attendee state
  const [attOverview, setAttOverview] = useState<AttendeeOverview | null>(null);
  const [attSessions, setAttSessions] = useState<AttendeeSessionItem[]>([]);
  const [attLoading, setAttLoading] = useState(false);
  const [attError, setAttError] = useState<string | null>(null);

  const [refreshing, setRefreshing] = useState(false);

  const fetchSupervisor = useCallback(async () => {
    try {
      setSupLoading(true);
      setSupError(null);
      const [ovRes, sessRes] = await Promise.all([
        AnalyticsService.getSupervisorOverview(),
        AnalyticsService.getSupervisorSessions(),
      ]);
      setSupOverview(ovRes.data);
      setSupSessions(sessRes.data ?? []);
    } catch (e: any) {
      setSupError(e?.response?.data?.detail ?? e?.message ?? "Failed to load supervisor analytics");
    } finally {
      setSupLoading(false);
    }
  }, []);

  const fetchAttendee = useCallback(async () => {
    try {
      setAttLoading(true);
      setAttError(null);
      const [ovRes, sessRes] = await Promise.all([
        AnalyticsService.getAttendeeOverview(),
        AnalyticsService.getAttendeeSessions(),
      ]);
      setAttOverview(ovRes.data);
      setAttSessions(sessRes.data ?? []);
    } catch (e: any) {
      setAttError(e?.response?.data?.detail ?? e?.message ?? "Failed to load attendee analytics");
    } finally {
      setAttLoading(false);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    await Promise.all([fetchSupervisor(), fetchAttendee()]);
  }, [fetchSupervisor, fetchAttendee]);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  const isLoading  = activeTab === "supervisor" ? supLoading  : attLoading;
  const error      = activeTab === "supervisor" ? supError    : attError;
  const onRetry    = activeTab === "supervisor" ? fetchSupervisor : fetchAttendee;

  const renderContent = () => {
    if (isLoading && !refreshing) return <LoadingView />;
    if (error) return <ErrorView message={error} onRetry={onRetry} />;

    if (activeTab === "supervisor") {
      if (!supOverview) return <LoadingView />;
      return (
        <SupervisorView 
          isDark={isDark} 
          overview={supOverview} 
          sessions={supSessions} 
          onShowAll={() => {
            setModalRole("supervisor");
            setModalVisible(true);
          }} 
        />
      );
    }

    if (!attOverview) return <LoadingView />;
    return (
      <AttendeeView 
        isDark={isDark} 
        overview={attOverview} 
        sessions={attSessions} 
        onShowAll={() => {
          setModalRole("attendee");
          setModalVisible(true);
        }} 
      />
    );
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4F46E5"
            colors={["#4F46E5"]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, isDark && styles.textPrimaryDark]}>Analytics</Text>
          <Text style={styles.headerSubtitle}>
            {activeTab === "supervisor" ? "Your sessions at a glance" : "Your personal performance"}
          </Text>
        </View>

        {/* Role Toggle */}
        <View style={styles.tabWrap}>
          <SegmentedTab
            options={[
              { key: "attendee",   label: "📋  As Attendee"   },
              { key: "supervisor", label: "📊  As Supervisor" },
            ]}
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as "attendee" | "supervisor")}
          />
        </View>

        {renderContent()}
      </ScrollView>

      <AnalyticsSessionsModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        role={modalRole}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Layout
  container:      { flex: 1, backgroundColor: "#F9FAFB" },
  containerDark:  { backgroundColor: "#0F172A" },
  scroll:         { padding: 16, paddingBottom: 48 },

  // Header
  header:         { marginBottom: 16 },
  headerTitle:    { fontSize: 24, fontWeight: "800", color: "#111827", letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, fontWeight: "500", color: "#9CA3AF", marginTop: 3 },

  // Tab toggle
  tabWrap: { marginBottom: 20 },

  // KPI Cards
  kpiRow:     { flexDirection: "row", gap: 10, marginBottom: 10 },
  kpiCard:    {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  kpiCardDark:  { backgroundColor: "#1E293B" },
  kpiValue:     { fontSize: 22, fontWeight: "700", color: "#111827", marginBottom: 4 },
  kpiValueDark: { color: "#F9FAFB" },
  kpiLabel:     { fontSize: 11, fontWeight: "500", color: "#9CA3AF", textAlign: "center" },

  // Streak Card
  streakCard: {
    backgroundColor: "#FFF7ED",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 10,
    shadowColor: "#F97316",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  streakItem:    { alignItems: "center", flex: 1 },
  streakEmoji:   { fontSize: 28, marginBottom: 4 },
  streakValue:   { fontSize: 28, fontWeight: "700", color: "#EA580C" },
  streakLongest: { color: "#D97706" },
  streakLabel:   { fontSize: 12, fontWeight: "600", color: "#9A3412", marginTop: 4 },
  streakDivider: { width: 1, height: 60, backgroundColor: "#FED7AA" },

  // Section title
  sectionTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  sectionTitleLeft:{ flexDirection: "row", alignItems: "center" },
  sectionAccent:   { width: 3, height: 18, borderRadius: 2, backgroundColor: "#4F46E5", marginRight: 8 },
  sectionTitle:    { fontSize: 15, fontWeight: "700", color: "#111827" },
  sectionTitleDark:{ color: "#F9FAFB" },
  seeAllBtn:       { paddingVertical: 4, paddingHorizontal: 8 },
  seeAllText:      { fontSize: 12, fontWeight: "700", color: "#4F46E5" },

  // Generic card
  card:     {
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
  cardBody: { gap: 12 },

  // Progress bar
  progressRow:     { marginBottom: 10 },
  progressLabelRow:{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  progressLabel:   { fontSize: 13, fontWeight: "500", color: "#6B7280" },
  progressPct:     { fontSize: 13, fontWeight: "700" },
  progressTrack:   { height: 8, backgroundColor: "#F3F4F6", borderRadius: 4, overflow: "hidden" },
  progressTrackDark:{ backgroundColor: "#334155" },
  progressFill:    { height: 8, borderRadius: 4 },

  // Time summary
  timeSummary:     { flexDirection: "row", justifyContent: "space-around", paddingVertical: 8 },
  timeSummaryItem: { alignItems: "center", flex: 1 },
  timeSummaryValue:{ fontSize: 20, fontWeight: "700", color: "#111827" },
  timeSummaryLabel:{ fontSize: 11, fontWeight: "500", color: "#9CA3AF", marginTop: 4 },
  timeDivider:     { width: 1, backgroundColor: "#E5E7EB", marginVertical: 4 },
  timeDividerDark: { backgroundColor: "#334155" },

  // Session rows inside cards
  sessionRow:           { paddingVertical: 12 },
  sessionRowBorder:     { borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  sessionRowBorderDark: { borderTopColor: "#334155" },
  sessionRowTop:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  sessionName:          { fontSize: 14, fontWeight: "600", color: "#111827", flex: 1, marginRight: 8 },
  sessionStats:         { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  sessionStatItem:      { alignItems: "center" },
  sessionStatValue:     { fontSize: 15, fontWeight: "700", color: "#111827" },
  sessionStatLabel:     { fontSize: 10, color: "#9CA3AF", marginTop: 2 },
  sessionBadgeRow:      { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  sessionTimeText:      { fontSize: 12, color: "#9CA3AF", fontWeight: "500" },

  // Status pill
  statusPill:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusActive:     { backgroundColor: "#DCFCE7" },
  statusPast:       { backgroundColor: "#F1F5F9" },
  statusPillText:   { fontSize: 11, fontWeight: "600" },
  statusActiveText: { color: "#16A34A" },
  statusPastText:   { color: "#64748B" },

  // Badges
  badge:     { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: "600" },

  // Empty / Error / Loading
  emptyText:  { fontSize: 14, color: "#9CA3AF", textAlign: "center", paddingVertical: 20 },
  centerWrap: { alignItems: "center", paddingVertical: 60, paddingHorizontal: 32 },
  centerText: { fontSize: 14, color: "#6B7280", marginTop: 16, textAlign: "center" },
  retryBtn:   { marginTop: 20, backgroundColor: "#4F46E5", paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  retryText:  { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },

  // Dark mode text helpers
  textPrimaryDark:   { color: "#F9FAFB" },
  textSecondaryDark: { color: "#94A3B8" },
});
