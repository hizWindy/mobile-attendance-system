// /components/modal/CreateSessionModal.tsx
import { ScheduleType } from "@/types/SessionTypes";
import { computeDurationMinutes, computeEndDate, getDaysBetweenDates, hasWeekdayInRange, formatTime12hr } from "@/utils/timeUtils";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useColorScheme,
} from "react-native";

// ─── Constants ────────────────────────────────────────────────────────────────
const ATTENDANCE_METHODS = [
  {
    id: "manual",
    label: "Manual Check-In",
    icon: "hand-left-outline",
    remote: true,
    onsite: true,
  },
  {
    id: "qr",
    label: "QR Scanning",
    icon: "qr-code-outline",
    remote: true,
    onsite: true,
  },
  {
    id: "geofencing",
    label: "Geofencing",
    icon: "map-outline",
    remote: false,
    onsite: true,
  },
  {
    id: "face",
    label: "Biometrics",
    icon: "scan-outline",
    remote: true,
    onsite: true,
  },
];

const SCHEDULE_TYPES: {
  label: string;
  value: ScheduleType;
  icon: React.ComponentProps<typeof Ionicons>["name"];
}[] = [
  { label: "One Time", value: "one-time", icon: "time-outline" },
  { label: "Daily", value: "daily", icon: "today-outline" },
  { label: "Weekly", value: "weekly", icon: "calendar-outline" },
  { label: "Every N Days", value: "every_n_days", icon: "repeat-outline" },
  { label: "Semestral", value: "semestral", icon: "school-outline" },
  { label: "Custom", value: "custom", icon: "construct-outline" },
];

const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];
const WEEKDAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
// ─── Sub-components ───────────────────────────────────────────────────────────
const SectionHeader = ({
  icon,
  title,
  isDark,
}: {
  icon: any;
  title: string;
  isDark: boolean;
}) => (
  <View style={styles.sectionHeaderLine}>
    <Ionicons name={icon} size={18} color="#0F172A" />
    <Text style={[styles.sectionTitle, isDark && styles.textWhite]}>
      {title}
    </Text>
    <View style={styles.line} />
  </View>
);

/** A compact +/− stepper for numeric inputs. */
const Stepper = ({
  value,
  onChange,
  min = 0,
  max = 120,
  step = 5,
  unit = "",
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}) => (
  <View style={styles.stepperRow}>
    <TouchableOpacity
      style={styles.stepperBtn}
      onPress={() => onChange(Math.max(min, value - step))}
    >
      <Ionicons name="remove" size={18} color="#3B82F6" />
    </TouchableOpacity>
    <Text style={styles.stepperValue}>
      {value}
      {unit ? ` ${unit}` : ""}
    </Text>
    <TouchableOpacity
      style={styles.stepperBtn}
      onPress={() => onChange(Math.min(max, value + step))}
    >
      <Ionicons name="add" size={18} color="#3B82F6" />
    </TouchableOpacity>
  </View>
);

// ─── Validation ───────────────────────────────────────────────────────────────
const VALID_SCHEDULE_TYPES: ScheduleType[] = [
  "one-time",
  "daily",
  "weekly",
  "every_n_days",
  "semestral",
  "custom"
];

interface ValidationResult {
  valid: boolean;
  message?: string;
}

