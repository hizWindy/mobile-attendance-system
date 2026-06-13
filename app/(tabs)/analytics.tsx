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
  sub?: string;
  accent?: string;
  isDark: boolean;
}

function KpiCard({ value, label, sub, accent = "#001F54", isDark }: KpiCardProps) {
  return (
    <View style={[styles.kpiCard, isDark && styles.kpiCardDark]}>
      <View style={[styles.kpiAccentDot, { backgroundColor: accent + "22" }]}>
        <View style={[styles.kpiAccentInner, { backgroundColor: accent }]} />
      </View>
      <Text style={[styles.kpiValue, isDark && styles.kpiValueDark]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={[styles.kpiLabel, isDark && styles.kpiLabelDark]} numberOfLines={2}>{label}</Text>
      {sub ? <Text style={styles.kpiSub}>{sub}</Text> : null}
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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={[styles.progressDot, { backgroundColor: color }]} />
          <Text style={[styles.progressLabel, isDark && styles.textSecondaryDark]}>{label}</Text>
        </View>
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
      <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>{title}</Text>
      {onSeeAll && (
        <TouchableOpacity style={styles.seeAllBtn} onPress={onSeeAll} activeOpacity={0.7}>
          <Text style={styles.seeAllText}>See all{seeAllCount ? ` (${seeAllCount})` : ""}</Text>
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
    complete:   { bg: "#EEF2FF", text: "#001F54", label: "Complete"   },
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
      <ActivityIndicator size="large" color="#001F54" />
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
  const T = isDark ? { bg: "#1E293B", text: "#F1F5F9", sub: "#94A3B8", border: "#334155" }
                   : { bg: "#FFFFFF", text: "#0F172A", sub: "#64748B", border: "#F1F5F9" };
  return (
    <>
      {/* Hero stat — the single most important number */}
      <View style={[styles.heroCard, { backgroundColor: "#001F54" }]}>
        <Text style={styles.heroLabel}>Overall Attendance Rate</Text>
        <Text style={styles.heroValue}>{fmtPct(overview.overall_attendance_rate)}</Text>
        <View style={styles.heroRow}>
          <View style={styles.heroChip}>
            <View style={[styles.heroChipDot, { backgroundColor: "#22C55E" }]} />
            <Text style={styles.heroChipText}>{overview.active_sessions} active</Text>
          </View>
          <View style={styles.heroChip}>
            <View style={[styles.heroChipDot, { backgroundColor: "#F97316" }]} />
            <Text style={styles.heroChipText}>{overview.total_sessions} total</Text>
          </View>
        </View>
      </View>

      {/* 2x2 Stat Grid */}
      <View style={styles.statGrid}>
        {[
          { value: String(overview.total_enrolled),           label: "Enrolled",    accent: "#2563EB" },
          { value: fmtPct(overview.overall_completion_rate),  label: "Completion",  accent: "#22C55E" },
          { value: String(overview.total_no_checkout),        label: "No Checkout", accent: "#EF4444" },
          { value: fmtPct(overview.overall_on_time_rate),     label: "On-time",     accent: "#F97316" },
        ].map((item) => (
          <View key={item.label} style={[styles.statCell, { backgroundColor: T.bg }]}>
            <Text style={[styles.statCellValue, { color: item.accent }]}>{item.value}</Text>
            <Text style={[styles.statCellLabel, { color: T.sub }]}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Punctuality Breakdown */}
      <View style={[styles.card, isDark && styles.cardDark]}>
        <SectionTitle title="Punctuality" isDark={isDark} />
        <View style={styles.cardBody}>
          <ProgressRow label="On-time" pct={overview.overall_on_time_rate} color="#22C55E" isDark={isDark} />
          <ProgressRow label="Late"    pct={overview.overall_late_rate}    color="#F97316" isDark={isDark} />
          <ProgressRow label="Missed"  pct={overview.overall_missed_rate}  color="#EF4444" isDark={isDark} />
        </View>
      </View>

      {/* Sessions List */}
      <View style={[styles.card, isDark && styles.cardDark]}>
        <SectionTitle
          title="Sessions Performance"
          isDark={isDark}
          onSeeAll={sessions.length > 3 ? onShowAll : undefined}
          seeAllCount={sessions.length > 3 ? sessions.length : undefined}
        />
        {sessions.length === 0 ? (
          <Text style={styles.emptyText}>No sessions yet.</Text>
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
              <ProgressRow label="Completion" pct={s.completion_rate} color="#001F54" isDark={isDark} />
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
      {/* Hero — Completion rate */}
      <View style={[styles.heroCard, { backgroundColor: "#001F54" }]}>
        <Text style={styles.heroLabel}>Your Completion Rate</Text>
        <Text style={styles.heroValue}>{fmtPct(overview.completion_rate)}</Text>
        <View style={styles.heroRow}>
          <View style={styles.heroChip}>
            <View style={[styles.heroChipDot, { backgroundColor: "#22C55E" }]} />
            <Text style={styles.heroChipText}>{overview.total_sessions_joined} sessions joined</Text>
          </View>
          <View style={styles.heroChip}>
            <View style={[styles.heroChipDot, { backgroundColor: "#F97316" }]} />
            <Text style={styles.heroChipText}>{fmtPct(overview.on_time_rate)} on-time</Text>
          </View>
        </View>
      </View>

      {/* Streak Card — navy brand */}
      <View style={styles.streakCard}>
        <View style={styles.streakItem}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <Text style={styles.streakValue}>{overview.current_streak}</Text>
          <Text style={styles.streakLabel}>Current streak</Text>
        </View>
        <View style={styles.streakDivider} />
        <View style={styles.streakItem}>
          <Text style={styles.streakEmoji}>🏆</Text>
          <Text style={[styles.streakValue, styles.streakLongest]}>{overview.longest_streak}</Text>
          <Text style={styles.streakLabel}>Best streak</Text>
        </View>
      </View>

      {/* Time Summary */}
      <View style={[styles.card, isDark && styles.cardDark]}>
        <SectionTitle title="Time Rendered" isDark={isDark} />
        <View style={styles.timeSummary}>
          <View style={styles.timeSummaryItem}>
            <Text style={[styles.timeSummaryValue, isDark && styles.textPrimaryDark]}>
              {fmtSecs(overview.total_time_rendered_secs)}
            </Text>
            <Text style={styles.timeSummaryLabel}>Total time</Text>
          </View>
          <View style={[styles.timeDivider, isDark && styles.timeDividerDark]} />
          <View style={styles.timeSummaryItem}>
            <Text style={[styles.timeSummaryValue, isDark && styles.textPrimaryDark]}>
              {fmtSecs(overview.avg_time_rendered_secs)}
            </Text>
            <Text style={styles.timeSummaryLabel}>Avg / session</Text>
          </View>
          <View style={[styles.timeDivider, isDark && styles.timeDividerDark]} />
          <View style={styles.timeSummaryItem}>
            <Text style={[styles.timeSummaryValue, { color: "#EF4444" }]}>{overview.no_checkout_count}</Text>
            <Text style={styles.timeSummaryLabel}>No checkout</Text>
          </View>
        </View>
      </View>

      {/* Arrival Breakdown */}
      <View style={[styles.card, isDark && styles.cardDark]}>
        <SectionTitle title="Arrival Pattern" isDark={isDark} />
        <View style={styles.cardBody}>
          <ProgressRow label="On-time" pct={overview.on_time_rate} color="#22C55E" isDark={isDark} />
          <ProgressRow label="Late"    pct={overview.late_rate}    color="#F97316" isDark={isDark} />
          <ProgressRow label="Missed"  pct={overview.missed_rate}  color="#EF4444" isDark={isDark} />
        </View>
      </View>

      {/* Session History */}
      <View style={[styles.card, isDark && styles.cardDark]}>
        <SectionTitle
          title="Session History"
          isDark={isDark}
          onSeeAll={sessions.length > 3 ? onShowAll : undefined}
          seeAllCount={sessions.length > 3 ? sessions.length : undefined}
        />
        {sessions.length === 0 ? (
          <Text style={styles.emptyText}>No sessions yet.</Text>
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
                color="#001F54"
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
            tintColor="#001F54"
            colors={["#001F54"]}
          />
        }
      >

        {/* Role Toggle */}
        <View style={styles.tabWrap}>
          <SegmentedTab
            options={[
              { key: "attendee",   label: "Attendee"   },
              { key: "supervisor", label: "Supervisor" },
            ]}
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as "attendee" | "supervisor")}
            accentColor="#001F54"
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
  container:      { flex: 1, backgroundColor: "#F0F4FF" },
  containerDark:  { backgroundColor: "#0F172A" },
  scroll:         { padding: 20, paddingBottom: 60 },

  // Tab toggle
  tabWrap: { marginBottom: 24 },

  // ── Hero Card (primary metric) ─────────────────────────────────────────────
  heroCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 12,
    shadowColor: "#001F54",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  heroLabel:    { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.6)", marginBottom: 6, letterSpacing: 0.5, textTransform: "uppercase" },
  heroValue:    { fontSize: 52, fontWeight: "800", color: "#FFFFFF", letterSpacing: -2, lineHeight: 58 },
  heroRow:      { flexDirection: "row", gap: 10, marginTop: 16, flexWrap: "wrap" },
  heroChip:     { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.12)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
  heroChipDot:  { width: 7, height: 7, borderRadius: 4 },
  heroChipText: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.85)" },

  // ── 2x2 Stat Grid ─────────────────────────────────────────────────────────
  statGrid:      { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  statCell:      {
    width: "47.5%",
    borderRadius: 18,
    padding: 16,
    shadowColor: "#001F54",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statCellValue: { fontSize: 24, fontWeight: "800", marginBottom: 4, letterSpacing: -0.4 },
  statCellLabel: { fontSize: 12, fontWeight: "500" },

  // ── KPI Cards ──────────────────────────────────────────────────────────────
  kpiRow:     { flexDirection: "row", gap: 10, marginBottom: 10 },
  kpiCard:    {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    alignItems: "flex-start",
    shadowColor: "#001F54",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  kpiCardDark:   { backgroundColor: "#1E293B" },
  kpiAccentDot:  { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  kpiAccentInner:{ width: 10, height: 10, borderRadius: 5 },
  kpiValue:      { fontSize: 22, fontWeight: "800", color: "#0F172A", marginBottom: 2, letterSpacing: -0.3 },
  kpiValueDark:  { color: "#F1F5F9" },
  kpiLabel:      { fontSize: 11, fontWeight: "500", color: "#94A3B8", lineHeight: 15 },
  kpiLabelDark:  { color: "#64748B" },
  kpiSub:        { fontSize: 10, color: "#CBD5E1", marginTop: 2 },

  // Streak Card
  streakCard: {
    backgroundColor: "#001F54",
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#001F54",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  streakItem:    { alignItems: "center", flex: 1 },
  streakEmoji:   { fontSize: 26, marginBottom: 6 },
  streakValue:   { fontSize: 30, fontWeight: "800", color: "#FFFFFF" },
  streakLongest: { color: "#93B4DD" },
  streakLabel:   { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.5)", marginTop: 4 },
  streakDivider: { width: 1, height: 50, backgroundColor: "rgba(255,255,255,0.15)" },

  // Section title
  sectionTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  sectionTitleLeft:{ flexDirection: "row", alignItems: "center" },
  sectionAccent:   { width: 3, height: 18, borderRadius: 2, backgroundColor: "#001F54", marginRight: 8 },
  sectionTitle:    { fontSize: 15, fontWeight: "700", color: "#111827" },
  sectionTitleDark:{ color: "#F9FAFB" },
  seeAllBtn:       { paddingVertical: 4, paddingHorizontal: 8 },
  seeAllText:      { fontSize: 12, fontWeight: "700", color: "#001F54" },

  // Generic card
  card:     {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    shadowColor: "#001F54",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardDark: { backgroundColor: "#1E293B" },
  cardBody: { gap: 14 },

  // Progress bar
  progressRow:      { marginBottom: 12 },
  progressLabelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  progressDot:      { width: 7, height: 7, borderRadius: 4 },
  progressLabel:    { fontSize: 13, fontWeight: "500", color: "#64748B" },
  progressPct:      { fontSize: 13, fontWeight: "700" },
  progressTrack:    { height: 10, backgroundColor: "#F1F5F9", borderRadius: 8, overflow: "hidden" },
  progressTrackDark:{ backgroundColor: "#334155" },
  progressFill:     { height: 10, borderRadius: 8 },

  // Time summary
  timeSummary:     { flexDirection: "row", justifyContent: "space-around", paddingVertical: 8 },
  timeSummaryItem: { alignItems: "center", flex: 1 },
  timeSummaryValue:{ fontSize: 20, fontWeight: "700", color: "#111827" },
  timeSummaryLabel:{ fontSize: 11, fontWeight: "500", color: "#9CA3AF", marginTop: 4 },
  timeDivider:     { width: 1, backgroundColor: "#E5E7EB", marginVertical: 4 },
  timeDividerDark: { backgroundColor: "#334155" },

  // Session rows inside cards
  sessionRow:           { paddingVertical: 14 },
  sessionRowBorder:     { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#E2E8F0" },
  sessionRowBorderDark: { borderTopColor: "#334155" },
  sessionRowTop:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sessionName:          { fontSize: 14, fontWeight: "600", color: "#0F172A", flex: 1, marginRight: 8 },
  sessionStats:         { flexDirection: "row", justifyContent: "space-between", marginBottom: 12, paddingHorizontal: 2 },
  sessionStatItem:      { alignItems: "center" },
  sessionStatValue:     { fontSize: 16, fontWeight: "700", color: "#0F172A", letterSpacing: -0.2 },
  sessionStatLabel:     { fontSize: 10, color: "#94A3B8", marginTop: 3, fontWeight: "500" },
  sessionBadgeRow:      { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  sessionTimeText:      { fontSize: 12, color: "#94A3B8", fontWeight: "500" },

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
  retryBtn:   { marginTop: 20, backgroundColor: "#001F54", paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  retryText:  { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },

  // Dark mode text helpers
  textPrimaryDark:   { color: "#F9FAFB" },
  textSecondaryDark: { color: "#94A3B8" },
});
