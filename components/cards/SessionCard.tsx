
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import AnalyticsService, { SessionStats } from "@/api/AnalyticsService";
import SessionService from "@/api/SessionService";
import { QRModal } from "@/components/modal/QRModal";
import { SessionDetailsModal } from "@/components/modal/SessionDetailsModal";
import { BackendSession } from "@/types/SessionTypes";
import { formatDuration, formatTime12hr } from "@/utils/timeUtils";


export type AttendanceStatus = "Present" | "Absent" | "Missed" | null;

interface SessionCardProps {
  session: BackendSession;
  onManageSession?: () => void;
  onCheckIn?: () => void;
  onViewDetails?: () => void;
  onLiveAttendance?: () => void;
  /** Called after a successful delete — parent should remove this session from its list. */
  onDeleteSession?: (sessionId: number) => void;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    upcoming: { label: "Upcoming", color: "#3B82F6" },
    active:   { label: "Active",   color: "#22C55E" },
    on_break: { label: "On Break", color: "#EAB308" },
    past:     { label: "Past",     color: "#6B7280" },
};

// ── Schedule helpers ──────────────────────────────────────────────────────
const SHORT_DAY: Record<string, string> = {
  monday: "Mon", tuesday: "Tue", wednesday: "Wed",
  thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun",
};

