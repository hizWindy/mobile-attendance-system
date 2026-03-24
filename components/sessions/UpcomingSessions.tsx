import { ThemedText } from "@/components/themed-text";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Session, SessionItem } from "./SessionItem";

interface UpcomingSessionsProps {
  sessions: Session[];
  onSessionPress?: (session: Session) => void;
  onSeeAllPress?: () => void;
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
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
  seeAllText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#007aff",
  },
  sessionsList: {
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

export const UpcomingSessions: React.FC<UpcomingSessionsProps> = ({
  sessions,
  onSessionPress,
  onSeeAllPress,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Upcoming Sessions</ThemedText>
        <TouchableOpacity onPress={onSeeAllPress}>
          <ThemedText style={styles.seeAllText}>See all</ThemedText>
        </TouchableOpacity>
      </View>

      <View style={styles.sessionsList}>
        {sessions.length > 0 ? (
          sessions.map((session, index) => (
            <SessionItem
              key={session.id}
              session={session}
              onPress={() => onSessionPress?.(session)}
            />
          ))
        ) : (
          <ThemedText style={styles.emptyMessage}>
            No upcoming sessions
          </ThemedText>
        )}
      </View>
    </View>
  );
};
