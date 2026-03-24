import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

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

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconContainerAttendance: {
    backgroundColor: "#e3f2fd",
  },
  iconContainerManagement: {
    backgroundColor: "#f3e5f5",
  },
  contentContainer: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f4d7a",
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 12,
    color: "#999",
  },
  viewButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#007aff",
  },
});

export const ActivityItem: React.FC<ActivityItemProps> = ({
  activity,
  onPress,
}) => {
  const getIconColor = (type: Activity["type"]) => {
    switch (type) {
      case "attendance":
        return "#1976d2";
      case "management":
        return "#7b1fa2";
      default:
        return "#666";
    }
  };

  const getIconName = (type: Activity["type"]) => {
    switch (type) {
      case "attendance":
        return "check-circle";
      case "management":
        return "cog";
      default:
        return "info";
    }
  };

  const iconColor = getIconColor(activity.type);
  const isAttendance = activity.type === "attendance";

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View
        style={[
          styles.iconContainer,
          isAttendance
            ? styles.iconContainerAttendance
            : styles.iconContainerManagement,
        ]}
      >
        {activity.type === "attendance" ? (
          <Ionicons name="checkmark-circle" size={20} color={iconColor} />
        ) : (
          <MaterialCommunityIcons name="cog" size={20} color={iconColor} />
        )}
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.activityTitle}>{activity.title}</Text>
        <Text style={styles.timestamp}>{activity.timestamp}</Text>
      </View>

      <TouchableOpacity style={styles.viewButton} onPress={onPress}>
        <Text style={styles.viewButtonText}>View</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};
