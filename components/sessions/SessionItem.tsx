import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

export interface Session {
  id: string;
  date: string;
  name: string;
  time: string;
  status: "CONFIRMED" | "PENDING";
}

interface SessionItemProps {
  session: Session;
  onPress?: () => void;
}

export const SessionItem: React.FC<SessionItemProps> = ({
  session,
  onPress,
}) => {
  const isConfirmed = session.status === "CONFIRMED";
  const [month, day] = session.date.split(" ");

  return (
    <TouchableOpacity 
      className="flex-row items-center py-3 border-b border-gray-100 dark:border-slate-800" 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View className="items-center mr-3 min-w-[50px]">
        <Text className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold uppercase">{month}</Text>
        <Text className="text-lg font-extrabold text-[#1f4d7a] dark:text-blue-100">{day}</Text>
      </View>

      <View className="flex-1">
        <Text className="text-sm font-bold text-[#1f4d7a] dark:text-blue-100 mb-0.5">{session.name}</Text>
        <Text className="text-xs text-gray-500 dark:text-gray-400">{session.time}</Text>
      </View>

      <View
        className={`px-2.5 py-1 rounded-full items-center justify-center ${
          isConfirmed ? "bg-emerald-50 dark:bg-emerald-950" : "bg-orange-50 dark:bg-orange-950"
        }`}
      >
        <Text
          className={`text-[11px] font-bold ${
            isConfirmed ? "text-emerald-600 dark:text-emerald-400" : "text-orange-500 dark:text-orange-400"
          }`}
        >
          {session.status}
        </Text>
      </View>
    </TouchableOpacity>
  );
};
