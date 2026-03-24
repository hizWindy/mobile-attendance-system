import { Session, SessionCard } from "@/components/cards/SessionCard";
import { SegmentedTab } from "@/components/tabs/SegmentedTab";
import { MOCK_SESSIONS } from "@/constants/SessionMockUps"; // import your mock sessions
import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

type TabType = "all" | "active" | "past" | "upcoming";

const SessionScreen = () => {
  const [activeTab, setActiveTab] = useState<TabType>("all");

  // Filter sessions based on active tab
  const filteredSessions = MOCK_SESSIONS.filter((s) => {
    if (activeTab === "all") return true;
    if (activeTab === "active") return s.status === "action-now";
    if (activeTab === "past")
      return s.status === "completed" || s.status === "missed";
    if (activeTab === "upcoming") return s.status === "upcoming";
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

      {/* Sessions */}
      <ScrollView contentContainerStyle={styles.cardsContainer}>
        {filteredSessions.map((session: Session) => (
          <SessionCard
            key={session.id}
            session={session}
            onManageSession={() => alert(`Manage ${session.title}`)}
            onCheckIn={() => alert(`Check-in ${session.title}`)}
            onViewDetails={() => alert(`View details of ${session.title}`)}
          />
        ))}
      </ScrollView>
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
});

export default SessionScreen;
