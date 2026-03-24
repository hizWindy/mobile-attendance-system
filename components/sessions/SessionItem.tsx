import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

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

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  dateBox: {
    alignItems: "center",
    marginRight: 12,
    minWidth: 50,
  },
  dateMonth: {
    fontSize: 11,
    color: "#999",
    fontWeight: "600",
  },
  dateDay: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1f4d7a",
  },
  contentContainer: {
    flex: 1,
  },
  sessionName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1f4d7a",
    marginBottom: 2,
  },
  sessionTime: {
    fontSize: 12,
    color: "#999",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadgeConfirmed: {
    backgroundColor: "#e8f5e9",
  },
  statusBadgePending: {
    backgroundColor: "#fff3e0",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  statusTextConfirmed: {
    color: "#4caf50",
  },
  statusTextPending: {
    color: "#ff9800",
  },
});

export const SessionItem: React.FC<SessionItemProps> = ({
  session,
  onPress,
}) => {
  const isConfirmed = session.status === "CONFIRMED";

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.dateBox}>
        <Text style={styles.dateMonth}>{session.date.split(" ")[0]}</Text>
        <Text style={styles.dateDay}>{session.date.split(" ")[1]}</Text>
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.sessionName}>{session.name}</Text>
        <Text style={styles.sessionTime}>{session.time}</Text>
      </View>

      <View
        style={[
          styles.statusBadge,
          isConfirmed ? styles.statusBadgeConfirmed : styles.statusBadgePending,
        ]}
      >
        <Text
          style={[
            styles.statusText,
            isConfirmed ? styles.statusTextConfirmed : styles.statusTextPending,
          ]}
        >
          {session.status}
        </Text>
      </View>
    </TouchableOpacity>
  );
};
