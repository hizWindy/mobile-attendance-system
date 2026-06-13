import type { ActivityItem } from "@/api/ActivityService";
import ActivityService from "@/api/ActivityService";
import AttendanceService from "@/api/AttendanceService";
import SessionService, { SessionJoinData } from "@/api/SessionService";
import { Activity } from "@/components/activity/ActivityItem";
import { RecentActivity } from "@/components/activity/RecentActivity";
import { CheckInButton } from "@/components/button/CheckInButton";
import { SupervisorCreateSessionButton } from "@/components/button/SupervisorCreateSessionButton";
import { ActivityModal } from "@/components/modal/ActivityModal";
import { CheckInModal } from "@/components/modal/CheckInModal";
import { CreateSessionModal } from "@/components/modal/CreateSessionModal";
import { LocationMapModal } from "@/components/modal/LocationMapModal";
import { SearchSessions } from "@/components/search/SearchSessions";
import { Session } from "@/components/sessions/SessionItem";
import { UpcomingSessions } from "@/components/sessions/UpcomingSessions";
import { SegmentedTab } from "@/components/tabs/SegmentedTab";
import { ThemedText } from "@/components/themed-text";
import { ActionToast } from "@/components/ui/ActionToast";
import { LocationContext } from "@/context/LocationContext";
import { useMyAttendance } from "@/hooks/useMyAttendance";
import { useSession } from "@/hooks/useSession";
import { isUpcoming } from "@/hooks/useSessionStatus";
import { BackendSession } from "@/types/SessionTypes";
import { formatTime12hr } from "@/utils/timeUtils";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, ScrollView, Text, TouchableOpacity, View } from "react-native";


