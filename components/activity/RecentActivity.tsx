import { ThemedText } from "@/components/themed-text";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { Activity, ActivityItem } from "./ActivityItem";

interface RecentActivityProps {
  activities: Activity[];
  onActivityPress?: (activity: Activity) => void;
  onViewAllPress?: () => void;
}

export const RecentActivity: React.FC<RecentActivityProps> = ({
  activities,
  onActivityPress,
  onViewAllPress,
}) => {
  return (
    <View className="mt-5 mb-5 w-full">
      <View className="flex-row justify-between items-center mb-3 px-1">
        <ThemedText className="text-base font-bold text-[#1f4d7a] dark:text-blue-100">
          Recent Activity
        </ThemedText>
        <TouchableOpacity onPress={onViewAllPress}>
          <ThemedText className="text-sm font-semibold text-blue-500">
            View all
          </ThemedText>
        </TouchableOpacity>
      </View>

      <View className="bg-white dark:bg-slate-800 rounded-2xl px-4 py-2 mb-2">
        {activities.length > 0 ? (
          activities.map((activity) => (
            <ActivityItem
              key={activity.id}
              activity={activity}
              onPress={() => {
                if (onActivityPress) {
                  onActivityPress(activity);
                }
              }}
            />
          ))
        ) : (
          <ThemedText className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            No recent activity
          </ThemedText>
        )}
      </View>
    </View>
  );
};
