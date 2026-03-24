import { ThemedText } from "@/components/themed-text";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Activity, ActivityItem } from "./ActivityItem";

interface RecentActivityProps {
  activities: Activity[];
  onActivityPress?: (activity: Activity) => void;
  onViewAllPress?: () => void;
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f4d7a",
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#007aff",
  },
  activitiesList: {
    backgroundColor: "white",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    marginHorizontal: 16,
  },
  emptyMessage: {
    fontSize: 13,
    color: "#999",
    textAlign: "center",
    paddingVertical: 16,
  },
});

export const RecentActivity: React.FC<RecentActivityProps> = ({
  activities,
  onActivityPress,
  onViewAllPress,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Recent Activity</ThemedText>
        <TouchableOpacity onPress={onViewAllPress}>
          <ThemedText style={styles.viewAllText}>View all</ThemedText>
        </TouchableOpacity>
      </View>

      <View style={styles.activitiesList}>
        {activities.length > 0 ? (
          activities.map((activity) => (
            <ActivityItem
              key={activity.id}
              activity={activity}
              onPress={() => onActivityPress?.(activity)}
            />
          ))
        ) : (
          <ThemedText style={styles.emptyMessage}>
            No recent activity
          </ThemedText>
        )}
      </View>
    </View>
  );
};
