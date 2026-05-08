import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useContext, useMemo } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { AuthContext } from "@/context/AuthContext";
import { MyAttendanceContext } from "@/context/MyAttendanceContext";

const COLORS = {
  primary: "#1e4d7a",
  bg: "#FFFFFF",
  muted: "#94A3B8",
  text: "#0F172A",
  border: "#F1F5F9",
};

export default function ProfileScreen() {
  const { user: authUser } = useContext(AuthContext);
  const attendanceCtx = useContext(MyAttendanceContext);

  const user = {
    name: authUser?.full_name || "Guest User",
    email: authUser?.email || "No Email",
    initials:
      authUser?.full_name
        ?.split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase() || "GU",
  };

  // ── Compute real metrics from attendance records ──────────────────────────
  const metrics = useMemo(() => {
    const records = attendanceCtx?.attendances ?? [];
    const total = records.length;
    if (total === 0) return { sessions: 0, rate: "—", onTime: "—" };

    const attended = records.filter((r) =>
      ["present", "on-time", "late", "completed", "incomplete"].includes(
        r.status
      )
    ).length;

    const onTimeCount = records.filter(
      (r) => r.arrival_status === "on_time" || r.status === "on-time"
    ).length;

    const rate = Math.round((attended / total) * 100);
    const onTimeRate =
      attended > 0 ? Math.round((onTimeCount / attended) * 100) : 0;

    return {
      sessions: total,
      rate: `${rate}%`,
      onTime: `${onTimeRate}%`,
    };
  }, [attendanceCtx?.attendances]);

  const ProfileMetric = ({
    label,
    value,
  }: {
    label: string;
    value: string;
  }) => (
    <View style={styles.metricItem}>
      <Text style={styles.metricVal}>{value}</Text>
      <Text style={styles.metricLab}>{label}</Text>
    </View>
  );

  const ListItem = ({
    icon,
    label,
    sub = "",
    isLast = false,
    onPress,
  }: {
    icon: any;
    label: string;
    sub?: string;
    isLast?: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={[styles.listItem, isLast && { borderBottomWidth: 0 }]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <View style={styles.listIconWrap}>
        <MaterialCommunityIcons
          name={icon}
          size={20}
          color={COLORS.primary}
        />
      </View>
      <View style={styles.listTextWrap}>
        <Text style={styles.listLabel}>{label}</Text>
        {sub ? <Text style={styles.listSub}>{sub}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={14} color="#CBD5E1" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 🌟 Minimal Header - Fixed size */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.initials}</Text>
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
        </View>

        {/* 📊 Simple Metrics Bar */}
        <View style={styles.metricsBar}>
          <ProfileMetric label="Attend Rate" value={metrics.rate} />
          <View style={styles.hDivider} />
          <ProfileMetric
            label="Sessions"
            value={String(metrics.sessions)}
          />
          <View style={styles.hDivider} />
          <ProfileMetric label="On-Time" value={metrics.onTime} />
        </View>

        {/* ⚙ Settings List */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>WORKSPACE</Text>
          <View style={styles.listCard}>
            <ListItem
              icon="account-outline"
              label="Profile Information"
              sub="Manage your professional data"
              onPress={() => {}}
            />
            <ListItem
              icon="shield-lock-outline"
              label="Login & Security"
              sub="Biometric access settings"
              onPress={() => {}}
            />
            <ListItem
              icon="bell-ring-outline"
              label="Notifications"
              onPress={() => {}}
            />
            <ListItem
              icon="palette"
              label="Appearance"
              isLast
              onPress={() => {}}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>SUPPORT</Text>
          <View style={styles.listCard}>
            <ListItem
              icon="lifebuoy"
              label="Help Center"
              isLast
              onPress={() => {}}
            />
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.versionInfo}>ClockWise Mobile v2.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    paddingVertical: 32,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "900",
    color: "white",
  },
  userName: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.text,
  },
  userEmail: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 2,
    fontWeight: "500",
  },
  metricsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 32,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  metricItem: {
    flex: 1,
    alignItems: "center",
  },
  metricVal: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.primary,
  },
  metricLab: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.muted,
    textTransform: "uppercase",
    marginTop: 2,
  },
  hDivider: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.border,
  },
  section: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: "900",
    color: COLORS.muted,
    letterSpacing: 1.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  listCard: {
    backgroundColor: "white",
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  listIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  listTextWrap: {
    flex: 1,
  },
  listLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },
  listSub: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 1,
  },
  footer: {
    marginTop: 48,
    alignItems: "center",
  },
  versionInfo: {
    fontSize: 10,
    fontWeight: "800",
    color: "#CBD5E1",
    letterSpacing: 1,
  },
});
