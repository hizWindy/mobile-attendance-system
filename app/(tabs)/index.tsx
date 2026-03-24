import { Activity } from "@/components/activity/ActivityItem";
import { RecentActivity } from "@/components/activity/RecentActivity";
import { CheckInButton } from "@/components/button/CheckInButton";
import { SupervisorCreateSessionButton } from "@/components/button/SupervisorCreateSessionButton";
import { ActivityModal } from "@/components/modal/ActivityModal";
import { CheckInModal } from "@/components/modal/CheckInModal";
import { CreateSessionModal } from "@/components/modal/CreateSessionModal";
import { SearchSessions } from "@/components/search/SearchSessions";
import { Session } from "@/components/sessions/SessionItem";
import { UpcomingSessions } from "@/components/sessions/UpcomingSessions";
import { SegmentedTab } from "@/components/tabs/SegmentedTab";
import { ThemedText } from "@/components/themed-text";
import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e8eff8",
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "white",
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1f4d7a",
    marginBottom: 12,
  },
  searchContainer: {
    marginBottom: 12,
    alignItems: "center",
  },
  buttonContainer: {
    alignItems: "center",
  },
});

// Sample data - Replace with actual data from API/state management
const SAMPLE_SESSIONS: Session[] = [
  {
    id: "1",
    date: "OCT 12",
    name: "Project Sync: Delta",
    time: "9:30 AM - 11:30 AM",
    status: "CONFIRMED",
  },
  {
    id: "2",
    date: "OCT 14",
    name: "Weekly Tech Review",
    time: "2:00 PM - 2:30 PM",
    status: "PENDING",
  },
];

const SAMPLE_ACTIVITIES: Activity[] = [
  {
    id: "1",
    type: "attendance",
    title: "Attended Dev Workshop",
    timestamp: "Yesterday at 2:30 PM",
  },
  {
    id: "2",
    type: "management",
    title: "Managed 'Product Launch'",
    timestamp: "2 days ago",
  },
];

export default function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [checkInModalVisible, setCheckInModalVisible] = useState(false);
  const [createSessionModalVisible, setCreateSessionModalVisible] =
    useState(false);
  const [activeTab, setActiveTab] = useState<"attendee" | "supervisor">(
    "attendee",
  );

  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null,
  );
  const [activityModalVisible, setActivityModalVisible] = useState(false);

  const [sessions, setSessions] = useState(["ABC123", "DEF456", "GHI789"]);
  const [upcomingSessions, setUpcomingSessions] =
    useState<Session[]>(SAMPLE_SESSIONS);
  const [recentActivities, setRecentActivities] =
    useState<Activity[]>(SAMPLE_ACTIVITIES);

  const handleCheckIn = () => {
    const trimmedQuery = searchQuery.trim();
    const exists = sessions.some(
      (session) => session.toLowerCase() === trimmedQuery.toLowerCase(),
    );
    if (!exists) {
      alert("Session doesn't exist");
    } else {
      setCheckInModalVisible(true);
    }
  };

  const handleCreateSession = (sessionCode: string) => {
    setSessions((prev) => [...prev, sessionCode]);
    setSearchQuery(sessionCode);
    alert(`Session created: ${sessionCode}`);
  };

  const handleSessionPress = (session: Session) => {
    console.log("Session pressed:", session);
  };

  const handleActivityPress = (activity: Activity) => {
    setSelectedActivity(activity);
    setActivityModalVisible(true);
  };
  const handleSeeAllSessions = () => {
    console.log("See all sessions pressed");
  };

  const handleViewAllActivities = () => {
    console.log("View all activities pressed");
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <SegmentedTab
          options={[
            { key: "attendee", label: "Attendee" },
            { key: "supervisor", label: "Supervisor" },
          ]}
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as "attendee" | "supervisor")}
        />

        <View style={styles.card}>
          <ThemedText style={styles.title}>
            {activeTab === "attendee" ? "Join a Session" : "Supervisor Panel"}
          </ThemedText>

          {activeTab === "attendee" && (
            <View style={styles.searchContainer}>
              <SearchSessions
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Enter session code"
                width={260}
                height={48}
              />
            </View>
          )}

          <View style={styles.buttonContainer}>
            {activeTab === "attendee" ? (
              <CheckInButton
                title="Confirm Attendance"
                onPress={handleCheckIn}
                width={260}
                height={48}
              />
            ) : (
              <SupervisorCreateSessionButton
                title="Create Session"
                onPress={() => setCreateSessionModalVisible(true)}
                width={260}
                height={48}
              />
            )}
          </View>
        </View>

        <>
          <UpcomingSessions
            sessions={upcomingSessions}
            onSessionPress={handleSessionPress}
            onSeeAllPress={handleSeeAllSessions}
          />

          <RecentActivity
            activities={recentActivities}
            onActivityPress={handleActivityPress}
            onViewAllPress={handleViewAllActivities}
          />
        </>
      </ScrollView>

      <CheckInModal
        visible={checkInModalVisible}
        onClose={() => setCheckInModalVisible(false)}
        onSelectType={(type) => alert(`You selected: ${type}`)}
      />

      <CreateSessionModal
        visible={createSessionModalVisible}
        onClose={() => setCreateSessionModalVisible(false)}
        onCreate={handleCreateSession}
      />

      <ActivityModal
        visible={activityModalVisible}
        activity={selectedActivity}
        onClose={() => setActivityModalVisible(false)}
      />
    </View>
  );
}