const FMT_DATE = (d: string) => {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const FMT_DATE_SHORT = (d: string) => {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const ORDINAL_LABEL: Record<string, string> = {
  "1st": "1st", "2nd": "2nd", "3rd": "3rd",
  "4th": "4th", "5th": "5th", last: "Last",
};

interface ScheduleChip {
  icon: string;
  typeLabel: string;         // e.g. "TERM"
  typeColor: string;         // badge background
  typeBg: string;
  lines: string[];           // main info rows
  days?: string[];           // day pills (optional)
}

const buildScheduleChip = (schedule: any): ScheduleChip | null => {
  if (!schedule) return null;
  const s = schedule;
  const time = `${formatTime12hr(s.start_time)} – ${formatTime12hr(s.end_time)}`;

  switch (s.type) {
    case "one-time":
      return {
        icon: "calendar-outline",
        typeLabel: "ONE-TIME",
        typeColor: "#3B82F6", typeBg: "#EFF6FF",
        lines: [FMT_DATE(s.start_date), time],
      };
    case "daily":
      return {
        icon: "today-outline",
        typeLabel: "DAILY",
        typeColor: "#8B5CF6", typeBg: "#F5F3FF",
        lines: [`${FMT_DATE_SHORT(s.start_date)} → ${FMT_DATE_SHORT(s.end_date)}`, time],
      };
    case "weekly": {
      const dow: string[] = s.days_of_week || [];
      return {
        icon: "calendar-clear-outline",
        typeLabel: "WEEKLY",
        typeColor: "#0EA5E9", typeBg: "#F0F9FF",
        lines: [`${FMT_DATE_SHORT(s.start_date)} → ${FMT_DATE_SHORT(s.end_date)}`, time],
        days: dow.map(d => SHORT_DAY[d] ?? d),
      };
    }
    case "monthly": {
      const mode = s.month_mode;
      let recur = "";
      if (mode === "specific_date") {
        recur = `Day ${s.day_of_month} of every month`;
      } else {
        const wn = ORDINAL_LABEL[s.week_number] ?? s.week_number;
        const wd = SHORT_DAY[s.weekday] ?? s.weekday;
        recur = `${wn} ${wd} of every month`;
      }
      return {
        icon: "calendar-number-outline",
        typeLabel: "MONTHLY",
        typeColor: "#F59E0B", typeBg: "#FFFBEB",
        lines: [recur, `${FMT_DATE_SHORT(s.start_date)} → ${FMT_DATE_SHORT(s.end_date)}`, time],
      };
    }
    case "term": {
      const days: string[] = s.days || [];
      const dur = s.term_duration ? `${s.term_duration}-wk term` : "Term";
      return {
        icon: "library-outline",
        typeLabel: "TERM",
        typeColor: "#10B981", typeBg: "#F0FDF4",
        lines: [`${dur}  ·  ${FMT_DATE_SHORT(s.start_date)} → ${FMT_DATE_SHORT(s.end_date)}`, time],
        days: days.map(d => SHORT_DAY[d] ?? d),
      };
    }
    case "custom": {
      const cnt = (s.dates ?? []).length;
      return {
        icon: "construct-outline",
        typeLabel: "CUSTOM",
        typeColor: "#6B7280", typeBg: "#F8FAFC",
        lines: [`${cnt} selected date${cnt !== 1 ? "s" : ""}`, time],
      };
    }
    default:
      return {
        icon: "time-outline",
        typeLabel: (s.type ?? "SCHEDULE").toUpperCase(),
        typeColor: "#6B7280", typeBg: "#F8FAFC",
        lines: [time],
      };
  }
};

const ATTENDANCE_CONFIG: Record<
  string,
  { textClass: string; bgClass: string }
> = {
  Present: {
    textClass: "text-[#0D9488] dark:text-teal-400",
    bgClass: "bg-teal-50 dark:bg-teal-950/20",
  },
  Absent: {
    textClass: "text-red-700 dark:text-red-300",
    bgClass: "bg-red-50 dark:bg-red-950/20",
  },
  Missed: {
    textClass: "text-red-700 dark:text-red-300",
    bgClass: "bg-red-50 dark:bg-red-950/20",
  },
};

export const SessionCard: React.FC<SessionCardProps> = ({
  session,
  onManageSession,
  onCheckIn,
  onViewDetails,
  onLiveAttendance,
  onDeleteSession,
}) => {
  // Internal fallback — used when no onViewDetails prop is supplied
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Fetch analytics for all sessions
  useEffect(() => {
    if (session.session_id) {
      setStatsLoading(true);
      AnalyticsService.getSessionStats(session.session_id)
        .then((data) => setStats(data))
        .catch(() => setStats(null))
        .finally(() => setStatsLoading(false));
    }
  }, [session.session_id]);

  const hasQrPayload = !!(
    session.qr_payload &&
    Object.keys(session.qr_payload).length > 0
  );

  const [copied, setCopied] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleCopyCode = async () => {
    if (!session.session_code) return;
    await Clipboard.setStringAsync(session.session_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadReport = async () => {
    if (downloadingReport) return;
    setDownloadingReport(true);
    try {
      const data = await SessionService.getSessionReport(session.session_id);
      
      // Convert arraybuffer to base64
      const uint8 = new Uint8Array(data);
      let binary = "";
      for (let i = 0; i < uint8.length; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      const base64 = btoa(binary);

      const fileUri = `${FileSystem.cacheDirectory}report_session_${session.session_id}.pdf`;
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: "base64",
      });
      await Sharing.shareAsync(fileUri, {
        mimeType: "application/pdf",
        dialogTitle: "Share Session Report",
        UTI: "com.adobe.pdf",
      });
    } catch (err: any) {
      console.error("[SessionCard] Report download error:", err);
      Alert.alert("Download Failed", "Could not download the report. Please try again.");
    } finally {
      setDownloadingReport(false);
    }
  };

  // Opens the details modal: prefer the lifted handler (screen-level modal),
  // fall back to internal state so standalone use still works.
  const openDetails = () => {
    if (onViewDetails) {
      onViewDetails();
    } else {
      setDetailsVisible(true);
    }
  };

  // ── Delete session handler ──
  const handleDelete = () => {
    Alert.alert(
      "Delete Session",
      `Are you sure you want to delete "${session.session_name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              if (onDeleteSession) {
                // Let the parent (usually context) handle the API call and state removal
                await onDeleteSession(session.session_id);
              } else {
                // Fallback for standalone usage
                const response = await SessionService.deleteSession(session.session_id);
                if (response?.success === false) {
                  Alert.alert(
                    "Delete Failed",
                    response?.message || "The server could not delete this session."
                  );
                  return;
                }
              }
            } catch (err: any) {
              console.error("[SessionCard] Delete error:", err);
              Alert.alert(
                "Delete Failed",
                err?.response?.data?.message ||
                  err?.message ||
                  "Could not delete session. Please try again."
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  // Ensure we use the exact unmodified raw status from the backend
  const rawStatus = session.session_status || "upcoming";
  const { label, color } = STATUS_MAP[rawStatus] ?? STATUS_MAP["upcoming"];

  const isSupervisor =
    session.role_type === "Supervisors" ||
    session.role_type?.toLowerCase().includes("supervisor") ||
    session.role_type?.toLowerCase().includes("creator");

  const instructorLabel =
    session.details?.instructor ||
    session.details?.speaker ||
    "No Instructor";

  const locationLabel =
    session.location?.name ||
    session.location?.room ||
    session.location?.address ||
    session.location?.platform ||
    "Not specified";

  const durationLabel = session.required_time_rendered
    ? formatDuration(session.required_time_rendered)
    : "TBA";

  const formattedSetup = session.session_setup
    ? session.session_setup.replace("_", " ").toUpperCase()
    : "GENERAL";

  return (
    <>
      {/* Internal fallback modal (only shown when parent doesn't supply onViewDetails) */}
      {!onViewDetails && (
        <SessionDetailsModal
          session={session}
          visible={detailsVisible}
          onClose={() => setDetailsVisible(false)}
          onManageSession={onManageSession}
          onCheckIn={onCheckIn}
        />
      )}

      {/* QR Code Modal */}
      {hasQrPayload && (
        <QRModal
          visible={qrModalVisible}
          qrPayload={session.qr_payload}
          sessionName={session.session_name}
          sessionCode={session.session_code}
          sessionId={session.session_id}
          qrConfig={session.qr_config}
          isActive={rawStatus === "active"}
          onClose={() => setQrModalVisible(false)}
        />
      )}

      <View>
        <View
          className={`bg-white dark:bg-slate-800 border rounded-2xl mb-4 shadow-sm overflow-hidden`}
          style={{ borderColor: `${color}30` }}
        >
          {/* Status header */}
          <View
            className={`flex-row justify-between items-center px-4 py-2`}
            style={{ backgroundColor: `${color}10` }}
          >
            <View className="flex-row items-center gap-2">
              <Text
                className={`text-[10px] font-extrabold uppercase tracking-widest`}
                style={{ color: color }}
              >
                • {label}
              </Text>
              {session.session_code && (
                <TouchableOpacity
                  activeOpacity={0.6}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    handleCopyCode();
                  }}
                  className="flex-row items-center bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded gap-1 ml-1"
                >
                  <Text className={`text-[10px] font-mono tracking-widest`} style={{ color: color }}>
                    {session.session_code}
                  </Text>
                  <Ionicons
                    name={copied ? "checkmark-outline" : "copy-outline"}
                    size={10}
                    color={color}
                  />
                  {copied && (
                    <Text className={`text-[9px] font-bold ml-0.5`} style={{ color: color }}>
                      Copied!
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            <View className="flex-row items-center gap-1.5">
              <View className="flex-row items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/40 dark:bg-black/20">
                <Ionicons 
                  name={
                    session.session_setup === "remote" ? "laptop-outline" :
                    session.session_setup === "hybrid" ? "swap-horizontal-outline" :
                    "business-outline"
                  } 
                  size={10} 
                  color={color} 
                />
                <Text className={`text-[9px] font-bold`} style={{ color: color }}>
                  {formattedSetup}
                </Text>
              </View>
              <View className="px-1.5 py-0.5 rounded-md bg-white/40 dark:bg-black/20">
                <Text className={`text-[9px] font-bold`} style={{ color: color }}>
                   {session.role_type.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          {/* Card body */}
          <View className="p-4">
            <View className="flex-row items-start justify-between mb-1">
              <Text className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight flex-1 mr-2" numberOfLines={2}>
                {session.session_name}
              </Text>
              {/* Delete — supervisor only, beside the title */}
              {isSupervisor && (
                <TouchableOpacity
                  activeOpacity={0.6}
                  disabled={deleting}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    handleDelete();
                  }}
                  style={[
                    deleteStyles.button,
                    deleting && deleteStyles.buttonDisabled,
                  ]}
                >
                  {deleting ? (
                    <ActivityIndicator size={14} color="#EF4444" />
                  ) : (
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* ── Schedule Chip ── */}
            {(() => {
              const chip = buildScheduleChip(session.schedule);
              if (!chip) return null;
              return (
                <View style={scheduleStyles.chip}>
                  {/* Type badge */}
                  <View style={[scheduleStyles.typeBadge, { backgroundColor: chip.typeBg }]}>
                    <Ionicons name={chip.icon as any} size={12} color={chip.typeColor} />
                    <Text style={[scheduleStyles.typeLabel, { color: chip.typeColor }]}>
                      {chip.typeLabel}
                    </Text>
                  </View>

                  {/* Info lines */}
                  <View style={scheduleStyles.infoCol}>
                    {chip.lines.map((line, i) => (
                      <Text
                        key={i}
                        style={[
                          i === 0 ? scheduleStyles.lineMain : scheduleStyles.lineSub,
                        ]}
                        numberOfLines={1}
                      >
                        {line}
                      </Text>
                    ))}

                    {/* Day pills */}
                    {chip.days && chip.days.length > 0 && (
                      <View style={scheduleStyles.dayRow}>
                        {chip.days.map(d => (
                          <View key={d} style={[scheduleStyles.dayPill, { borderColor: chip.typeColor + "60", backgroundColor: chip.typeBg }]}>
                            <Text style={[scheduleStyles.dayPillText, { color: chip.typeColor }]}>{d}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              );
            })()}

            {session.details?.agenda && (
              <Text
                className="text-sm text-slate-500 dark:text-slate-400 mb-3"
                numberOfLines={2}
              >
                {session.details.agenda}
              </Text>
            )}

            {/* ── Analytics block ── */}
              <View className="bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-3 mb-4">
                {statsLoading ? (
                  <ActivityIndicator size="small" color={color} />
                ) : stats ? (
                  <View className="gap-2">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[11px] font-bold text-slate-500">
                        👥 Joined:
                      </Text>
                      <Text className="text-[11px] font-extrabold text-slate-900 dark:text-white">
                        {stats.total_enrolled}
                      </Text>
                    </View>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[11px] font-bold text-slate-500">
                        ✅ Attended:
                      </Text>
                      <Text className="text-[11px] font-extrabold text-slate-900 dark:text-white">
                        {(stats.outcomes?.complete || 0) + (stats.outcomes?.incomplete || 0)}
                      </Text>
                    </View>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[11px] font-bold text-slate-500">
                        🟢 In Room:
                      </Text>
                      <Text className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">
                        {stats.live_count}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text className="text-[11px] text-slate-400 text-center">Analytics unavailable</Text>
                )}
              </View>

            {/* Info grid */}
            <View className="flex-row flex-wrap gap-y-2 mb-4">
              <View className="w-1/2 flex-row items-center gap-1.5 pr-2">
                <Ionicons name="location-outline" size={14} color="#64748b" />
                <Text
                  className="text-xs text-slate-600 dark:text-slate-300 flex-1"
                  numberOfLines={1}
                >
                  {locationLabel}
                </Text>
              </View>

              <View className="w-1/2 flex-row items-center gap-1.5 pl-2">
                <Ionicons name="time-outline" size={14} color="#64748b" />
                <Text
                  className="text-xs text-slate-600 dark:text-slate-300 flex-1"
                  numberOfLines={1}
                >
                  {durationLabel}
                </Text>
              </View>

              <View className="w-1/2 flex-row items-center gap-1.5 pr-2">
                <Ionicons name="person-outline" size={14} color="#64748b" />
                <Text
                  className="text-xs text-slate-600 dark:text-slate-300 flex-1"
                  numberOfLines={1}
                >
                  {instructorLabel}
                </Text>
              </View>
            </View>

              {/* Action buttons based on Role */}
            <View className="flex-col gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/50">
              
              <View className="flex-row justify-between items-center w-full">
                <View className="flex-row gap-2">
                  
                  {/* Common Action: View Details */}
                <TouchableOpacity
                  className={`flex-row items-center px-4 py-2 rounded-xl gap-1.5 ${
                    rawStatus === "active"
                      ? "bg-slate-900 dark:bg-slate-100"
                      : "bg-slate-100 dark:bg-slate-800"
                  }`}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    openDetails();
                  }}
                >
                  <Ionicons
                    name={rawStatus === "active" ? "folder-open-outline" : "document-text-outline"}
                    size={15}
                    color={rawStatus === "active" ? "#94a3b8" : "#64748b"}
                  />
                  <Text
                    className={`text-xs font-bold ${
                      rawStatus === "active"
                        ? "text-white dark:text-black"
                        : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {rawStatus === "active" ? "Open Session" : "View"}
                  </Text>
                </TouchableOpacity>

                {/* Download Report (Supervisor, Past) */}
                {isSupervisor && rawStatus === "past" && (
                  <TouchableOpacity
                    className="flex-row items-center bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 px-3 py-2 rounded-xl gap-1.5"
                    disabled={downloadingReport}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      handleDownloadReport();
                    }}
                  >
                    {downloadingReport ? (
                      <ActivityIndicator size={14} color="#64748B" />
                    ) : (
                      <Ionicons name="download-outline" size={14} color="#64748B" />
                    )}
                    <Text className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      {downloadingReport ? "..." : "Report"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* QR Code button — always shown if payload exists */}
              {hasQrPayload && (
                <TouchableOpacity
                  className="flex-row items-center bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 px-3 py-2 rounded-xl gap-1.5"
                  onPress={(e) => {
                    e.stopPropagation?.();
                    setQrModalVisible(true);
                  }}
                >
                  <Ionicons name="qr-code-outline" size={14} color="#4F46E5" />
                  <Text className="text-xs font-bold text-indigo-700 dark:text-indigo-400">Show QR</Text>
                </TouchableOpacity>
              )}

              {session.attended && (
                <View className="bg-emerald-50 px-2 py-1 rounded-md">
                   <Text className="text-[9px] font-black text-emerald-700 uppercase">Confirmed</Text>
                </View>
              )}
              </View>

              {/* View Live Attendees Button */}
              {rawStatus === "active" && onLiveAttendance && (
                <TouchableOpacity
                  className="w-full flex-row items-center justify-center bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/50 py-2.5 rounded-xl gap-2 mt-1"
                  onPress={(e) => {
                    e.stopPropagation?.();
                    onLiveAttendance();
                  }}
                >
                  <Ionicons name="people-circle-outline" size={18} color="#4F46E5" />
                  <Text className="text-[13px] font-bold text-indigo-700 dark:text-indigo-400">
                    View Live Attendees
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>
    </>
  );
};

// ── Delete button styles ─────────────────────────────────────────────────────
const deleteStyles = StyleSheet.create({
  button: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2, // align with first line of title
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

// ── Schedule chip styles ──────────────────────────────────────────────────────
const scheduleStyles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 1,
    minWidth: 72,
    justifyContent: "center",
  },
  typeLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  infoCol: {
    flex: 1,
    gap: 2,
  },
  lineMain: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  lineSub: {
    fontSize: 11,
    fontWeight: "500",
    color: "#64748B",
  },
  dayRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 5,
  },
  dayPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  dayPillText: {
    fontSize: 10,
    fontWeight: "700",
  },
});

