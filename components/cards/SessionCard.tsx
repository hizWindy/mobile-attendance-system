
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View, Alert } from "react-native";

import AnalyticsService, { SessionStats } from "@/api/AnalyticsService";
import AttendanceService from "@/api/AttendanceService";
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
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    upcoming: { label: "Upcoming", color: "#3B82F6" },
    active:   { label: "Active",   color: "#22C55E" },
    on_break: { label: "On Break", color: "#EAB308" },
    past:     { label: "Past",     color: "#6B7280" },
};

const getScheduleSummary = (schedule: any) => {
    if (!schedule) return "No schedule";
    const { type, start_date, end_date, start_time, end_time, days_of_week = [], interval_days, dates = [] } = schedule;

    const formatDate = (d: string) => {
      if (!d) return "";
      const [year, month, day] = d.split("-");
      return `${year}-${month}-${day}`;
    };
    const formatTime = (t: string) => formatTime12hr(t);

    switch (type) {
        case "one-time":
            return `${formatDate(start_date)}  ·  ${formatTime(start_time)} – ${formatTime(end_time)}`;
        case "daily":
            return `${formatDate(start_date)} – ${formatDate(end_date)}  ·  ${formatTime(start_time)} – ${formatTime(end_time)}`;
        case "weekly":
            return `Every ${(days_of_week||[]).join(", ")}  ·  ${formatTime(start_time)} – ${formatTime(end_time)}`;
        case "every_n_days":
            return `Every ${interval_days} days  ·  ${formatTime(start_time)} – ${formatTime(end_time)}`;
        case "semestral":
            return `${formatDate(start_date)} – ${formatDate(end_date)}  ·  ${formatTime(start_time)} – ${formatTime(end_time)}`;
        case "custom":
            return `${dates.length} dates  ·  ${formatTime(start_time)} – ${formatTime(end_time)}`;
        default:
            return `${formatTime(start_time)} – ${formatTime(end_time)}`;
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
      const data = await AttendanceService.getAttendanceReport(session.session_id);
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
        dialogTitle: "Share Attendance Report",
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
            <Text className="text-lg font-extrabold mb-1 text-slate-900 dark:text-white leading-tight">
              {session.session_name}
            </Text>

            {/* Date and Time Info Summary */}
            <Text className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-3 uppercase tracking-wider">
               {getScheduleSummary(session.schedule)}
            </Text>

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
