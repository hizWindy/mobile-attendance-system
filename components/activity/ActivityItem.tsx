import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useColorScheme } from "react-native";

export interface Activity {
  id: string;
  type: "attendance" | "management" | "other";
  title: string;
  timestamp: string;
  icon?: string;
}

interface ActivityItemProps {
  activity: Activity;
  onPress?: () => void;
}

export const ActivityItem: React.FC<ActivityItemProps> = ({
  activity,
  onPress,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const getIconColor = (type: Activity["type"]) => {
    switch (type) {
      case "attendance":
        return isDark ? "#60a5fa" : "#1976d2"; // blue-400 : blue-600
      case "management":
        return isDark ? "#c084fc" : "#7b1fa2"; // purple-400 : purple-700
      default:
        return isDark ? "#9ca3af" : "#666666"; // gray-400 : gray-500
    }
  };

  const getBgClass = (type: Activity["type"]) => {
    switch (type) {
      case "attendance":
        return "bg-blue-50 dark:bg-blue-950";
      case "management":
        return "bg-purple-50 dark:bg-purple-950";
      default:
        return "bg-gray-100 dark:bg-slate-800";
    }
  };

  const iconColor = getIconColor(activity.type);
  const bgClass = getBgClass(activity.type);

  return (
    <TouchableOpacity
      className="flex-row items-center py-3 border-b border-gray-100 dark:border-slate-800"
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${bgClass}`}>
        {activity.type === "attendance" ? (
          <Ionicons name="checkmark-circle" size={20} color={iconColor} />
        ) : (
          <MaterialCommunityIcons name="cog" size={20} color={iconColor} />
        )}
      </View>

      <View className="flex-1">
        <Text className="text-sm font-semibold text-[#1f4d7a] dark:text-blue-100 mb-0.5">{activity.title}</Text>
        <Text className="text-xs text-gray-500 dark:text-gray-400">{activity.timestamp}</Text>
      </View>

      {/* 👇 NOT clickable anymore */}
      <Text className="text-xs font-semibold text-blue-500 dark:text-blue-400">View</Text>
    </TouchableOpacity>
  );
};
