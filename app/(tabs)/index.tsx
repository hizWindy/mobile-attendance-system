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
import { useSession } from "@/hooks/useSession";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import React, { useState, useRef, useEffect } from "react";
import { ScrollView, View, Alert, Animated, Text } from "react-native";

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
  const router = useRouter();
  const { addSession } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [checkInModalVisible, setCheckInModalVisible] = useState(false);
  const [createSessionModalVisible, setCreateSessionModalVisible] =
    useState(false);
  const [activeTab, setActiveTab] = useState<"attendee" | "supervisor">(
    "attendee",
  );
  const params = useLocalSearchParams();

  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null,
  );
  const [activityModalVisible, setActivityModalVisible] = useState(false);

  const [sessions, setSessions] = useState(["ABC123", "DEF456", "GHI789"]);
  const [upcomingSessions, setUpcomingSessions] =
    useState<Session[]>(SAMPLE_SESSIONS);
  const [recentActivities, setRecentActivities] =
    useState<Activity[]>(SAMPLE_ACTIVITIES);

  const [searchError, setSearchError] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastAnim = useRef(new Animated.Value(150)).current;

  // Elegantly slide toast up from the bottom, hovering like a pill
  useEffect(() => {
    if (toastMessage) {
      Animated.sequence([
        Animated.spring(toastAnim, {
          toValue: -80, // Slide up, resting above tab bar safely
          tension: 65,
          friction: 9,
          useNativeDriver: true,
        }),
        Animated.delay(3000),
        Animated.timing(toastAnim, {
          toValue: 150, // Sink back down
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setToastMessage(null);
      });
    }
  }, [toastMessage]);

  useEffect(() => {
    if (params.loginSuccess === "true") {
      setToastMessage("Successfully logged in!");
    }
  }, [params.loginSuccess]);

  const handleCheckIn = () => {
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery.length === 0) return;

    const exists = sessions.some(
      (session) => session.toLowerCase() === trimmedQuery.toLowerCase(),
    );
    if (!exists) {
      setSearchError("Session code not found. Please check and try again.");
    } else {
      setSearchError("");
      setCheckInModalVisible(true);
    }
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (searchError) setSearchError(""); // Clear error while typing
  };

  const handleCreateSession = async (sessionCode: string, payload?: any) => {
    if (payload) {
      // Provide a default user_role_id if missing. The BackendSession type requires it.
      payload.user_role_id = payload.user_role_id || 1;
      
      const newSession = await addSession(payload);
      if (newSession) {
        setSessions((prev) => [...prev, newSession.session_code]);
        setSearchQuery(newSession.session_code);
        setToastMessage(`Session created! Code: ${newSession.session_code}`);
      } else {
        Alert.alert("Data Error", "Failed to create session on the backend. Please try again.");
      }
    } else {
      // Fallback if no payload is provided
      setSessions((prev) => [...prev, sessionCode]);
      setSearchQuery(sessionCode);
      setToastMessage(`Mock session created: ${sessionCode}`);
    }
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
    <View className="flex-1 bg-[#e8eff8] dark:bg-slate-900">
      {/* ── Custom Animated Bottom Pill Toast ── */}
      <Animated.View
        className="absolute bottom-0 self-center flex-row items-center bg-white dark:bg-slate-800 px-5 py-3 rounded-full"
        style={{
          transform: [{ translateY: toastAnim }],
          zIndex: 9999,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.12,
          shadowRadius: 16,
          elevation: 10,
        }}
      >
        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
        <Text className="text-slate-800 dark:text-white font-bold ml-2 text-sm">
          {toastMessage}
        </Text>
      </Animated.View>

      <ScrollView
        contentContainerClassName="p-4 items-center"
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full max-w-sm mb-6 mt-2">
          <SegmentedTab
            options={[
              { key: "attendee", label: "Attendee" },
              { key: "supervisor", label: "Supervisor" },
            ]}
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as "attendee" | "supervisor")}
          />
        </View>

        <View className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm elevation-3 mb-6">
          <ThemedText className="text-xl font-extrabold text-[#1f4d7a] dark:text-blue-100 mb-3">
            {activeTab === "attendee" ? "Join a Session" : "Supervisor Panel"}
          </ThemedText>

          {activeTab === "attendee" && (
            <View className="mb-3 items-center w-full">
              <SearchSessions
                value={searchQuery}
                onChangeText={handleSearchChange}
                placeholder="Enter 6-digit session code"
                hasError={!!searchError}
                errorMessage={searchError}
              />
            </View>
          )}

          <View className="items-center w-full">
            {activeTab === "attendee" ? (
              <View className="w-full">
                <CheckInButton
                  title="Check-In"
                  onPress={handleCheckIn}
                  disabled={searchQuery.length === 0}
                />
              </View>
            ) : (
              <SupervisorCreateSessionButton
                title="Create Session"
                onPress={() => setCreateSessionModalVisible(true)}
              />
            )}
          </View>
        </View>

        <View className="w-full max-w-sm">
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
        </View>
      </ScrollView>

      <CheckInModal
        visible={checkInModalVisible}
        onClose={() => setCheckInModalVisible(false)}
        onSelectType={(type) => Alert.alert("Success", `You selected: ${type}`)}
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
