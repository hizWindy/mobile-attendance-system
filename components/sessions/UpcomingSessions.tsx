import { ThemedText } from "@/components/themed-text";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, useColorScheme, View } from "react-native";
import { Session, SessionItem } from "./SessionItem";

interface UpcomingSessionsProps {
  sessions: Session[];
  onSessionPress?: (session: Session) => void;
  onSeeAllPress?: () => void;
}

export const UpcomingSessions: React.FC<UpcomingSessionsProps> = ({
  sessions,
  onSessionPress,
  onSeeAllPress,
}) => {
  const isDark = useColorScheme() === "dark";

  return (
    <View className="mt-5 w-full">
      <View className="flex-row justify-between items-center mb-3 px-1">
        <ThemedText className="text-base font-bold text-[#1f4d7a] dark:text-blue-100">
          Upcoming Sessions
        </ThemedText>
        <TouchableOpacity onPress={onSeeAllPress}>
          <Text style={[styles.viewAll, isDark && styles.viewAllDark]}>
            View All →
          </Text>
        </TouchableOpacity>
      </View>

      <View className="bg-white dark:bg-slate-800 rounded-2xl px-4 py-2 mb-2">
        {sessions.length > 0 ? (
          sessions.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              onPress={() => onSessionPress?.(session)}
            />
          ))
        ) : (
          <ThemedText className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            No upcoming sessions
          </ThemedText>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  viewAll: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  viewAllDark: {
    color: "#FFFFFF",
  },
});