export default function HomeScreen() {
  const router = useRouter();
  const { sessions: mySessions, addSession } = useSession();
  const { location, address, loading: locationLoading, errorMsg: locationError } = useContext(LocationContext);

  const [searchQuery, setSearchQuery] = useState("");
  const [checkInModalVisible, setCheckInModalVisible] = useState(false);
  const [createSessionModalVisible, setCreateSessionModalVisible] = useState(false);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<"attendee" | "supervisor">(
    "attendee",
  );
  const params = useLocalSearchParams();

  const { categorized: myAttendances, refresh: myAttendancesRefresh } = useMyAttendance();


  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [activityModalVisible, setActivityModalVisible] = useState(false);
  // join response from the backend; drives the CheckInModal
  const [joinedSessionData, setJoinedSessionData] = useState<SessionJoinData | null>(null);

  const [toastConfig, setToastConfig] = useState<{
    visible: boolean;
    type: "success" | "error" | "info";
    title: string;
    message?: string;
  }>({
    visible: false,
    type: "info",
    title: "",
  });

  const fetchActivities = useCallback(() => {
    ActivityService.getMyActivities(20, 0)
      .then((res) => {
        const raw = res as any;
        const list: ActivityItem[] =
          raw.activities       ??
          raw.data?.items      ??
          raw.data?.activities ??
          raw.items            ??
          [];
        setActivities(list);
      })
      .catch((e) => {
        console.error("[Home] activities fetch error:", e?.message ?? e);
      });
  }, []);

  // ── Poll recent activities every 30s while tab is focused ────────────
  useFocusEffect(
    useCallback(() => {
      fetchActivities();
      const intervalId = setInterval(fetchActivities, 30_000);
      return () => clearInterval(intervalId);
    }, [fetchActivities])
  );

  // Formatter mapping a BackendSession to the UI `Session` item shape
  const mapSessionToUI = (s: BackendSession, defaultStatus: "MANAGING" | "ATTENDING" = "ATTENDING"): Session => {
    const d = new Date(s.schedule?.start_date || "");
    const dateStr = isNaN(d.getTime()) 
       ? "TBD" 
       : d.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
       
    return {
      id: String(s.session_id),
      date: dateStr,
      name: s.session_name,
      time: `${s.schedule?.start_time ? formatTime12hr(s.schedule.start_time) : "TBD"} - ${s.schedule?.end_time ? formatTime12hr(s.schedule.end_time) : "TBD"}`,
      status: defaultStatus,
    };
  };

  // ── Merged upcoming sessions: both managed + attended, sorted, top 2 ──────
  const dynamicUpcomingSessions = useMemo(() => {
    // Convert BackendSession → UI Session shape
    const fromManaged = mySessions
      .filter(isUpcoming)
      .map((s) => ({ ...mapSessionToUI(s, "MANAGING"), _startDate: s.schedule?.start_date || "", _startTime: s.schedule?.start_time || "" }));

      const fromAttending = myAttendances.upcoming
      .map((r) => ({
        ...mapSessionToUI(r.session, "ATTENDING"),
        _startDate: r.session.schedule?.start_date || "",
        _startTime: r.session.schedule?.start_time || "",
      }));

    // Deduplicate by session name (simple guard)
    const seen = new Set<string>();
    const merged = [...fromManaged, ...fromAttending].filter((s) => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });

    // Sort ascending by start date + time
    merged.sort((a, b) => {
      const aKey = `${a._startDate}T${a._startTime}`;
      const bKey = `${b._startDate}T${b._startTime}`;
      return aKey.localeCompare(bKey);
    });

    // Return UI shape (strip internal sort fields)
    return merged.slice(0, 2).map(({ _startDate, _startTime, ...rest }) => rest);
  }, [mySessions, myAttendances]);

  const [searchError, setSearchError] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastAnim = useRef(new Animated.Value(150)).current;

  // Auto-dismiss search errors (like "You have already joined this session") after 3 seconds
  useEffect(() => {
    if (searchError) {
      const timer = setTimeout(() => {
        setSearchError("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [searchError]);

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

  const handleEnterSession = async () => {
    const trimmedQuery = searchQuery.trim().toUpperCase();
    if (trimmedQuery.length === 0) return;

    // ── FAST CLIENT-SIDE CHECKS (zero latency, no API call) ──────────────────

    // 1. Manager guard: user owns this session
    const isManager = mySessions.some((s) => s.session_code?.toUpperCase() === trimmedQuery);
    if (isManager) {
      setSearchError("You are the manager of this session. Check-in is not allowed.");
      return;
    }

    // 2. Already-attending guard: user is already enrolled
    const allAttendances = [
      ...myAttendances.upcoming,
      ...myAttendances.ongoing,
      ...myAttendances.completed,
      ...myAttendances.missed,
    ];
    const isAttending = allAttendances.some(
      (r) => r.session.session_code?.toUpperCase() === trimmedQuery
    );
    if (isAttending) {
      setSearchError("You have already joined this session.");
      return;
    }

    // ── SERVER VALIDATION + JOIN ──────────────────────────────────────────────
    // The backend enforces: invalid code → expired → duplicate → success
    try {
      const result = await SessionService.joinSession(trimmedQuery);
      if (!result.success) {
        setSearchError(result.message || "Unable to join session.");
        return;
      }

      // Success ✓
      setSearchError("");
      setToastMessage(result.message);
      setJoinedSessionData({ ...result.data, session_code: trimmedQuery });
      setCheckInModalVisible(true);
      fetchActivities(); // Refresh activities after join
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setSearchError(detail || "Unable to join session. Please try again.");
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
        setToastMessage(`Session created! Code: ${newSession.session_code}`);
        fetchActivities(); // Refresh activities after create
      } else {
        Alert.alert("Data Error", "Failed to create session on the backend. Please try again.");
      }
    } else {
      // Fallback if no payload is provided
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
    router.push("/sessions");
  };

  const handleViewAllActivities = () => {
    router.push("/activities");
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
        {/* ── Attendee / Supervisor Tab ── */}
        <View className="w-full max-w-sm mb-3 mt-2">
          <SegmentedTab
            options={[
              { key: "attendee", label: "Attendee" },
              { key: "supervisor", label: "Supervisor" },
            ]}
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as "attendee" | "supervisor")}
          />
        </View>

        {/* ── Current Location (Compact, implicit) ── */}
        <TouchableOpacity 
          activeOpacity={0.7}
          onPress={() => {
            if (location && !locationError && !locationLoading) {
              setMapModalVisible(true);
            }
          }}
          className={`w-full max-w-sm mb-4 rounded-xl border flex-row items-center px-4 py-3 gap-3 ${
          locationError 
            ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50" 
            : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
        }`}>
          <View className={`w-8 h-8 rounded-lg items-center justify-center ${
            locationError ? "bg-red-100 dark:bg-red-900/40" : "bg-blue-50 dark:bg-blue-900/30"
          }`}>
            <Ionicons
              name={locationError ? "warning-outline" : "location"}
              size={16}
              color={locationError ? "#EF4444" : "#3B82F6"}
            />
          </View>

          <View style={{ flex: 1 }}>
            {locationLoading ? (
              <Text className="text-sm italic text-slate-500 dark:text-slate-400">
                Acquiring GPS signal...
              </Text>
            ) : locationError ? (
              <Text className="text-sm font-medium text-red-500 dark:text-red-400">
                Unable to retrieve location
              </Text>
            ) : (
              <>
                <Text className="text-[14px] font-bold text-slate-900 dark:text-white leading-tight" numberOfLines={1}>
                  {address || (location
                    ? `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`
                    : "Location unavailable")}
                </Text>
                <Text className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                  Tap to view on Map
                </Text>
              </>
            )}
          </View>

          {/* Live status dot / Map Chevron */}
          {location && !locationError && !locationLoading ? (
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          ) : (
            <View className={`w-2 h-2 rounded-full ${
              locationLoading ? "bg-amber-500" : locationError ? "bg-red-500" : "bg-emerald-500"
            }`} />
          )}
        </TouchableOpacity>

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
                  title="Enter Session"
                  onPress={handleEnterSession}
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
            sessions={dynamicUpcomingSessions}
            onSessionPress={handleSessionPress}
            onSeeAllPress={handleSeeAllSessions}
          />

          <RecentActivity
            activities={activities}
            onViewAllPress={handleViewAllActivities}
          />
        </View>
      </ScrollView>

      <CheckInModal
        visible={checkInModalVisible}
        session={joinedSessionData}
        onClose={() => setCheckInModalVisible(false)}
        onQRScan={async (scanResult, actionType) => {
          if (!joinedSessionData) return;
          setCheckInModalVisible(false); // Visually close immediately
          try {
            const result = await AttendanceService.logAttendance({
              session_id: joinedSessionData.session_id,
              action_type: actionType,
              method: "qr",
              latitude: scanResult.latitude,
              longitude: scanResult.longitude,
              qr_token: scanResult.qrData,
              metadata: { status: "Scanned via QR" },
            });
            await myAttendancesRefresh();
            fetchActivities(); // Refresh activities after QR scan log
            const now = new Date();
            const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
            const ts = result?.time_stats;
            const timeRenderedStr = ts
              ? (ts.hours > 0 ? `${ts.hours}h ${ts.minutes}m` : ts.minutes > 0 ? `${ts.minutes}m` : `${ts.seconds}s`)
              : null;
            setToastConfig({
              visible: true,
              type: "success",
              title: actionType === "check-in" ? "Checked In Successfully" : "Checked Out Successfully",
              message: `QR Verified · ${timeStr}` + (timeRenderedStr ? `\nTime Rendered: ${timeRenderedStr}` : ""),
            });
          } catch (err: any) {
            const detail = err?.response?.data?.detail;
            setToastConfig({
              visible: true,
              type: "error",
              title: actionType === "check-in" ? "QR Check-in Failed" : "QR Check-out Failed",
              message: detail || "Failed to verify QR attendance. Please try again.",
            });
          }
        }}
        onSelectType={async (type, actionType) => {
          if (!joinedSessionData) return;

          const doAction = async () => {
            try {
              // Strictly enforce backend validations for method:
              const t = type.toLowerCase();
              let strictMethod = "manual";
              if (t.includes("qr")) strictMethod = "qr";
              else if (t.includes("geo") || t.includes("location")) strictMethod = "geolocation";
              else if (t.includes("face") || t.includes("facial")) strictMethod = "facial";
              else if (t.includes("rfid") || t.includes("nfc")) strictMethod = "rfid";
              else if (t.includes("bio") || t.includes("fingerprint")) strictMethod = "biometric";
              else if (t.includes("manual")) strictMethod = "manual";
              
              const result = await AttendanceService.logAttendance({
                session_id: joinedSessionData.session_id,
                action_type: actionType,
                method: strictMethod,
                latitude: location?.coords.latitude || 0,
                longitude: location?.coords.longitude || 0,
                metadata: strictMethod === "manual" ? { status: "present" } : {},
              });

              // Trigger global refresh so the check-in is reflected in UI bucket lists
              await myAttendancesRefresh();

              const now = new Date();
              const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
              const dateStr = now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
              const ts = result?.time_stats;
              const timeRenderedStr = ts
                ? (ts.hours > 0
                    ? `${ts.hours}h ${ts.minutes}m`
                    : ts.minutes > 0
                    ? `${ts.minutes} minute${ts.minutes !== 1 ? "s" : ""}`
                    : `${ts.seconds} second${ts.seconds !== 1 ? "s" : ""}`)
                : null;

              const locationDisplay = address || 
                (location ? `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}` : "Location unavailable");

              if (actionType === "check-in") {
                setToastConfig({
                  visible: true,
                  type: "success",
                  title: "Checked In Successfully",
                  message: `Time: ${timeStr}\nLocation: ${locationDisplay}`,
                });
              } else {
                setToastConfig({
                  visible: true,
                  type: "success",
                  title: "Checked Out Successfully",
                  message: `Time: ${timeStr}\nLocation: ${locationDisplay}` +
                           (timeRenderedStr ? `\n\nTotal Time Rendered:\n${timeRenderedStr}` : ""),
                });
              }
            } catch (err: any) {
              const detail = err?.response?.data?.detail;
              setToastConfig({
                visible: true,
                type: "error",
                title: actionType === "check-in" ? "Check-in Failed" : "Check-out Failed",
                message: detail || "Failed to log attendance. Please try again.",
              });
            }
          };

          if (actionType === "check-out") {
            Alert.alert(
              "Confirm Check-out",
              "Are you sure you want to check out? You will not be able to check in again after this.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Check Out", style: "destructive", onPress: doAction },
              ]
            );
          } else {
            await doAction();
          }
        }}
      />

      <CreateSessionModal
        visible={createSessionModalVisible}
        onClose={() => setCreateSessionModalVisible(false)}
        onCreate={handleCreateSession}
      />

      <ActionToast
        visible={toastConfig.visible}
        type={toastConfig.type}
        title={toastConfig.title}
        message={toastConfig.message}
        onClose={() => setToastConfig((p) => ({ ...p, visible: false }))}
      />

      <ActivityModal
        visible={activityModalVisible}
        activity={selectedActivity}
        onClose={() => setActivityModalVisible(false)}
      />

      <LocationMapModal
        visible={mapModalVisible}
        onClose={() => setMapModalVisible(false)}
        latitude={location?.coords.latitude || 0}
        longitude={location?.coords.longitude || 0}
        title={address || "Current Location"}
        description="Your exact GPS coordinates"
      />
    </View>
  );
}
