import React, { useEffect } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, Button } from "react-native";
import { useSession } from "../../hooks/useSession";

export default function DebugScreen() {
  const { sessions, getSessions, loading, error, addSession, removeSession } = useSession();

  // Fetch sessions on mount
  useEffect(() => {
    getSessions();
  }, [getSessions]);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>🚀 Debug Session Tab</Text>

      {/* Loading */}
      {loading.list && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text>Loading sessions...</Text>
        </View>
      )}

      {/* Error */}
      {error.list && (
        <View style={styles.center}>
          <Text style={{ color: "red" }}>Error: {error.list}</Text>
        </View>
      )}

      {/* Sessions Count */}
      {!loading.list && !error.list && (
        <Text style={styles.info}>Total sessions: {sessions.length}</Text>
      )}

      {/* Dump raw JSON */}
      {!loading.list && !error.list && (
        <Text style={styles.json}>{JSON.stringify(sessions, null, 2)}</Text>
      )}

      {/* Example: Add a session */}
      <Button
        title={loading.add ? "Adding..." : "Add Session"}
        onPress={() => addSession({ name: "New Meeting" })}
        disabled={loading.add}
      />

      {/* Example: Remove last session */}
      <Button
        title={loading.remove ? "Removing..." : "Remove Last Session"}
        onPress={() => sessions.length > 0 && removeSession(sessions[sessions.length - 1].id)}
        disabled={loading.remove || sessions.length === 0}
      />
    </ScrollView>
  );
}



const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f8f9fa" },
  header: { fontSize: 20, fontWeight: "bold", marginBottom: 16 },
  center: { alignItems: "center", justifyContent: "center", marginVertical: 16 },
  info: { marginBottom: 16, fontWeight: "600" },
  json: { fontFamily: "Courier", fontSize: 12, color: "#111" },
});