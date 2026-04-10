import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

import { SessionDetailsModal } from "@/components/modal/SessionDetailsModal";
import { BackendSession, SessionStatus } from "@/types/SessionTypes";
import { formatDuration, getSessionTimeStatus } from "@/utils/timeUtils";


export type AttendanceStatus = "Present" | "Absent" | "Missed" | null;

interface SessionCardProps {
  session: BackendSession;
  onManageSession?: () => void;
  onCheckIn?: () => void;
  onViewDetails?: () => void;
}

const STATUS_CONFIG: Record<
  SessionStatus,
  {
    label: string;
    textClass: string;
    bgClass: string;
    borderClass: string;
    iconColor: string;
    darkIconColor: string;
  }
> = {
  active: {
    label: "Active Now",
    textClass: "text-[#0D9488] dark:text-teal-400",
    bgClass: "bg-teal-50 dark:bg-teal-950/20",
    borderClass: "border-[#0D9488]/20 dark:border-teal-800",
    iconColor: "#0D9488",
    darkIconColor: "#2DD4BF",
  },
  "action-now": {
    label: "Active Now",
    textClass: "text-[#0D9488] dark:text-teal-400",
    bgClass: "bg-teal-50 dark:bg-teal-950/20",
    borderClass: "border-[#0D9488]/20 dark:border-teal-800",
    iconColor: "#0D9488",
    darkIconColor: "#2DD4BF",
  },
  upcoming: {
    label: "Upcoming",
    textClass: "text-[#3B82F6] dark:text-blue-400",
    bgClass: "bg-blue-50 dark:bg-blue-950/20",
    borderClass: "border-[#3B82F6]/20 dark:border-blue-800",
    iconColor: "#3B82F6",
    darkIconColor: "#60A5FA",
  },
  past: {
    label: "Past Session",
    textClass: "text-[#64748B] dark:text-slate-400",
    bgClass: "bg-slate-50 dark:bg-slate-900/20",
    borderClass: "border-[#64748B]/20 dark:border-slate-800",
    iconColor: "#64748B",
    darkIconColor: "#94A3B8",
  },
  completed: {
    label: "Past Session",
    textClass: "text-[#64748B] dark:text-slate-400",
    bgClass: "bg-slate-50 dark:bg-slate-900/20",
    borderClass: "border-[#64748B]/20 dark:border-slate-800",
    iconColor: "#64748B",
    darkIconColor: "#94A3B8",
  },
  missed: {
    label: "Missed",
    textClass: "text-red-700 dark:text-red-300",
    bgClass: "bg-red-50 dark:bg-red-950/20",
    borderClass: "border-red-200 dark:border-red-800",
    iconColor: "#EF4444",
    darkIconColor: "#FCA5A5",
  },
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
}) => {
  const [detailsVisible, setDetailsVisible] = useState(false);

  const rawStatus = getSessionTimeStatus(session);
  const isPast = rawStatus === "past";
  
  const config = (STATUS_CONFIG as any)[rawStatus] || STATUS_CONFIG["upcoming"];
  
  const instructorLabel =
    session.details?.instructor ||
    session.details?.speaker ||
    "No Instructor";
    
  const locationLabel =
    session.location?.name ||
    session.location?.room ||
    session.location?.address ||
    session.location?.platform ||
    "Location TBA";
    
  const durationLabel = session.required_time_rendered 
    ? formatDuration(session.required_time_rendered) 
    : "TBA";
    
  const formattedSetup = session.session_setup
    ? session.session_setup.replace("_", " ").toUpperCase()
    : "GENERAL";

  return (
    <>
      <SessionDetailsModal
        session={session}
        visible={detailsVisible}
        onClose={() => setDetailsVisible(false)}
        onManageSession={onManageSession}
        onCheckIn={onCheckIn}
      />

      <TouchableOpacity activeOpacity={0.85} onPress={() => setDetailsVisible(true)}>
        <View
          className={`bg-white dark:bg-slate-800 border rounded-2xl mb-4 shadow-sm overflow-hidden ${config.borderClass}`}
        >
          {/* Status header */}
          <View
            className={`flex-row justify-between items-center px-4 py-2 ${config.bgClass}`}
          >
            <View className="flex-row items-center gap-2">
              <Text
                className={`text-[10px] font-extrabold uppercase tracking-widest ${config.textClass}`}
              >
                • {config.label}
              </Text>
              {session.session_code && (
                <Text
                  className={`text-[10px] uppercase font-bold opacity-75 ${config.textClass}`}
                >
                  [{session.session_code}]
                </Text>
              )}
            </View>

            <View className="flex-row items-center gap-1.5">
              <View className="px-1.5 py-0.5 rounded-md bg-white/40 dark:bg-black/20">
                <Text className={`text-[9px] font-bold ${config.textClass}`}>
                  {formattedSetup}
                </Text>
              </View>
              <View className="px-1.5 py-0.5 rounded-md bg-white/40 dark:bg-black/20">
                <Text className={`text-[9px] font-bold ${config.textClass}`}>
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

            {/* Date and Time Info */}
            <Text className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-3 uppercase tracking-wider">
               {session.schedule?.start_date} • {session.schedule?.start_time} - {session.schedule?.end_time}
            </Text>

            {session.details?.agenda && (
              <Text
                className="text-sm text-slate-500 dark:text-slate-400 mb-3"
                numberOfLines={2}
              >
                {session.details.agenda}
              </Text>
            )}

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
            <View className="flex-row items-center pt-3 border-t border-slate-100 dark:border-slate-700/50 justify-between">
              <View className="flex-row gap-2">
                
                {/* 👨‍🏫 SUPERVISOR Actions */}
                {session.role_type === "Supervisors" && onManageSession && (
                  <TouchableOpacity
                    className="flex-row items-center bg-slate-900 dark:bg-slate-100 px-4 py-2 rounded-xl gap-1.5"
                    onPress={(e) => {
                      e.stopPropagation?.();
                      onManageSession();
                    }}
                  >
                    <MaterialCommunityIcons
                      name="cog-outline"
                      size={15}
                      color="white"
                    />
                    <Text className="text-xs font-bold text-white dark:text-black">
                      Manage
                    </Text>
                  </TouchableOpacity>
                )}

                {/* 🧑‍🎓 ATTENDED / ATTENDEE Actions */}
                {session.role_type === "Attendee" && (
                    session.attended ? (
                      <View className="bg-emerald-50 dark:bg-emerald-900/30 px-3 py-2 rounded-xl flex-row items-center gap-1.5">
                        <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                        <Text className="text-xs font-bold text-emerald-600">Attended</Text>
                      </View>
                    ) : (
                      onCheckIn && !isPast && (
                        <TouchableOpacity
                           className="flex-row items-center bg-blue-600 px-4 py-2 rounded-xl gap-1.5"
                           onPress={(e) => {
                             e.stopPropagation?.();
                             onCheckIn();
                           }}
                        >
                           <Ionicons name="scan-outline" size={15} color="#fff" />
                           <Text className="text-xs font-extrabold text-white uppercase tracking-wide">
                             Check In
                           </Text>
                        </TouchableOpacity>
                      )
                    )
                )}

                {isPast && (
                    <TouchableOpacity
                      className="bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl"
                      onPress={(e) => {
                        e.stopPropagation?.();
                        setDetailsVisible(true);
                      }}
                    >
                      <Text className="text-xs font-bold text-slate-500">View History</Text>
                    </TouchableOpacity>
                )}
              </View>

              {session.attended && (
                <View className="bg-emerald-50 px-2 py-1 rounded-md">
                   <Text className="text-[9px] font-black text-emerald-700 uppercase">Confirmed</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </>
  );
};
