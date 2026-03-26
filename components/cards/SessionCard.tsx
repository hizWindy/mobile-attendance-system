import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View, useColorScheme } from "react-native";

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

const STATUS_CONFIG: Record<SessionStatus, { label: string; textClass: string; bgClass: string; borderClass: string; iconColor: string; darkIconColor: string }> = {
  "upcoming": { label: "Upcoming", textClass: "text-blue-700 dark:text-blue-300", bgClass: "bg-blue-50 dark:bg-blue-950", borderClass: "border-blue-200 dark:border-blue-800", iconColor: "#1D4ED8", darkIconColor: "#93C5FD" },
  "action-now": { label: "Action Now", textClass: "text-amber-700 dark:text-amber-300", bgClass: "bg-amber-50 dark:bg-amber-950", borderClass: "border-amber-200 dark:border-amber-800", iconColor: "#B45309", darkIconColor: "#FCD34D" },
  "completed": { label: "Completed", textClass: "text-emerald-700 dark:text-emerald-300", bgClass: "bg-emerald-50 dark:bg-emerald-950", borderClass: "border-emerald-200 dark:border-emerald-800", iconColor: "#065F46", darkIconColor: "#6EE7B7" },
  "missed": { label: "Missed", textClass: "text-red-700 dark:text-red-300", bgClass: "bg-red-50 dark:bg-red-950", borderClass: "border-red-200 dark:border-red-800", iconColor: "#991B1B", darkIconColor: "#FCA5A5" },
};

const ATTENDANCE_CONFIG: Record<string, { textClass: string; bgClass: string }> = {
  Present: { textClass: "text-emerald-700 dark:text-emerald-300", bgClass: "bg-emerald-50 dark:bg-emerald-950" },
  Absent: { textClass: "text-red-700 dark:text-red-300", bgClass: "bg-red-50 dark:bg-red-950" },
  Missed: { textClass: "text-red-700 dark:text-red-300", bgClass: "bg-red-50 dark:bg-red-950" },
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
    <View className={`bg-white dark:bg-slate-800 border rounded-2xl mb-3 overflow-hidden ${config.borderClass}`}>
      {/* Top Status */}
      <View className={`flex-row justify-between px-3 py-1.5 ${config.bgClass}`}>
        <Text className={`text-xs font-bold uppercase ${config.textClass}`}>{config.label}</Text>
        <View className="flex-row items-center gap-2">
          {session.role && <Text className={`text-[10px] font-semibold ${config.textClass}`}>{session.role}</Text>}
          {session.idBadge && <Text className={`text-[10px] opacity-80 ${config.textClass}`}>{session.idBadge}</Text>}
          {session.date && <Text className={`text-[10px] opacity-80 ${config.textClass}`}>{session.date}</Text>}
        </View>
      </View>

      {/* Body */}
      <View className="px-3 py-2.5">
        <Text className="text-base font-bold mb-1 text-black dark:text-white">{session.title}</Text>

        <View className="flex-row items-center gap-1 mb-2">
          <Ionicons name="person-outline" size={12} color="#9CA3AF" />
          <Text className="text-xs text-gray-500 dark:text-gray-400">{session.instructor} · {session.location}</Text>
        </View>

        <View className="flex-row items-center justify-between mt-1">
          <View className="flex-row items-center gap-1 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded-lg">
            <Ionicons name="time-outline" size={13} color="#6B7280" className="dark:color-gray-400" />
            <Text className="text-xs font-semibold text-gray-700 dark:text-gray-300">{session.timeStart} – {session.timeEnd}</Text>
          </View>

          {session.status === "upcoming" && onManageSession && (
            <TouchableOpacity className="flex-row items-center bg-gray-900 dark:bg-gray-100 px-2.5 py-1.5 rounded-xl gap-1" onPress={onManageSession}>
              <MaterialCommunityIcons name="cog-outline" size={14} color="currentColor" className="text-white dark:text-black" />
              <Text className="text-xs font-bold text-white dark:text-black">Manage Session</Text>
            </TouchableOpacity>
          )}

          {session.status === "action-now" && onCheckIn && (
            <TouchableOpacity className="flex-row items-center bg-emerald-600 dark:bg-emerald-500 px-2.5 py-1.5 rounded-xl gap-1" onPress={onCheckIn}>
              <Ionicons name="checkmark-circle-outline" size={14} color="#fff" />
              <Text className="text-xs font-bold text-white">Check In</Text>
            </TouchableOpacity>
          )}

          {(session.status === "completed" || session.status === "missed") && onViewDetails && (
            <TouchableOpacity onPress={onViewDetails} className="py-1">
              <Text className="text-xs font-bold text-blue-500 dark:text-blue-400">View Details</Text>
            </TouchableOpacity>
          )}
        </View>

        {session.attendance && attendanceConfig && (
          <View className="mt-2.5 pt-2 border-t border-gray-200 dark:border-slate-700">
            <Text className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-0.5 uppercase">Attendance</Text>
            <View className={`self-start px-2 py-0.5 rounded-full ${attendanceConfig.bgClass}`}>
              <Text className={`text-[10px] font-bold ${attendanceConfig.textClass}`}>{session.attendance}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};