function validateSessionForm(data: {
  sessionName: string;
  startDate: string;
  startTime: string;
  endTime: string;
  scheduleType: ScheduleType;
  sessionType: string;
  selectedMethods: string[];
  exactCoords: { lat: string; lon: string } | null;
  radius: string;
}): ValidationResult {
  const {
    sessionName,
    startDate,
    startTime,
    endTime,
    scheduleType,
    sessionType,
    selectedMethods,
    exactCoords,
    radius,
  } = data;

  // Required text fields
  if (!sessionName.trim()) {
    return { valid: false, message: "Session name is required." };
  }
  if (!startDate) {
    return { valid: false, message: "Start date is required." };
  }
  if (!startTime) {
    return { valid: false, message: "Start time is required." };
  }
  if (!endTime) {
    return { valid: false, message: "End time is required." };
  }

  // Schedule type validation
  if (!VALID_SCHEDULE_TYPES.includes(scheduleType)) {
    return { valid: false, message: "Invalid schedule type selected." };
  }

  // Methods: at least one required
  if (selectedMethods.length === 0) {
    return {
      valid: false,
      message: "Select at least one attendance verification method.",
    };
  }

  // On-site / Hybrid: location data required
  if (sessionType === "On-site" || sessionType === "Hybrid") {
    if (!exactCoords) {
      return {
        valid: false,
        message:
          "Please select a location for on-site or hybrid sessions. Search and tap a result.",
      };
    }
    if (!radius || isNaN(parseInt(radius)) || parseInt(radius) <= 0) {
      return {
        valid: false,
        message: "Please enter a valid geofence radius (in meters).",
      };
    }
  }

  return { valid: true };
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface CreateSessionModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (sessionCode: string, payload?: any) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export const CreateSessionModal: React.FC<CreateSessionModalProps> = ({
  visible,
  onClose,
  onCreate,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // ── Form state ─────────────────────────────────────────────────────────────
  const [sessionName, setSessionName] = useState("");
  const [scheduleType, setScheduleType] = useState<ScheduleType>("one-time");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>([]);
  const [intervalDays, setIntervalDays] = useState("2");
  const [includeWeekends, setIncludeWeekends] = useState(false);
  const [customDates, setCustomDates] = useState<string[]>([]);
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState(15);
  const [absentLimitMinutes, setAbsentLimitMinutes] = useState("");
  const [graceWarning, setGraceWarning] = useState<string | null>(null);

  const [scheduleErrors, setScheduleErrors] = useState<Record<string, string>>({});
  const [smartWarning, setSmartWarning] = useState<string | null>(null);
  const [smartSuggestion, setSmartSuggestion] = useState<string | null>(null);

  const [sessionType, setSessionType] = useState<"On-site" | "Remote" | "Hybrid">("On-site");
  const [selectedMethods, setSelectedMethods] = useState<string[]>(["Manual Click"]);
  const [qrMode, setQrMode] = useState<"permanent" | "rotating">("permanent");
  const [qrRefreshIntervalSecs, setQrRefreshIntervalSecs] = useState("");
  const [qrWindowSecs, setQrWindowSecs] = useState("");

  const [location, setLocation] = useState("");
  const [radius, setRadius] = useState("50");
  const [additionalDetails, setAdditionalDetails] = useState<
    { key: string; value: string }[]
  >([]);

  const [dateObj, setDateObj] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<"start" | "end" | "custom">("start");

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerMode, setTimePickerMode] = useState<"start" | "end">("start");

  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [exactCoords, setExactCoords] = useState<{
    lat: string;
    lon: string;
  } | null>(null);

  const [remotePlatform, setRemotePlatform] = useState("");
  const [customPlatform, setCustomPlatform] = useState("");
  const [remoteLink, setRemoteLink] = useState("");

  const resetForm = useCallback(() => {
    setSessionName("");
    setScheduleType("one-time");
    setStartDate("");
    setEndDate("");
    setStartTime("");
    setEndTime("");
    setDaysOfWeek([]);
    setIntervalDays("2");
    setIncludeWeekends(false);
    setCustomDates([]);
    setScheduleErrors({});
    setSmartWarning(null);
    setSmartSuggestion(null);
    setGracePeriodMinutes(15);
    setAbsentLimitMinutes("");
    setSessionType("On-site");
    setSelectedMethods(["Manual Click"]);
    setQrMode("permanent");
    setQrRefreshIntervalSecs("");
    setQrWindowSecs("");
    setLocation("");
    setRadius("50");
    setAdditionalDetails([]);
    setDateObj(new Date());
    setShowDatePicker(false);
    setDatePickerMode("start");
    setShowTimePicker(false);
    setTimePickerMode("start");
    setLocationQuery("");
    setLocationResults([]);
    setShowDropdown(false);
    setExactCoords(null);
    setRemotePlatform("");
    setCustomPlatform("");
    setRemoteLink("");
  }, []);

  // ── Smart Frequency Assessment ───────────────────────────────────────────
  useEffect(() => {
    setSmartWarning(null);
    setSmartSuggestion(null);

    if (scheduleType === "daily" && startDate && endDate) {
      const days = getDaysBetweenDates(startDate, endDate);
      if (days > 0 && days <= 2) {
        setSmartWarning("A daily schedule with only 2 days is basically a one-time session. Consider switching to One Time.");
        setSmartSuggestion("one-time");
      }
    } else if (scheduleType === "weekly" && startDate && endDate) {
      const days = getDaysBetweenDates(startDate, endDate);
      if (days < 7 && days > 0) {
        setSmartWarning("Your date range is too short for a weekly schedule. Extend your end date or switch to One Time.");
        if (days <= 2) setSmartSuggestion("one-time");
      } else if (daysOfWeek.length > 0 && !hasWeekdayInRange(startDate, endDate, daysOfWeek)) {
        setSmartWarning(`Your date range has no ${daysOfWeek.map(d => d.charAt(0).toUpperCase() + d.slice(1,3)).join(", ")}. Adjust your dates or selected days.`);
      }
    } else if (scheduleType === "every_n_days" && startDate && endDate) {
      const days = getDaysBetweenDates(startDate, endDate);
      const interval = parseInt(intervalDays) || 1;
      if (interval > days && days > 0) {
        setSmartWarning("Your interval is longer than your date range — this will only occur once. Consider switching to One Time.");
        setSmartSuggestion("one-time");
      }
    } else if (scheduleType === "semestral" && startDate && endDate) {
      const days = getDaysBetweenDates(startDate, endDate);
      if (days > 0 && days < 30) {
        setSmartWarning(`Semestral requires at least 30 days. Current range: ${days} days.`);
      }
    } else if (scheduleType === "custom") {
      if (customDates.length === 1) {
        setSmartWarning("Only 1 date selected. Consider using One Time instead.");
        setSmartSuggestion("one-time");
      }
    }

  }, [scheduleType, startDate, endDate, daysOfWeek, intervalDays, customDates]);

  // ── Smart Grace Period Validation ────────────────────────────────────────
  useEffect(() => {
    setGraceWarning(null);

    if (startTime && endTime) {
      const duration = computeDurationMinutes(startTime, endTime);
      if (duration > 0 && gracePeriodMinutes >= duration) {
        setGraceWarning("Grace period is too long for this session duration.");
        return;
      }
    }

    if (absentLimitMinutes) {
      const absentLimit = parseInt(absentLimitMinutes, 10);
      if (!isNaN(absentLimit) && gracePeriodMinutes >= absentLimit) {
        setGraceWarning("Grace period must be shorter than the absent limit.");
        return;
      }
    }
  }, [gracePeriodMinutes, absentLimitMinutes, startTime, endTime]);

  // ── Location search (Photon API) ───────────────────────────────────────────
  useEffect(() => {
    if (locationQuery.length < 3) {
      setLocationResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      if (locationQuery === location) return;

      try {
        const response = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(locationQuery)}&limit=5`,
        );
        const data = await response.json();
        if (data.features) {
          const results = data.features.map((f: any) => ({
            displayName: [
              f.properties.name,
              f.properties.street,
              f.properties.city,
              f.properties.country,
            ]
              .filter(Boolean)
              .join(", "),
            lat: f.geometry.coordinates[1].toString(),
            lon: f.geometry.coordinates[0].toString(),
          }));
          setLocationResults(results);
          setShowDropdown(true);
        }
      } catch (e) {
        console.error("Photon API error:", e);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [locationQuery, location]);

  // ── Filter methods when switching to Remote ────────────────────────────────
  useEffect(() => {
    if (sessionType === "Remote") {
      setSelectedMethods((prev) =>
        prev.filter((m) => {
          const method = ATTENDANCE_METHODS.find((am) => am.id === m);
          return method?.remote;
        }),
      );
    }
  }, [sessionType]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const toggleMethod = (methodId: string) => {
    const config = ATTENDANCE_METHODS.find((m) => m.id === methodId);
    if (sessionType === "Remote" && !config?.remote) return;
    setSelectedMethods((prev) =>
      prev.includes(methodId)
        ? prev.filter((m) => m !== methodId)
        : [...prev, methodId],
    );
  };

  const toggleDay = (day: string) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const addDetailRow = () =>
    setAdditionalDetails((prev) => [...prev, { key: "", value: "" }]);

  const removeDetailRow = (index: number) => {
    setAdditionalDetails((prev) => prev.filter((_, i) => i !== index));
  };

  const updateDetailRow = (
    index: number,
    fld: "key" | "value",
    val: string,
  ) => {
    setAdditionalDetails((prev) => {
      const next = [...prev];
      next[index][fld] = val;
      return next;
    });
  };

  const parseTimeObj = (t: string) => {
    if (!t) return null;
    const [h, m] = t.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  };
  const handleGracePeriodChange = (val: number) => {
    setGracePeriodMinutes(val);
  };

  const handleAbsentLimitChange = (text: string) => {
    const t = text.replace(/[^0-9]/g, "");
    setAbsentLimitMinutes(t);
  };

  const getAutomaticLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const loc = await Location.getCurrentPositionAsync({});
      const reverse = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (reverse.length > 0) {
        const address =
          `${reverse[0].streetNumber || ""} ${reverse[0].street || ""} ${reverse[0].city || ""}`.trim();
        setLocationQuery(address);
        setLocation(address);
        setExactCoords({
          lat: loc.coords.latitude.toString(),
          lon: loc.coords.longitude.toString(),
        });
        setShowDropdown(false);
      }
    } catch (e) {
      console.error("GPS error:", e);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setDateObj(selectedDate);
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const day = String(selectedDate.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;
      
      if (datePickerMode === "start") {
        setStartDate(dateStr);
        if (scheduleType === "one-time") {
          setEndDate(dateStr);
        } else if (endDate && dateStr > endDate) {
          setEndDate("");
          setSmartWarning("End date was reset — please reselect.");
        }
      } else if (datePickerMode === "end") {
        setEndDate(dateStr);
      } else if (datePickerMode === "custom") {
        if (!customDates.includes(dateStr)) {
          setCustomDates(prev => [...prev, dateStr]);
        }
      }
    }
  };

  const onTimeChange = (event: any, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === "ios");
    if (selectedDate) {
      setDateObj(selectedDate);
      const timeStr = selectedDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      if (timePickerMode === "start") {
        setStartTime(timeStr);
        if (endTime) {
            const s = parseTimeObj(timeStr)!;
            const e = parseTimeObj(endTime)!;
            if (s.getTime() + 15 * 60000 > e.getTime()) {
                setEndTime("");
                setSmartWarning("End time was reset — please reselect.");
            }
        }
      }
      else {
          setEndTime(timeStr);
      }
    }
  };

  // ── Generate / submit ──────────────────────────────────────────────────────
  const handleGenerate = useCallback(() => {
    const newErrors: Record<string, string> = {};
    
    if (!startTime) newErrors.startTime = "Start time is required";
    if (!endTime) newErrors.endTime = "End time is required";
    if (startTime && endTime && startTime >= endTime) {
      newErrors.time = "Start time must be before end time";
    }

    if (scheduleType === "one-time") {
      if (!startDate) newErrors.startDate = "Date is required";
    } else if (scheduleType === "custom") {
      if (customDates.length === 0) newErrors.customDates = "At least one date is required";
    } else {
      if (!startDate) newErrors.startDate = "Start date is required";
      if (!endDate) newErrors.endDate = "End date is required";
      
      if (scheduleType === "weekly" && daysOfWeek.length === 0) {
        newErrors.daysOfWeek = "At least one day must be selected";
      }
      if (scheduleType === "every_n_days") {
        const interval = parseInt(intervalDays);
        if (isNaN(interval) || interval <= 0) {
          newErrors.intervalDays = "Repeat interval must be a positive integer";
        }
      }
      if (scheduleType === "semestral" && startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        if (end <= start || diffDays < 30) {
          newErrors.endDate = "End date must be at least 30 days after start date";
        }
      }
    }

    setScheduleErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) return;

    const validation = validateSessionForm({
      sessionName,
      startDate,
      startTime,
      endTime,
      scheduleType,
      sessionType,
      selectedMethods,
      exactCoords,
      radius,
    });

    if (!validation.valid) {
      Alert.alert("Validation Error", validation.message);
      return;
    }

    const code = Math.random().toString(36).substr(2, 6).toUpperCase();

    let schedulePayload: any = { type: scheduleType, start_time: startTime, end_time: endTime };
    
    switch(scheduleType) {
      case "one-time":
        schedulePayload.start_date = startDate;
        schedulePayload.end_date = startDate;
        break;
      case "daily":
        schedulePayload.start_date = startDate;
        schedulePayload.end_date = endDate;
        schedulePayload.include_weekends = includeWeekends;
        break;
      case "weekly":
        schedulePayload.start_date = startDate;
        schedulePayload.end_date = endDate;
        schedulePayload.days_of_week = daysOfWeek;
        break;
      case "every_n_days":
        schedulePayload.start_date = startDate;
        schedulePayload.end_date = endDate;
        schedulePayload.interval_days = parseInt(intervalDays);
        break;
      case "semestral":
        schedulePayload.start_date = startDate;
        schedulePayload.end_date = endDate;
        schedulePayload.include_weekends = includeWeekends;
        break;
      case "custom":
        schedulePayload.dates = customDates;
        break;
    }

    const payload = {
      session_code: code,
      session_name: sessionName,
      session_setup: sessionType.toLowerCase().replace("-", "_"),
      session_status: "upcoming",
      methods: selectedMethods,
      location: {
        ...((sessionType === "Remote" || sessionType === "Hybrid")
          ? {
              platform:
                remotePlatform === "Others"
                  ? customPlatform
                  : remotePlatform || undefined,
              link: remoteLink || undefined,
            }
          : {}),
        ...((sessionType === "On-site" || sessionType === "Hybrid")
          ? {
              address: location || locationQuery,
              latitude: exactCoords?.lat
                ? parseFloat(exactCoords.lat)
                : undefined,
              longitude: exactCoords?.lon
                ? parseFloat(exactCoords.lon)
                : undefined,
              radius: parseInt(radius) || undefined,
            }
          : {}),
      },
      schedule: schedulePayload,
      attendance_config: {
        grace_period_mins: gracePeriodMinutes,
        ...(absentLimitMinutes ? { absent_limit_mins: parseInt(absentLimitMinutes) } : {}),
      },
      ...(selectedMethods.includes("qr")
        ? {
            qr_config: {
              qr_mode: qrMode,
              ...(qrMode === "rotating"
                ? {
                    refresh_interval_secs: qrRefreshIntervalSecs ? parseInt(qrRefreshIntervalSecs) : 0,
                    window_secs: qrWindowSecs ? parseInt(qrWindowSecs) : 0,
                  }
                : {}),
            },
          }
        : {}),
    };

    onCreate(code, payload);
    resetForm();
    onClose();
  }, [
    sessionName,
    startDate,
    startTime,
    endTime,
    scheduleType,
    sessionType,
    selectedMethods,
    exactCoords,
    radius,
    gracePeriodMinutes,
    absentLimitMinutes,
    endDate,
    additionalDetails,
    daysOfWeek,
    intervalDays,
    qrMode,
    qrRefreshIntervalSecs,
    qrWindowSecs,
    remotePlatform,
    customPlatform,
    remoteLink,
    location,
    locationQuery,
    onCreate,
    resetForm,
    onClose,
  ]);

  if (!visible) return null;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.fullscreenOverlay}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={StyleSheet.absoluteFill} />
      </TouchableWithoutFeedback>

      <View style={[styles.modalBox, isDark && styles.modalBoxDark]}>
        {/* Header */}
        <View style={[styles.headerStandard, isDark && styles.headerDark]}>
          <View>
            <Text style={styles.headerTitle}>New Session</Text>
            <Text style={styles.headerSub}>Attendance portal configuration</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtnStandard}>
            <Ionicons name="close" size={24} color="#0F172A" />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Session Info ─────────────────────────────────────────────── */}
          <SectionHeader
            icon="information-circle-outline"
            title="Session Info"
            isDark={isDark}
          />

          <Text style={styles.label}>Title</Text>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            placeholder="e.g. Project Sync"
            placeholderTextColor="#94a3b8"
            value={sessionName}
            onChangeText={setSessionName}
          />

          <Text style={styles.label}>Frequency</Text>
          <View style={styles.scheduleGridRow}>
            {SCHEDULE_TYPES.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[
                  styles.scheduleBtn,
                  scheduleType === t.value && styles.scheduleBtnActive,
                ]}
                onPress={() => setScheduleType(t.value)}
              >
                <Ionicons
                  name={t.icon}
                  size={18}
                  color={scheduleType === t.value ? "#fff" : "#0F172A"}
                />
                <Text
                  style={[
                    styles.scheduleBtnText,
                    scheduleType === t.value && styles.textWhite,
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Timeline ─────────────────────────────────────────────────── */}
          <SectionHeader
            icon="calendar-outline"
            title="Timeline"
            isDark={isDark}
          />

          {/* Interval Days */}
          {scheduleType === "every_n_days" && (
            <View style={[styles.accentBox, { marginBottom: 16 }]}>
              <Text style={styles.label}>Repeat Every (Days)</Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                placeholder="2"
                keyboardType="numeric"
                value={intervalDays}
                onChangeText={setIntervalDays}
              />
              {scheduleErrors.intervalDays && <Text style={{ color: "#EF4444", fontSize: 12, marginTop: 4 }}>{scheduleErrors.intervalDays}</Text>}
            </View>
          )}

          {/* Weekly days picker */}
          {scheduleType === "weekly" && (
            <View style={[styles.accentBox, { marginBottom: 16 }]}>
              <Text style={styles.label}>Selected Days</Text>
              <View style={styles.daysGrid}>
                {WEEKDAYS.map((day, idx) => {
                  const isSelected = daysOfWeek.includes(day);
                  return (
                    <TouchableOpacity
                      key={day}
                      onPress={() => toggleDay(day)}
                      style={[styles.dayCard, isSelected && styles.dayCardActive]}
                    >
                      <Text
                        style={[
                          styles.dayCardText,
                          isSelected && styles.textWhite,
                        ]}
                      >
                        {WEEKDAYS_SHORT[idx]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {scheduleErrors.daysOfWeek && <Text style={{ color: "#EF4444", fontSize: 12, marginTop: 4 }}>{scheduleErrors.daysOfWeek}</Text>}
            </View>
          )}

          {/* Custom Date Pickers */}
          {scheduleType === "custom" && (
            <View style={[styles.accentBox, { marginBottom: 16 }]}>
              <Text style={styles.label}>Selected Dates</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                {customDates.map((d, index) => (
                  <View key={index} style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#E2E8F0", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}>
                    <Text style={{ fontSize: 12, color: "#0F172A", marginRight: 6 }}>{d}</Text>
                    <TouchableOpacity onPress={() => setCustomDates(prev => prev.filter((_, i) => i !== index))}>
                      <Ionicons name="close-circle" size={16} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                ))}
            
                <TouchableOpacity
                  style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#EFF6FF", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: "#DBEAFE" }}
                  onPress={() => {
                    setDatePickerMode("custom");
                    setShowDatePicker(true);
                  }}
                >
                  <Ionicons name="add" size={16} color="#2563EB" style={{ marginRight: 4 }} />
                  <Text style={{ fontSize: 12, color: "#2563EB", fontWeight: "600" }}>Add Date</Text>
                </TouchableOpacity>
              </View>
              {scheduleErrors.customDates && <Text style={{ color: "#EF4444", fontSize: 12, marginTop: 8 }}>{scheduleErrors.customDates}</Text>}
            </View>
          )}

          {/* Date pickers (standard) */}
          {scheduleType !== "custom" && (
            <View style={styles.gridRow}>
              <View style={styles.flex1}>
                <Text style={styles.label}>{scheduleType === "one-time" ? "Date" : "Start Date"}</Text>
                <TouchableOpacity
                  style={[styles.input, isDark && styles.inputDark]}
                  onPress={() => {
                    setDatePickerMode("start");
                    setShowDatePicker(true);
                  }}
                >
                  <Text style={[styles.valText, !startDate && styles.placeholder]}>
                    {startDate || "Select"}
                  </Text>
                </TouchableOpacity>
                {scheduleErrors.startDate && <Text style={{ color: "#EF4444", fontSize: 12, marginTop: 4 }}>{scheduleErrors.startDate}</Text>}
              </View>

              {scheduleType !== "one-time" && (
                <View style={styles.flex1}>
                  <Text style={styles.label}>End Date</Text>
                  <TouchableOpacity
                    style={[styles.input, isDark && styles.inputDark]}
                    onPress={() => {
                      setDatePickerMode("end");
                      setShowDatePicker(true);
                    }}
                  >
                    <Text style={[styles.valText, !endDate && styles.placeholder]}>
                      {endDate || "Select"}
                    </Text>
                  </TouchableOpacity>
                  {scheduleErrors.endDate && <Text style={{ color: "#EF4444", fontSize: 12, marginTop: 4 }}>{scheduleErrors.endDate}</Text>}
                </View>
              )}
            </View>
          )}

          {/* Time pickers */}
          <View style={styles.gridRow}>
            <View style={styles.flex1}>
              <Text style={styles.label}>Start Time</Text>
              <TouchableOpacity
                style={[styles.input, isDark && styles.inputDark]}
                onPress={() => {
                  setTimePickerMode("start");
                  setShowTimePicker(true);
                }}
              >
                <Text style={[styles.valText, !startTime && styles.placeholder]}>
                  {formatTime12hr(startTime) || "09:00 AM"}
                </Text>
              </TouchableOpacity>
              {scheduleErrors.startTime && <Text style={{ color: "#EF4444", fontSize: 12, marginTop: 4 }}>{scheduleErrors.startTime}</Text>}
            </View>

            <View style={styles.flex1}>
              <Text style={styles.label}>End Time</Text>
              <TouchableOpacity
                style={[styles.input, isDark && styles.inputDark]}
                onPress={() => {
                  setTimePickerMode("end");
                  setShowTimePicker(true);
                }}
              >
                <Text style={[styles.valText, !endTime && styles.placeholder]}>
                  {formatTime12hr(endTime) || "05:00 PM"}
                </Text>
              </TouchableOpacity>
              {scheduleErrors.endTime && <Text style={{ color: "#EF4444", fontSize: 12, marginTop: 4 }}>{scheduleErrors.endTime}</Text>}
            </View>
          </View>
          
          {(() => {
            if (!startTime || !endTime) return null;
            const s = parseTimeObj(startTime)!;
            const e = parseTimeObj(endTime)!;
            const diffMins = (e.getTime() - s.getTime()) / 60000;
            if (endTime <= startTime) {
                return <Text style={{ color: "#EF4444", fontSize: 13, fontWeight: "600", marginTop: 8, paddingHorizontal: 4 }}>⚠️ End time must be after start time</Text>;
            }
            const hrs = Math.floor(diffMins / 60);
            const mins = diffMins % 60;
            const hrStr = hrs > 0 ? `${hrs} hour${hrs > 1 ? 's' : ''}` : '';
            const minStr = mins > 0 ? `${mins} minute${mins > 1 ? 's' : ''}` : '';
            return <Text style={{ color: "#10B981", fontSize: 13, fontWeight: "600", marginTop: 8, paddingHorizontal: 4 }}>⏱ Duration: {`${hrStr} ${minStr}`.trim()}</Text>;
          })()}

          {smartWarning && (
            <View style={{ backgroundColor: "#EFF6FF", padding: 12, borderRadius: 12, flexDirection: "row", gap: 8, marginBottom: 16, marginTop: 4, borderWidth: 1, borderColor: "#BFDBFE", alignItems: "flex-start" }}>
              <Ionicons name="information-circle" size={20} color="#2563EB" style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, color: "#1E3A8A", lineHeight: 18 }}>{smartWarning}</Text>
                {smartSuggestion && (
                  <TouchableOpacity onPress={() => { setScheduleType(smartSuggestion as ScheduleType); setSmartWarning(null); setSmartSuggestion(null); }} style={{ marginTop: 8, backgroundColor: "#DBEAFE", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignSelf: "flex-start" }}>
                    <Text style={{ fontSize: 12, color: "#1D4ED8", fontWeight: "700" }}>Switch to {smartSuggestion === "one-time" ? "One Time" : "Suggested"}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}


          {/* Include Weekends Switch */}
          {(scheduleType === "daily" || scheduleType === "semestral") && (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, marginBottom: 16, backgroundColor: isDark ? "#1E293B" : "#F8FAFC", padding: 12, borderRadius: 12 }}>
              <View>
                <Text style={{ fontSize: 14, fontWeight: "600", color: isDark ? "#F8FAFC" : "#0F172A" }}>Include Weekends</Text>
                <Text style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>Allow sessions to run on Sat/Sun</Text>
              </View>
              <Switch
                value={includeWeekends}
                onValueChange={setIncludeWeekends}
                trackColor={{ false: "#CBD5E1", true: "#3B82F6" }}
                thumbColor={Platform.OS === "android" ? "#fff" : undefined}
              />
            </View>
          )}

          {/* ── Attendance Settings ───────────────────────────────────── */}
          <SectionHeader
            icon="shield-checkmark-outline"
            title="Attendance Settings"
            isDark={isDark}
          />

          {/* Grace Period stepper */}
          <View style={styles.gracePeriodRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Grace Period</Text>
              <Text style={styles.graceSubLabel}>
                Minutes allowed after start before marking late
              </Text>
            </View>
            <Stepper
              value={gracePeriodMinutes}
              onChange={handleGracePeriodChange}
              min={0}
              max={120}
              step={5}
              unit="min"
            />
          </View>

          {/* Absent Limit Field (Optional) */}
          <View style={[styles.gracePeriodRow, { marginTop: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Absent Time Limit (Optional)</Text>
              <Text style={[styles.graceSubLabel, { paddingRight: 10 }]}>
                Defines how many minutes after the start time a participant is marked absent.
              </Text>
            </View>
            <TextInput
              style={[
                styles.kvInput,
                { width: 90, textAlign: "center" },
                isDark && styles.inputDark,
              ]}
              placeholder="e.g. 30"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={absentLimitMinutes}
              onChangeText={handleAbsentLimitChange}
            />
          </View>

          {/* Smart Warning Indicator */}
          {graceWarning && (
            <View style={{ flexDirection: "row", backgroundColor: "rgba(245, 158, 11, 0.1)", padding: 12, borderRadius: 12, marginTop: 8, marginBottom: 16, alignItems: "center" }}>
              <Ionicons name="warning-outline" size={16} color="#D97706" style={{ marginRight: 8, marginTop: 2 }} />
              <Text style={{ flex: 1, fontSize: 12, color: "#D97706", fontWeight: "600", lineHeight: 18 }}>
                {graceWarning}
              </Text>
              <TouchableOpacity onPress={() => setScheduleType("one-time")} style={{ backgroundColor: "#D97706", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginLeft: 8 }}>
                <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>Switch to One Time</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Setup & Verification ──────────────────────────────────────── */}
          <SectionHeader
            icon="settings-outline"
            title="Setup & Verification"
            isDark={isDark}
          />

          <Text style={styles.label}>Session Mode</Text>
          <View style={styles.scheduleGridRow}>
            {(["On-site", "Remote", "Hybrid"] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.scheduleBtn,
                  { width: "31%" },
                  sessionType === t && styles.scheduleBtnActive,
                ]}
                onPress={() => setSessionType(t)}
              >
                <Ionicons
                  name={
                    t === "On-site"
                      ? "location-outline"
                      : t === "Remote"
                        ? "videocam-outline"
                        : "sync-outline"
                  }
                  size={18}
                  color={sessionType === t ? "#fff" : "#0F172A"}
                />
                <Text
                  style={[
                    styles.scheduleBtnText,
                    sessionType === t && styles.textWhite,
                  ]}
                >
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Remote platform */}
          {(sessionType === "Remote" || sessionType === "Hybrid") && (
            <View style={styles.locationWrapper}>
              <Text style={styles.label}>Virtual Platform</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 12 }}
              >
                {["Zoom", "Google Meet", "Teams", "Discord", "Others"].map(
                  (p) => (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.pillBtn,
                        remotePlatform === p && styles.pillBtnActive,
                      ]}
                      onPress={() =>
                        setRemotePlatform(p === remotePlatform ? "" : p)
                      }
                    >
                      <Text
                        style={[
                          styles.pillBtnText,
                          remotePlatform === p && styles.textWhite,
                        ]}
                      >
                        {p}
                      </Text>
                    </TouchableOpacity>
                  ),
                )}
              </ScrollView>
              {remotePlatform === "Others" && (
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  placeholder="Platform name"
                  value={customPlatform}
                  onChangeText={setCustomPlatform}
                />
              )}
              <TextInput
                style={[
                  styles.input,
                  isDark && styles.inputDark,
                  { marginBottom: 0 },
                ]}
                placeholder="Meeting URL"
                value={remoteLink}
                onChangeText={setRemoteLink}
              />
            </View>
          )}

          {/* On-site location */}
          {(sessionType === "On-site" || sessionType === "Hybrid") && (
            <View style={styles.locationWrapper}>
              <Text style={styles.label}>Location & Radius</Text>
              <View style={{ zIndex: 1000 }}>
                <View style={styles.searchBarBox}>
                  <TextInput
                    style={[styles.searchField, isDark && styles.inputDark]}
                    placeholder="Search full address..."
                    value={locationQuery}
                    onChangeText={setLocationQuery}
                  />
                  <TouchableOpacity
                    onPress={getAutomaticLocation}
                    style={styles.gpsAction}
                  >
                    <Ionicons name="location" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>

                {showDropdown && locationResults.length > 0 && (
                  <View style={styles.dropdownResultsOverlay}>
                    {locationResults.map((item, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.dropdownItemModern}
                        onPress={() => {
                          setLocationQuery(item.displayName);
                          setLocation(item.displayName);
                          setExactCoords({
                            lat: item.lat,
                            lon: item.lon,
                          });
                          setShowDropdown(false);
                        }}
                      >
                        <Ionicons
                          name="pin"
                          size={18}
                          color="#3B82F6"
                          style={{ marginRight: 12 }}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.dropdownTitle} numberOfLines={1}>
                            {item.displayName.split(",")[0]}
                          </Text>
                          <Text style={styles.dropdownSub} numberOfLines={2}>
                            {item.displayName.split(",").slice(1).join(",").trim()}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={[styles.radiusBox, { marginTop: 12 }]}>
                <TextInput
                  style={[styles.radiusInput, isDark && styles.inputDark]}
                  placeholder="50"
                  keyboardType="numeric"
                  value={radius}
                  onChangeText={(t) => {
                    const safeVal = t.replace(/[^0-9]/g, "");
                    if (!safeVal || safeVal === "0") setRadius("");
                    else setRadius(parseInt(safeVal, 10).toString());
                  }}
                />
                <Text style={styles.unitText}>meters radius</Text>
              </View>
            </View>
          )}

          {/* Verification methods */}
          <Text style={[styles.label, { marginTop: 16 }]}>Verification</Text>
          <View style={styles.methodList}>
            {ATTENDANCE_METHODS.map((m) => {
              const active = selectedMethods.includes(m.id);
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.methodItem, active && styles.methodItemActive]}
                  onPress={() => toggleMethod(m.id)}
                >
                  <Ionicons
                    name={m.icon as any}
                    size={20}
                    color={active ? "#fff" : "#0F172A"}
                  />
                  <Text
                    style={[
                      styles.methodItemText,
                      active && styles.textWhite,
                    ]}
                  >
                    {m.label}
                  </Text>
                  <Ionicons
                    name={active ? "checkmark-circle" : "ellipse-outline"}
                    size={20}
                    color={active ? "#fff" : "#cbd5e1"}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* QR Method Configuration */}
          {selectedMethods.includes("qr") && (
            <View style={[styles.locationWrapper, { marginTop: 16 }]}>
              <Text style={styles.label}>QR Code Mode</Text>
              <View style={{ flexDirection: "row", marginBottom: 12 }}>
                {(["permanent", "rotating"] as const).map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      styles.pillBtn,
                      qrMode === mode && styles.pillBtnActive,
                      { flex: 1, marginRight: mode === "permanent" ? 8 : 0 },
                    ]}
                    onPress={() => setQrMode(mode)}
                  >
                    <Text
                      style={[
                        styles.pillBtnText,
                        qrMode === mode && styles.textWhite,
                        { textTransform: "capitalize" }
                      ]}
                    >
                      {mode}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {qrMode === "rotating" && (
                <View>
                  {/* Refresh Interval */}
                  <View style={[styles.gracePeriodRow, { marginTop: 8 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Refresh Interval</Text>
                      <Text style={styles.graceSubLabel}>Seconds before QR code regenerates.</Text>
                    </View>
                    <TextInput
                      style={[styles.kvInput, { width: 80, textAlign: "center" }, isDark && styles.inputDark]}
                      placeholder="30"
                      keyboardType="numeric"
                      value={qrRefreshIntervalSecs}
                      onChangeText={(t) => {
                        const safeVal = t.replace(/[^0-9]/g, "");
                        setQrRefreshIntervalSecs(safeVal ? parseInt(safeVal, 10).toString() : "");
                      }}
                    />
                    <Text style={[styles.unitText, { marginLeft: 8 }]}>sec</Text>
                  </View>

                  {/* Window Duration */}
                  <View style={[styles.gracePeriodRow, { marginTop: 8 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Scan Window</Text>
                      <Text style={styles.graceSubLabel}>Seconds a scanned QR token remains valid.</Text>
                    </View>
                    <TextInput
                      style={[styles.kvInput, { width: 80, textAlign: "center" }, isDark && styles.inputDark]}
                      placeholder="60"
                      keyboardType="numeric"
                      value={qrWindowSecs}
                      onChangeText={(t) => {
                        const safeVal = t.replace(/[^0-9]/g, "");
                        setQrWindowSecs(safeVal ? parseInt(safeVal, 10).toString() : "");
                      }}
                    />
                    <Text style={[styles.unitText, { marginLeft: 8 }]}>sec</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* ── Additional Information ───────────────────────────────────── */}
          <View style={{ marginTop: 24 }}>
            <SectionHeader
              icon="document-text-outline"
              title="Additional Information"
              isDark={isDark}
            />
            {additionalDetails.map((item, idx) => (
              <View key={idx} style={styles.kvRow}>
                <TextInput
                  style={[
                    styles.kvInput,
                    { flex: 1 },
                    isDark && styles.inputDark,
                  ]}
                  placeholder="Label (e.g. Host)"
                  placeholderTextColor="#94a3b8"
                  value={item.key}
                  onChangeText={(v) => updateDetailRow(idx, "key", v)}
                />
                <TextInput
                  style={[
                    styles.kvInput,
                    { flex: 1.5 },
                    isDark && styles.inputDark,
                  ]}
                  placeholder="Info (e.g. John Doe)"
                  placeholderTextColor="#94a3b8"
                  value={item.value}
                  onChangeText={(v) => updateDetailRow(idx, "value", v)}
                />
                <TouchableOpacity
                  onPress={() => removeDetailRow(idx)}
                  style={styles.removeBtn}
                >
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addDetailBtn} onPress={addDetailRow}>
              <Ionicons name="add-circle-outline" size={20} color="#3B82F6" />
              <Text style={styles.addDetailText}>Add Description Item</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footerStandard}>
          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={handleGenerate}
          >
            <Ionicons
              name="add-circle"
              size={22}
              color="#fff"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.primaryActionBtnText}>Create Session</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={dateObj}
          mode="date"
          display="default"
          minimumDate={datePickerMode === "end" && startDate ? new Date(startDate) : undefined}
          onChange={onDateChange}
        />
      )}
      {showTimePicker && (
        <DateTimePicker
          value={dateObj}
          mode="time"
          display="default"
          minimumDate={
             timePickerMode === "end" && startTime 
               ? new Date(parseTimeObj(startTime)!.getTime() + 15 * 60000) 
               : undefined
          }
          onChange={onTimeChange}
        />
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  fullscreenOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10000,
  },
  modalBox: {
    width: "94%",
    maxWidth: 460,
    maxHeight: "88%",
    backgroundColor: "#fff",
    borderRadius: 32,
    overflow: "hidden",
    elevation: 20,
  },
  modalBoxDark: { backgroundColor: "#1e293b" },
  headerStandard: {
    padding: 24,
    paddingBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  headerDark: { borderBottomColor: "#334155" },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: "600",
    marginTop: 2,
  },
  closeBtnStandard: {
    padding: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
  },
  scrollContent: { padding: 24, paddingBottom: 40 },
  sectionHeaderLine: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0F172A",
    marginLeft: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#0F172A",
    opacity: 0.1,
    marginLeft: 15,
  },
  label: {
    fontSize: 11,
    fontWeight: "800",
    color: "#94a3b8",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  input: {
    height: 56,
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    justifyContent: "center",
    marginBottom: 20,
  },
  inputDark: { backgroundColor: "#0f172a", borderColor: "#334155" },
  valText: { fontSize: 15, fontWeight: "700", color: "#1e293b" },
  placeholder: { color: "#cbd5e1" },
  textWhite: { color: "#fff" },

  // Schedule type grid
  scheduleGridRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 8,
  },
  scheduleBtn: {
    width: "48%",
    backgroundColor: "#f8fafc",
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  scheduleBtnActive: { borderColor: "#3B82F6", backgroundColor: "#3B82F6" },
  scheduleBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    marginLeft: 8,
  },

  // Days grid (weekly)
  daysGrid: { flexDirection: "row", justifyContent: "space-between", gap: 4 },
  dayCard: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  dayCardActive: { backgroundColor: "#3B82F6", borderColor: "#3B82F6" },
  dayCardText: { fontSize: 13, fontWeight: "800", color: "#64748b" },

  // Accent/grid helpers
  gridRow: { flexDirection: "row", gap: 12 },
  flex1: { flex: 1 },
  accentBox: {
    backgroundColor: "#f8fafc",
    padding: 18,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },

  // Smart rollover hint
  rolloverHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  rolloverHintText: {
    fontSize: 12,
    color: "#3B82F6",
    fontWeight: "600",
    flex: 1,
  },

  // Grace period
  gracePeriodRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
    gap: 12,
  },
  graceSubLabel: {
    fontSize: 10,
    color: "#94a3b8",
    fontWeight: "500",
    marginTop: 2,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  stepperBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#EFF6FF",
  },
  stepperValue: {
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    minWidth: 60,
    textAlign: "center",
  },

  // Location
  locationWrapper: {
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 24,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  pillBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    marginRight: 8,
    marginBottom: 8,
  },
  pillBtnActive: { backgroundColor: "#3B82F6", borderColor: "#3B82F6" },
  pillBtnText: { fontSize: 12, fontWeight: "800", color: "#64748b" },
  searchBarBox: { flexDirection: "row", alignItems: "center" },
  searchField: {
    flex: 1,
    height: 56,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingLeft: 16,
    paddingRight: 60,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    color: "#1e293b",
    fontSize: 15,
    fontWeight: "700",
  },
  gpsAction: {
    position: "absolute",
    right: 6,
    width: 44,
    height: 44,
    backgroundColor: "#0F172A",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  dropdownResultsOverlay: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    overflow: "hidden",
    elevation: 20,
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
  },
  dropdownItemModern: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  dropdownTitle: { fontSize: 14, fontWeight: "800", color: "#1e293b" },
  dropdownSub: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 2,
    fontWeight: "600",
  },
  radiusBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    height: 56,
    paddingHorizontal: 16,
  },
  radiusInput: { flex: 1, fontSize: 18, fontWeight: "900", color: "#3B82F6" },
  unitText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Methods
  methodList: { gap: 10 },
  methodItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  methodItemActive: { backgroundColor: "#3B82F6", borderColor: "#3B82F6" },
  methodItemText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    marginLeft: 12,
  },

  // Additional details
  kvRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
    alignItems: "center",
  },
  kvInput: {
    height: 48,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    fontSize: 13,
    fontWeight: "600",
    color: "#1e293b",
  },
  removeBtn: { padding: 8, backgroundColor: "#fef2f2", borderRadius: 10 },
  addDetailBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#eff6ff",
    borderRadius: 16,
    borderStyle: "dashed",
    borderWidth: 1.5,
    borderColor: "#3B82F6",
    justifyContent: "center",
    marginBottom: 20,
  },
  addDetailText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#3B82F6",
    marginLeft: 8,
  },

  // Footer
  footerStandard: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    backgroundColor: "#fff",
  },
  primaryActionBtn: {
    height: 64,
    backgroundColor: "#3B82F6",
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  primaryActionBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
});
