import { SegmentedTab } from "@/components/tabs/SegmentedTab";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

const AnalyticsScreen = () => {
  const [activeTab, setActiveTab] = useState<"attendee" | "supervisor">(
    "attendee",
  );
  const [analytics] = useState({
    totalAttendance: 145,
    attendanceRate: 92.5,
    totalSessions: 157,
    averageAttendees: 4,
  });

  const StatCard = ({ icon, label, value, unit }) => (
    <View style={styles.statCard}>
      <View style={styles.cardHeader}>
        <MaterialCommunityIcons name={icon} size={24} color="#007AFF" />
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={styles.value}>
        {value}
        <Text style={styles.unit}>{unit}</Text>
      </Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <SegmentedTab
        options={[
          { key: "attendee", label: "Attendee" },
          { key: "supervisor", label: "Supervisor" },
        ]}
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as "attendee" | "supervisor")}
      />

      <Text style={styles.subHeader}>
        {activeTab === "attendee" ? "Attendee Overview" : "Supervisor Overview"}
      </Text>

      <View style={styles.statsContainer}>
        <StatCard
          icon="calendar-check"
          label="Total Attendance"
          value={analytics.totalAttendance}
          unit=""
        />
        <StatCard
          icon="percent"
          label="Attendance Rate"
          value={analytics.attendanceRate}
          unit="%"
        />
      </View>

      <View style={styles.statsContainer}>
        <StatCard
          icon="presentation"
          label="Total Sessions"
          value={analytics.totalSessions}
          unit=""
        />
        <StatCard
          icon="account-multiple"
          label="Avg Attendees"
          value={analytics.averageAttendees}
          unit=""
        />
      </View>

      <View style={styles.chartPlaceholder}>
        <MaterialCommunityIcons name="chart-box" size={48} color="#ccc" />
        <Text style={styles.chartText}>Chart Visualization</Text>
        <Text style={styles.chartSubText}>Add charting library to display</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f9f9f9",
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    marginTop: 10,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    color: "#666",
    marginLeft: 8,
    flex: 1,
  },
  value: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
  },
  unit: {
    fontSize: 14,
    fontWeight: "normal",
    color: "#999",
    marginLeft: 4,
  },
  chartPlaceholder: {
    backgroundColor: "#fff",
    padding: 30,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  chartText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginTop: 12,
  },
  subHeader: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    color: "#1f4d7a",
  },
  chartSubText: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
});

export default AnalyticsScreen;
