import { BarChart } from "@/components/charts/BarChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { LineChart } from "@/components/charts/LineChart";
import { SegmentedTab } from "@/components/tabs/SegmentedTab";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import { Animated, Pressable, ScrollView, Text, useColorScheme, View } from "react-native";

// ─── Sample Data ────────────────────────────────────────────────────────────

const ATTENDEE_STATS = {
  totalPresent: 42,
  totalAbsent: 5,
  rate: 89.4,
  streak: 7,
  onTime: 38,
  late: 4,
};

const ATTENDEE_TREND = [
  { label: "Mon", value: 1 },
  { label: "Tue", value: 1 },
  { label: "Wed", value: 0 },
  { label: "Thu", value: 1 },
  { label: "Fri", value: 1 },
  { label: "Sat", value: 1 },
  { label: "Sun", value: 0 },
];

const ATTENDEE_MONTHLY = [
  { label: "Jan", value: 18 },
  { label: "Feb", value: 20 },
  { label: "Mar", value: 22 },
  { label: "Apr", value: 19 },
  { label: "May", value: 24 },
  { label: "Jun", value: 21 },
];

const SUPERVISOR_STATS = {
  totalSessions: 32,
  totalAttendees: 248,
  avgRate: 91.2,
  peakDay: "Wednesday",
};

const SESSION_BREAKDOWN = [
  { label: "Manual", value: 12, color: "#001F54" },
  { label: "QR", value: 10, color: "#2563eb" },
  { label: "Location", value: 6, color: "#60a5fa" },
  { label: "Facial", value: 4, color: "#93c5fd" },
];

const SESSIONS_PER_WEEK = [
  { label: "W1", value: 7 },
  { label: "W2", value: 9 },
  { label: "W3", value: 6 },
  { label: "W4", value: 10 },
  { label: "W5", value: 5 },
];

const ATTENDANCE_RATE_TREND_WEEK = [
  { label: "Mon", value: 90 },
  { label: "Tue", value: 88 },
  { label: "Wed", value: 75 },
  { label: "Thu", value: 92 },
  { label: "Fri", value: 95 },
  { label: "Sat", value: 80 },
];

const ATTENDANCE_RATE_TREND_MONTH = [
  { label: "W1", value: 84 },
  { label: "W2", value: 91 },
  { label: "W3", value: 87 },
  { label: "W4", value: 93 },
];

const ATTENDANCE_RATE_TREND_YEAR = [
  { label: "Jan", value: 84 },
  { label: "Feb", value: 88 },
  { label: "Mar", value: 91 },
  { label: "Apr", value: 87 },
  { label: "May", value: 93 },
  { label: "Jun", value: 91 },
];

const ATTENDEE_MONTHLY_YEAR = [
  { label: "Jan", value: 18 },
  { label: "Feb", value: 20 },
  { label: "Mar", value: 22 },
  { label: "Apr", value: 19 },
  { label: "May", value: 24 },
  { label: "Jun", value: 21 },
];

const ATTENDEE_MONTHLY_MONTH = [
  { label: "W1", value: 5 },
  { label: "W2", value: 6 },
  { label: "W3", value: 4 },
  { label: "W4", value: 7 },
];

const ATTENDEE_MONTHLY_WEEK = [
  { label: "Mon", value: 1 },
  { label: "Tue", value: 1 },
  { label: "Wed", value: 0 },
  { label: "Thu", value: 1 },
  { label: "Fri", value: 1 },
  { label: "Sat", value: 1 },
];

const SESSIONS_WEEK = [
  { label: "Mon", value: 2 },
  { label: "Tue", value: 3 },
  { label: "Wed", value: 1 },
  { label: "Thu", value: 3 },
  { label: "Fri", value: 2 },
];

const SESSIONS_MONTH = [
  { label: "W1", value: 7 },
  { label: "W2", value: 9 },
  { label: "W3", value: 6 },
  { label: "W4", value: 10 },
];

const SESSIONS_YEAR = [
  { label: "Jan", value: 28 },
  { label: "Feb", value: 32 },
  { label: "Mar", value: 25 },
  { label: "Apr", value: 35 },
  { label: "May", value: 30 },
  { label: "Jun", value: 38 },
  { label: "Jul", value: 29 },
];

