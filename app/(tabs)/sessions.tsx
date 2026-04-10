import { SessionCard } from "@/components/cards/SessionCard";
import { SegmentedTab } from "@/components/tabs/SegmentedTab";
import { useSession } from "@/hooks/useSession";
import { BackendSession } from "@/types/SessionTypes";
import { useFocusEffect } from "expo-router";
import React, { useState, useCallback } from "react";
import { ScrollView, StyleSheet, View, Text, ActivityIndicator, RefreshControl } from "react-native";
import { getSessionTimeStatus } from "@/utils/timeUtils";

type TabType = "all" | "active" | "past" | "upcoming";

const SessionScreen = () => {
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const { sessions, loading, error, getSessions, addSession } = useSession();

  // Efficiently reload sessions automatically ONLY when the user views the tab
  useFocusEffect(
    useCallback(() => {
      getSessions();
    }, [getSessions])
  );

  // Filter sessions based on active tab
  const filteredSessions = sessions.filter((s) => {
    const timeStatus = getSessionTimeStatus(s);
    if (activeTab === "all") return true;
    return timeStatus === activeTab;
  });


  return (
    <View style={styles.container}>
      {/* Segmented Tabs */}
      <SegmentedTab
        options={[
          { key: "all", label: "All" },
          { key: "active", label: "Active" },
          { key: "past", label: "Past" },
          { key: "upcoming", label: "Upcoming" },
        ]}
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as TabType)}
      />

      {/* Sessions Loading State */}
      {loading.list && sessions.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1D4ED8" />
          <Text style={styles.loadingText}>Fetching Sessions...</Text>
        </View>
      ) : error.list ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Oops! {error.list}</Text>
        </View>
      ) : (
        /* Sessions Body */
        <ScrollView 
          contentContainerStyle={styles.cardsContainer}
          refreshControl={
            <RefreshControl
              refreshing={loading.list && sessions.length > 0} 
              onRefresh={getSessions}
              colors={["#1D4ED8"]}
              tintColor="#1D4ED8"
            />
          }
        >
          {filteredSessions.length > 0 ? (
            filteredSessions.map((session: BackendSession) => (
              <SessionCard
                key={session.session_id}
                session={session}
                onManageSession={() => alert(`Manage ${session.session_name}`)}
                onCheckIn={() => alert(`Check-in ${session.session_name}`)}
                onViewDetails={() => alert(`View details of ${session.session_name}`)}
              />
            ))
          ) : (
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>No sessions found.</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f2f7ff",
  },
  cardsContainer: {
    paddingVertical: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
  },
  errorText: {
    fontSize: 16,
    color: "#EF4444",
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
  },
});

export default SessionScreen;