type Period = "Week" | "Month" | "Year";

// ─── Sub-Component Types ─────────────────────────────────────────────────────

type KpiCardProps = {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  value: string | number;
  unit?: string;
  accent?: string;
  isDark: boolean;
};

// ─── Period Selector ──────────────────────────────────────────────────────────

function PeriodSelector({ period, onChange, isDark }: { period: Period; onChange: (p: Period) => void; isDark: boolean }) {
  return (
    <View className={`flex-row rounded-xl p-1 mb-5 self-end ${isDark ? "bg-slate-800" : "bg-slate-100"}`}>
      {(["Week", "Month", "Year"] as Period[]).map((p) => (
        <Pressable
          key={p}
          onPress={() => onChange(p)}
          className={`px-3 py-1.5 rounded-lg ${period === p ? (isDark ? "bg-slate-600" : "bg-white") : ""}`}
          style={period === p ? { shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 4, elevation: 2 } : {}}
        >
          <Text
            className={`text-xs font-bold ${
              period === p
                ? isDark ? "text-blue-400" : "text-[#001F54]"
                : isDark ? "text-slate-500" : "text-slate-400"
            }`}
          >
            {p}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ─── Animated KPI Card ────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, unit = "", accent = "#001F54", isDark }: KpiCardProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, tension: 300, friction: 10 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 8 }).start();

  return (
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut} style={{ flex: 1, marginHorizontal: 4, marginBottom: 12 }}>
      <Animated.View
        style={[{
          transform: [{ scale }],
          backgroundColor: isDark ? "#1e293b" : "#ffffff",
          borderRadius: 16,
          padding: 16,
          shadowColor: accent,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
        }]}
      >
        <View
          className="w-9 h-9 rounded-xl items-center justify-center mb-3"
          style={{ backgroundColor: accent + "1A" }}
        >
          <MaterialCommunityIcons name={icon} size={20} color={accent} />
        </View>
        <Text
          className={`text-2xl font-black ${isDark ? "text-white" : "text-[#001F54]"}`}
          style={{ letterSpacing: -0.5 }}
        >
          {value}
          <Text className="text-sm font-medium text-slate-400">{unit}</Text>
        </Text>
        <Text className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

type ChartCardProps = {
  title: string;
  subtitle?: string;
  isDark: boolean;
  children: React.ReactNode;
};

function ChartCard({ title, subtitle, isDark, children }: ChartCardProps) {
  return (
    <View
      className={`w-full rounded-2xl p-4 mb-4 ${isDark ? "bg-slate-800" : "bg-white"}`}
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
        elevation: 4,
      }}
    >
      <Text
        className={`text-base font-bold mb-0.5 ${isDark ? "text-white" : "text-[#001F54]"}`}
      >
        {title}
      </Text>
      {subtitle && (
        <Text className={`text-xs mb-4 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          {subtitle}
        </Text>
      )}
      {children}
    </View>
  );
}

type InsightRowProps = {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  text: string;
  positive?: boolean;
  isDark: boolean;
};

function InsightRow({ icon, text, positive = true, isDark }: InsightRowProps) {
  const color = positive ? "#16a34a" : "#dc2626";
  const bg = positive ? "#f0fdf4" : "#fef2f2";
  const darkBg = positive ? "rgba(22,163,74,0.12)" : "rgba(220,38,38,0.12)";
  return (
    <View
      className="flex-row items-center rounded-xl px-3 py-2.5 mb-2"
      style={{ backgroundColor: isDark ? darkBg : bg }}
    >
      <MaterialCommunityIcons name={icon} size={16} color={color} />
      <Text className="ml-2 text-xs font-medium flex-1" style={{ color }}>
        {text}
      </Text>
    </View>
  );
}

// ─── Attendee Analytics ───────────────────────────────────────────────────────

function AttendeeAnalytics({ isDark, period }: { isDark: boolean; period: Period }) {
  const attendanceTrend =
    period === "Week"
      ? ATTENDEE_MONTHLY_WEEK
      : period === "Month"
      ? ATTENDEE_MONTHLY_MONTH
      : ATTENDEE_MONTHLY_YEAR;
  const donutData = [
    { label: "Present", value: ATTENDEE_STATS.totalPresent, color: "#001F54" },
    { label: "Absent", value: ATTENDEE_STATS.totalAbsent, color: "#e2e8f0" },
  ];

  return (
    <>
      {/* KPI Row 1 */}
      <View className="flex-row mb-0">
        <KpiCard
          icon="calendar-check"
          label="Days Present"
          value={ATTENDEE_STATS.totalPresent}
          accent="#001F54"
          isDark={isDark}
        />
        <KpiCard
          icon="percent"
          label="Attendance Rate"
          value={`${ATTENDEE_STATS.rate}`}
          unit="%"
          accent="#2563eb"
          isDark={isDark}
        />
      </View>
      <View className="flex-row mb-4">
        <KpiCard
          icon="fire"
          label="Current Streak"
          value={ATTENDEE_STATS.streak}
          unit=" days"
          accent="#f59e0b"
          isDark={isDark}
        />
        <KpiCard
          icon="clock-fast"
          label="On-Time Rate"
          value={Math.round((ATTENDEE_STATS.onTime / ATTENDEE_STATS.totalPresent) * 100)}
          unit="%"
          accent="#16a34a"
          isDark={isDark}
        />
      </View>

      {/* Presence Breakdown Donut */}
      <ChartCard
        title="Presence Breakdown"
        subtitle="Overall check-in summary"
        isDark={isDark}
      >
        <View className="flex-row items-center justify-between">
          <DonutChart data={donutData} size={140} thickness={26} />
          <View className="flex-1 ml-6">
            {donutData.map((d) => (
              <View key={d.label} className="flex-row items-center mb-3">
                <View
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: d.color }}
                />
                <View>
                  <Text
                    className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-700"}`}
                  >
                    {d.value}
                  </Text>
                  <Text className="text-xs text-slate-400">{d.label}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ChartCard>

      <ChartCard
        title="Attendance Trend"
        subtitle={`Days attended — ${period.toLowerCase()} view`}
        isDark={isDark}
      >
        <LineChart data={attendanceTrend} color="#001F54" height={140} />
      </ChartCard>

      <ChartCard
        title="Activity by Day"
        subtitle="1 = Present, 0 = Absent"
        isDark={isDark}
      >
        <BarChart data={ATTENDEE_TREND} color="#2563eb" height={120} />
      </ChartCard>

      {/* AI Insights */}
      <ChartCard title="Insights" isDark={isDark}>
        <InsightRow
          icon="trending-up"
          text="Your attendance improved by 4.2% compared to last month. Keep it up!"
          positive
          isDark={isDark}
        />
        <InsightRow
          icon="fire"
          text={`You're on a ${ATTENDEE_STATS.streak}-day streak. Don't break it!`}
          positive
          isDark={isDark}
        />
        <InsightRow
          icon="alert-circle-outline"
          text="You missed 2 sessions this month. Review your schedule."
          positive={false}
          isDark={isDark}
        />
        <InsightRow
          icon="clock-check-outline"
          text="You arrive on-time 90% of the time — excellent punctuality!"
          positive
          isDark={isDark}
        />
      </ChartCard>
    </>
  );
}

// ─── Supervisor Analytics ─────────────────────────────────────────────────────

function SupervisorAnalytics({ isDark, period }: { isDark: boolean; period: Period }) {
  const sessionsTrend =
    period === "Week"
      ? SESSIONS_WEEK
      : period === "Month"
      ? SESSIONS_MONTH
      : SESSIONS_YEAR;

  const rateTrend =
    period === "Week"
      ? ATTENDANCE_RATE_TREND_WEEK
      : period === "Month"
      ? ATTENDANCE_RATE_TREND_MONTH
      : ATTENDANCE_RATE_TREND_YEAR;
  return (
    <>
      {/* KPI Row */}
      <View className="flex-row mb-0">
        <KpiCard
          icon="presentation"
          label="Sessions Created"
          value={SUPERVISOR_STATS.totalSessions}
          accent="#001F54"
          isDark={isDark}
        />
        <KpiCard
          icon="account-group"
          label="Total Attendees"
          value={SUPERVISOR_STATS.totalAttendees}
          accent="#2563eb"
          isDark={isDark}
        />
      </View>
      <View className="flex-row mb-4">
        <KpiCard
          icon="chart-line"
          label="Avg. Rate"
          value={`${SUPERVISOR_STATS.avgRate}`}
          unit="%"
          accent="#16a34a"
          isDark={isDark}
        />
        <KpiCard
          icon="calendar-star"
          label="Peak Day"
          value={SUPERVISOR_STATS.peakDay}
          accent="#f59e0b"
          isDark={isDark}
        />
      </View>

      <ChartCard
        title="Sessions Hosted"
        subtitle={`Frequency — ${period.toLowerCase()} view`}
        isDark={isDark}
      >
        <BarChart data={sessionsTrend} color="#001F54" height={140} />
      </ChartCard>

      <ChartCard
        title="Attendance Rate Trend"
        subtitle={`Average attendance rate — ${period.toLowerCase()} view`}
        isDark={isDark}
      >
        <LineChart data={rateTrend} color="#2563eb" height={140} />
      </ChartCard>

      {/* Method Breakdown Donut */}
      <ChartCard
        title="Check-In Method Breakdown"
        subtitle="Sessions by method used"
        isDark={isDark}
      >
        <View className="flex-row items-center justify-between">
          <DonutChart data={SESSION_BREAKDOWN} size={140} thickness={26} />
          <View className="flex-1 ml-6">
            {SESSION_BREAKDOWN.map((d) => (
              <View key={d.label} className="flex-row items-center mb-3">
                <View
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: d.color }}
                />
                <View>
                  <Text
                    className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-700"}`}
                  >
                    {d.value}
                  </Text>
                  <Text className="text-xs text-slate-400">{d.label}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ChartCard>

      {/* Supervisor Insights */}
      <ChartCard title="Insights" isDark={isDark}>
        <InsightRow
          icon="trending-up"
          text="Session count grew 25% vs. last quarter. Great momentum!"
          positive
          isDark={isDark}
        />
        <InsightRow
          icon="check-circle-outline"
          text="Your sessions maintain a 91.2% average attendance — above target."
          positive
          isDark={isDark}
        />
        <InsightRow
          icon="calendar-alert"
          text="Week 3 had only 6 sessions. Consider scheduling more mid-month."
          positive={false}
          isDark={isDark}
        />
        <InsightRow
          icon="qrcode-scan"
          text="QR-based check-in is highly adopted. Consider expanding it further."
          positive
          isDark={isDark}
        />
      </ChartCard>
    </>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

const AnalyticsScreen = () => {
  const [activeTab, setActiveTab] = useState<"attendee" | "supervisor">("attendee");
  const [period, setPeriod] = useState<Period>("Month");
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View className={`flex-1 ${isDark ? "bg-slate-900" : "bg-[#e8eff8]"}`}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Role Toggle */}
        <View className="mb-5">
          <SegmentedTab
            options={[
              { key: "attendee", label: "Attendee" },
              { key: "supervisor", label: "Supervisor" },
            ]}
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as "attendee" | "supervisor")}
          />
        </View>

        {/* Section Title */}
        <View className="flex-row items-center mb-4">
          <View className="w-1 h-6 bg-[#001F54] rounded-full mr-2" />
          <Text
            className={`text-xl font-extrabold ${isDark ? "text-white" : "text-[#001F54]"}`}
          >
            {activeTab === "attendee" ? "My Attendance" : "Session Insights"}
          </Text>
        </View>

        {/* Period Selector */}
        <PeriodSelector period={period} onChange={setPeriod} isDark={isDark} />

        {activeTab === "attendee" ? (
          <AttendeeAnalytics isDark={isDark} period={period} />
        ) : (
          <SupervisorAnalytics isDark={isDark} period={period} />
        )}
      </ScrollView>
    </View>
  );
};

export default AnalyticsScreen;
