// /components/modal/CreateSessionModal.tsx
import { ScheduleType } from "@/types/SessionTypes";
import { computeDurationMinutes, formatTime12hr, getDaysBetweenDates, hasWeekdayInRange } from "@/utils/timeUtils";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useColorScheme
} from "react-native";

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  { label: "Monthly", value: "monthly", icon: "calendar-number-outline" },
  { label: "Term", value: "term", icon: "library-outline" },
  { label: "Custom", value: "custom", icon: "construct-outline" },
];

const WEEK_POSITIONS = ["1st", "2nd", "3rd", "4th", "5th", "last"];

const TERM_OPTIONS = [
  { label: '4 wks â€” Short Intensive',        weeks: 4  },
  { label: '8 wks â€” Short Course / Quarter', weeks: 8  },
  { label: '12 wks â€” Trimester',             weeks: 12 },
  { label: '16 wks â€” Semester',              weeks: 16 },
  { label: '18 wks â€” Extended Semester',     weeks: 18 },
  { label: 'Custom',                         weeks: 0  },
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

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â”€â”€â”€ Sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

/** A compact +/âˆ’ stepper for numeric inputs. */
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
      <Ionicons name="remove" size={18} color="#001F54" />
    </TouchableOpacity>
    <Text style={styles.stepperValue}>
      {value}
      {unit ? ` ${unit}` : ""}
    </Text>
    <TouchableOpacity
      style={styles.stepperBtn}
      onPress={() => onChange(Math.min(max, value + step))}
    >
      <Ionicons name="add" size={18} color="#001F54" />
    </TouchableOpacity>
  </View>
);

// â”€â”€â”€ Validation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const VALID_SCHEDULE_TYPES: ScheduleType[] = [
  "one-time",
  "daily",
  "weekly",
  "monthly",
  "term",
  "custom"
];

const DAY_MAP: Record<string, number> = {
  monday: 1, tuesday: 2, wednesday: 3, thursday: 4,
  friday: 5, saturday: 6, sunday: 0,
};

function getNextOccurrenceDate(fromDate: string, days: string[]): string | null {
  if (!fromDate || !days.length) return null;
  const d = new Date(fromDate + "T00:00:00");
  for (let i = 0; i < 8; i++) {
    const name = Object.keys(DAY_MAP).find(k => DAY_MAP[k] === d.getDay());
    if (name && days.includes(name)) return d.toISOString().split('T')[0];
    d.setDate(d.getDate() + 1);
  }
  return null;
}

function countOccurrences(start: string, end: string, days: string[]): number {
  if (!start || !end || !days.length) return 0;
  let n = 0;
  const d = new Date(start + "T00:00:00"), e = new Date(end + "T00:00:00");
  while (d <= e) {
    const name = Object.keys(DAY_MAP).find(k => DAY_MAP[k] === d.getDay());
    if (name && days.includes(name)) n++;
    d.setDate(d.getDate() + 1);
  }
  return n;
}

function getNextSpecificDate(day: number, fromDate: Date = new Date()): Date {
  const d = new Date(fromDate.getFullYear(), fromDate.getMonth(), day);
  if (d.getDate() !== day) d.setDate(0); // handle overflow (e.g., Feb 30 -> Feb 28)
  if (d < fromDate) {
    const nextD = new Date(fromDate.getFullYear(), fromDate.getMonth() + 1, day);
    if (nextD.getDate() !== day) nextD.setDate(0);
    return nextD;
  }
  return d;
}

function isCorrectWeekPosition(dateStr: string, weekNumStr: string, weekdayStr: string): boolean {
  if (!dateStr || !weekNumStr || !weekdayStr) return false;
  const d = new Date(dateStr + "T00:00:00");
  const dayName = Object.keys(DAY_MAP).find(k => DAY_MAP[k] === d.getDay());
  if (dayName !== weekdayStr) return false;

  const month = d.getMonth();
  const year = d.getFullYear();
  const date = d.getDate();

  if (weekNumStr === "last") {
    const nextWeek = new Date(year, month, date + 7);
    return nextWeek.getMonth() !== month;
  }
  
  const weekIdx = Math.floor((date - 1) / 7);
  const weekMap: Record<string, number> = { "1st": 0, "2nd": 1, "3rd": 2, "4th": 3, "5th": 4 };
  return weekIdx === weekMap[weekNumStr];
}

function getNextWeekPosition(weekNumStr: string, weekdayStr: string, fromDate: Date = new Date()): Date {
  let d = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
  const targetDay = DAY_MAP[weekdayStr];
  let foundCount = 0;
  
  while (true) {
    if (d.getDay() === targetDay) {
      foundCount++;
      const isTarget = weekNumStr === "last" 
        ? (new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7).getMonth() !== d.getMonth())
        : (foundCount - 1 === { "1st": 0, "2nd": 1, "3rd": 2, "4th": 3, "5th": 4 }[weekNumStr]);
          
      if (isTarget) {
        if (d >= fromDate) return new Date(d);
        d = new Date(fromDate.getFullYear(), fromDate.getMonth() + 1, 1);
        foundCount = 0;
        continue;
      }
    }
    d.setDate(d.getDate() + 1);
    if (d.getDate() === 1) foundCount = 0;
  }
}

function getNextMonthlyOccurrences(mode: 'specific_date'|'week_position', day: number, weekNum: string, weekday: string, start: string, limit: number): Date[] {
  const dates: Date[] = [];
  let current = start ? new Date(start + "T00:00:00") : new Date();
  
  for (let i = 0; i < limit; i++) {
    if (mode === 'specific_date') {
      current = getNextSpecificDate(day, current);
    } else {
      current = getNextWeekPosition(weekNum, weekday, current);
    }
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

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

// â”€â”€â”€ Props â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface UpdateSessionModalProps {
  session: import('@/types/SessionTypes').BackendSession | null;
  visible: boolean;
  onClose: () => void;
  onUpdate: (updatedData: Partial<import('@/types/SessionTypes').BackendSession>) => Promise<void>;
}

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const UpdateSessionModal: React.FC<UpdateSessionModalProps> = ({
  session,
  visible,
  onClose,
  onUpdate,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // â”€â”€ Form state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [sessionName, setSessionName] = useState("");
  const [scheduleType, setScheduleType] = useState<ScheduleType>("one-time");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>([]);
  const [monthlyMode, setMonthlyMode] = useState<"specific_date" | "week_position">("specific_date");
  const [dayOfMonth, setDayOfMonth] = useState("15");
  const [weekNumber, setWeekNumber] = useState("1st");
  const [monthlyWeekday, setMonthlyWeekday] = useState("monday");
  const [termDuration, setTermDuration] = useState(16);
  const [termDurationCustom, setTermDurationCustom] = useState("");
  const [includeWeekends, setIncludeWeekends] = useState(false);
  const [customDates, setCustomDates] = useState<string[]>([]);
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState(15);
  const [absentLimitMinutes, setAbsentLimitMinutes] = useState("");
  const [graceWarning, setGraceWarning] = useState<string | null>(null);
  const [scheduleInfo, setScheduleInfo] = useState<string | null>(null);
  const [scheduleWarn, setScheduleWarn] = useState<string | null>(null);
  const [nextValidDate, setNextValidDate] = useState<string | null>(null);

  const [scheduleErrors, setScheduleErrors] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [smartWarning, setSmartWarning] = useState<string | null>(null);
  const [smartSuggestion, setSmartSuggestion] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const submitBtnAnim = useRef(new Animated.Value(0)).current;
  const [validationToast, setValidationToast] = useState<string | null>(null);
  const validationToastAnim = useRef(new Animated.Value(0)).current;

  const [sessionType, setSessionType] = useState<"On-site" | "Remote" | "Hybrid">("On-site");
  const [selectedMethods, setSelectedMethods] = useState<string[]>(["Manual Click"]);
  const [qrMode, setQrMode] = useState<"permanent" | "rotating">("permanent");
  const [qrRefreshIntervalSecs, setQrRefreshIntervalSecs] = useState("");
  const [qrWindowSecs, setQrWindowSecs] = useState("");

  const [location, setLocation] = useState("");
  const [radius, setRadius] = useState("50");
  const [includeGeofencing, setIncludeGeofencing] = useState(false);
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
  const [isLocating, setIsLocating] = useState(false);
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
    setMonthlyMode("specific_date");
    setDayOfMonth("15");
    setWeekNumber("1st");
    setMonthlyWeekday("monday");
    setTermDuration(16);
    setTermDurationCustom("");
    setIncludeWeekends(false);
    setCustomDates([]);
    setScheduleErrors({});
    setSmartWarning(null);
    setSmartSuggestion(null);
    setScheduleInfo(null);
    setScheduleWarn(null);
    setNextValidDate(null);
    setGracePeriodMinutes(15);
    setAbsentLimitMinutes("");
    setSessionType("On-site");
    setSelectedMethods(["Manual Click"]);
    setQrMode("permanent");
    setQrRefreshIntervalSecs("");
    setQrWindowSecs("");
    setLocation("");
    setRadius("50");
    setIncludeGeofencing(false);
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

  // â”€â”€ sanitizeNumber: silently clamp numeric inputs while typing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const sanitizeNumber = (val: string, min: number, max: number): string => {
    const stripped = val.replace(/^0+(?=\d)/, "").replace(/[^0-9]/g, "");
    if (!stripped) return "";
    const num = parseInt(stripped, 10);
    if (num > max) return String(max);
    if (num < min) return String(min);
    return stripped;
  };

  const sanitizeQrValue = (val: string): string => {
    const numeric = val.replace(/[^0-9]/g, '');
    const stripped = numeric.replace(/^0+(?=\d)/, '');
    const num = parseInt(stripped || '0', 10);
    if (num > 3600 || num <= 0) return '';
    return stripped;
  };

  const [qrIntervalError, setQrIntervalError] = useState<string | null>(null);

  useEffect(() => {
    if (qrRefreshIntervalSecs && qrWindowSecs) {
      const refresh = parseInt(qrRefreshIntervalSecs, 10);
      const window = parseInt(qrWindowSecs, 10);
      if (refresh >= window) {
        setQrIntervalError(`âŒ Refresh interval must be less than the scan window (${window}s).`);
      } else {
        setQrIntervalError(null);
      }
    } else {
      setQrIntervalError(null);
    }
  }, [qrRefreshIntervalSecs, qrWindowSecs]);

  // â”€â”€ Smart Frequency Assessment â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    setSmartWarning(null);
    setSmartSuggestion(null);
    setScheduleInfo(null);
    setScheduleWarn(null);
    setNextValidDate(null);

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
    } else if (scheduleType === "monthly") {
      let previewDates: Date[] = [];
      let isAligned = false;

      if (monthlyMode === "specific_date") {
        const dom = parseInt(dayOfMonth, 10);
        if (!isNaN(dom) && dom >= 1 && dom <= 31) {
          if (dom > 28) {
            setScheduleWarn(`Some months may use the last available day instead (e.g. Feb 28/29).`);
          }
          if (startDate) {
             const d = new Date(startDate + "T00:00:00");
             if (d.getDate() !== dom && !(dom > 28 && d.getDate() === new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())) {
                 const nextD = getNextSpecificDate(dom, d);
                 setNextValidDate(nextD.toISOString().split('T')[0]);
             } else {
                 isAligned = true;
             }
          }
          previewDates = getNextMonthlyOccurrences("specific_date", dom, "", "", startDate || new Date().toISOString(), 3);
        }
      } else {
        if (weekNumber === "5th") {
          setScheduleWarn(`Some months may not have a 5th ${monthlyWeekday}. Those months will be skipped automatically.`);
        }
        if (startDate) {
           if (!isCorrectWeekPosition(startDate, weekNumber, monthlyWeekday)) {
              const nextD = getNextWeekPosition(weekNumber, monthlyWeekday, new Date(startDate + "T00:00:00"));
              setNextValidDate(nextD.toISOString().split('T')[0]);
           } else {
              isAligned = true;
           }
        }
        previewDates = getNextMonthlyOccurrences("week_position", 1, weekNumber, monthlyWeekday, startDate || new Date().toISOString(), 3);
      }

      if (previewDates.length === 3) {
        setScheduleInfo(`Monthly Â· Next 3 dates: ${previewDates.map(d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })).join(', ')}`);
      }
    } else if (scheduleType === "term") {
      const weeks = termDuration === 0 ? parseInt(termDurationCustom || '0', 10) : termDuration;
      
      let warn = null;
      if (daysOfWeek.length === 7) {
        warn = 'For 7-day sessions use Daily instead.';
      } else if (weeks === 4 && daysOfWeek.length > 0 && daysOfWeek.length < 3) {
        warn = 'A 4-week term with 2 days/week produces only 8 occurrences â€” below the minimum of 10. Add at least 1 more day per week or increase the term duration.';
      } else if (weeks > 0 && weeks < 8) {
        warn = 'Terms under 8 weeks are considered short intensives. Consider using Weekly for shorter programs.';
      }
      if (warn) setScheduleWarn(warn);

      if (startDate && daysOfWeek.length > 0) {
        const dayName = Object.keys(DAY_MAP).find(k => DAY_MAP[k] === new Date(startDate + "T00:00:00").getDay());
        if (dayName && !daysOfWeek.includes(dayName)) {
          const nextD = getNextOccurrenceDate(startDate, daysOfWeek);
          if (nextD) {
             const nextStr = new Date(nextD + "T00:00:00").toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
             setScheduleInfo(`Start date must fall on a selected day. Next valid date: ${nextStr}`);
             setNextValidDate(nextD);
          }
        } else if (weeks >= 4 && weeks <= 26) {
          const computedEnd = new Date(startDate + "T00:00:00");
          computedEnd.setDate(computedEnd.getDate() + weeks * 7);
          const endStr = computedEnd.toISOString().split('T')[0];
          setEndDate(endStr);
          
          const occ = countOccurrences(startDate, endStr, daysOfWeek);
          const label = `${weeks}-week term Â· Ends ${computedEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} Â· ~${occ} occurrences`;
          if (occ < 10) {
            setScheduleWarn(`${label} â€” minimum 10 required`);
          } else {
            setScheduleInfo(label);
          }
        }
      }
    } else if (scheduleType === "custom") {
      if (customDates.length === 1) {
        setSmartWarning("Only 1 date selected. Consider using One Time instead.");
        setSmartSuggestion("one-time");
      }
    }

  }, [scheduleType, startDate, endDate, daysOfWeek, customDates, termDuration, termDurationCustom, monthlyMode, dayOfMonth, weekNumber, monthlyWeekday]);

  // ── Auto-compute start_date for Monthly recurrence ────────────────────────
  useEffect(() => {
    if (scheduleType !== "monthly") return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let autoDate: Date | null = null;

    if (monthlyMode === "specific_date") {
      const dom = parseInt(dayOfMonth, 10);
      if (!isNaN(dom) && dom >= 1 && dom <= 31) {
        autoDate = getNextSpecificDate(dom, today);
      }
    } else {
      // week_position mode — find next valid occurrence from today
      autoDate = getNextWeekPosition(weekNumber, monthlyWeekday, today);
    }

    if (autoDate) {
      const isoStr = autoDate.toISOString().split("T")[0];
      setStartDate(isoStr);
      // Clear any stale start-date errors since we just set a valid date
      setFieldErrors((prev) => ({ ...prev, startDate: "" }));
      setScheduleErrors((prev) => ({ ...prev, startDate: "" }));
    }
  }, [scheduleType, monthlyMode, dayOfMonth, weekNumber, monthlyWeekday]);

  // ── Smart Grace Period Validation ────────────────────────────────────────
  useEffect(() => {
    setGraceWarning(null);

    if (startTime && endTime) {
      const duration = computeDurationMinutes(startTime, endTime);
      if (duration > 0) {
        if (gracePeriodMinutes >= duration) {
          setGraceWarning(`Grace period cannot be equal to or longer than the session duration (${duration}m). Please reduce it.`);
          return;
        }
        if (absentLimitMinutes) {
          const absentLimit = parseInt(absentLimitMinutes, 10);
          if (!isNaN(absentLimit) && absentLimit > duration / 2) {
            setGraceWarning(`Absent limit must be ≤ 50% of the session duration (≤ ${Math.floor(duration / 2)}m).`);
            return;
          }
        }
      }
    }

    if (absentLimitMinutes) {
      const absentLimit = parseInt(absentLimitMinutes, 10);
      if (!isNaN(absentLimit) && gracePeriodMinutes > absentLimit) {
        setGraceWarning("Grace period must not be greater than the absent limit.");
        return;
      }
    }
  }, [gracePeriodMinutes, absentLimitMinutes, startTime, endTime]);

  // â”€â”€ Soft real-time warnings (amber only â€” no red borders) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // These guide the user but never block typing or show red.
  // Grace-period vs duration is already handled by graceWarning above.
  // Days < 3 for weekly is a soft amber warning shown inline in JSX.

  // â”€â”€ Validation toast animation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (validationToast) {
      Animated.sequence([
        Animated.timing(validationToastAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.delay(3000),
        Animated.timing(validationToastAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start(() => setValidationToast(null));
    }
  }, [validationToast]);

  // â”€â”€ Location search (Photon API) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Filter methods when switching to Remote â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    setAbsentLimitMinutes(sanitizeNumber(text, 0, 480));
  };

  const getAutomaticLocation = async () => {
    try {
      setIsLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "GPS access is required to automatically fetch your location.");
        setIsLocating(false);
        return;
      }

      // Use Balanced accuracy to prevent infinite loading on some Android devices
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
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
      } else {
        Alert.alert("Location Not Found", "Could not determine your address from GPS coordinates.");
      }
    } catch (e: any) {
      console.error("GPS error:", e);
      Alert.alert("GPS Error", e.message || "Failed to fetch your current location. Please ensure your device location is turned on.");
    } finally {
      setIsLocating(false);
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
          setSmartWarning("End date was reset â€” please reselect.");
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
                setSmartWarning("End time was reset â€” please reselect.");
            }
        }
      }
      else {
          setEndTime(timeStr);
      }
    }
  };

  // â”€â”€ Generate / submit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleUpdate = () => {
    // Build submit-time errors (only shown at this point, not while typing)
    const submitErrors: Record<string, string> = {};

    // Session name
    if (!sessionName.trim() || sessionName.trim().length < 3) {
      submitErrors.sessionName = "Session name must be at least 3 characters";
    }

    // Times
    if (!startTime) submitErrors.startTime = "Start time is required";
    if (!endTime)   submitErrors.endTime   = "End time is required";
    if (startTime && endTime && startTime >= endTime) {
      submitErrors.endTime = "End time must be after start time";
    }

    // â”€â”€ Dates & schedule-type specific rules â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const todayStr = new Date().toLocaleDateString('en-CA'); // local YYYY-MM-DD
    
    if (scheduleType === "one-time") {
      if (!startDate) submitErrors.startDate = "Date is required";
      else if (startDate < todayStr) submitErrors.startDate = "Date cannot be in the past.";

    } else if (scheduleType === "custom") {
      if (customDates.length === 0) submitErrors.customDates = "At least one date is required";

    } else {
      // All recurring types need start + end date
      if (!startDate) submitErrors.startDate = "Start date is required";
      else if (startDate < todayStr) submitErrors.startDate = "Start date cannot be in the past.";
      
      if (!endDate) submitErrors.endDate = "End date is required";

      // Only run deeper checks when both dates exist
      if (startDate && endDate && !submitErrors.startDate) {
        if (endDate <= startDate) {
          submitErrors.endDate = "End date must be after start date";
        }

        // â”€â”€ Daily â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        if (scheduleType === "daily") {
          const diff = Math.ceil((new Date(endDate + "T00:00:00").getTime() - new Date(startDate + "T00:00:00").getTime()) / 86400000);
          if (diff < 2) submitErrors.endDate = "Daily schedule needs at least 3 days total. Extend the end date.";
        }

        // â”€â”€ Weekly â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        if (scheduleType === "weekly") {
          if (daysOfWeek.length === 0) {
            submitErrors.daysOfWeek = "Select at least one day of the week.";
          } else if (daysOfWeek.length === 7) {
            submitErrors.daysOfWeek = "All 7 days selected â€” use Daily instead.";
          } else {
            const diff = Math.ceil((new Date(endDate + "T00:00:00").getTime() - new Date(startDate + "T00:00:00").getTime()) / 86400000);
            if (diff < 6) submitErrors.endDate = "Date range must span at least 1 week.";
            else if (!hasWeekdayInRange(startDate, endDate, daysOfWeek)) {
              submitErrors.endDate = "Selected days don't fall within this date range.";
            }
          }
        }

        // â”€â”€ Monthly â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        if (scheduleType === "monthly") {
          const diff = Math.ceil((new Date(endDate + "T00:00:00").getTime() - new Date(startDate + "T00:00:00").getTime()) / 86400000);
          if (diff < 28) {
            submitErrors.endDate = "Monthly schedule needs at least 28 days (2 occurrences).";
          }
          // startDate is auto-computed and always valid — no alignment check needed
          if (monthlyMode === "specific_date") {
            const dom = parseInt(dayOfMonth, 10);
            if (isNaN(dom) || dom < 1 || dom > 31) {
              submitErrors.dayOfMonth = "Day of month must be between 1 and 31.";
            }
          }
        }

        // â”€â”€ Term â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        if (scheduleType === "term") {
          // Days selection
          if (daysOfWeek.length < 2) {
            submitErrors.daysOfWeek = "Select at least 2 days per week for a term.";
          } else if (daysOfWeek.length === 7) {
            submitErrors.daysOfWeek = "All 7 days selected â€” use Daily instead.";
          }

          // Duration
          const weeks = termDuration === 0 ? parseInt(termDurationCustom || "0", 10) : termDuration;
          if (isNaN(weeks) || weeks < 4) {
            submitErrors.termDuration = "Term duration must be at least 4 weeks.";
          } else if (weeks > 26) {
            submitErrors.termDuration = "Term duration cannot exceed 26 weeks.";
          }

          // Start date must land on one of the selected days
          if (daysOfWeek.length >= 2) {
            const dayName = Object.keys(DAY_MAP).find(k => DAY_MAP[k] === new Date(startDate + "T00:00:00").getDay());
            if (dayName && !daysOfWeek.includes(dayName)) {
              submitErrors.startDate = "Start date must fall on one of the selected class days.";
            }
          }

          // Occurrence minimum (â‰¥ 10)
          if (!submitErrors.termDuration && !submitErrors.daysOfWeek && !submitErrors.startDate) {
            const occ = countOccurrences(startDate, endDate, daysOfWeek);
            if (occ < 10) {
              submitErrors.endDate = `Term must produce at least 10 class sessions. Currently: ${occ}. Add more days or increase duration.`;
            }
          }
        }
      }

      // Weekly still needs day selection even if dates are missing
      if (scheduleType === "weekly" && !submitErrors.daysOfWeek) {
        if (daysOfWeek.length === 0) submitErrors.daysOfWeek = "Select at least one day of the week.";
        else if (daysOfWeek.length === 7) submitErrors.daysOfWeek = "All 7 days selected â€” use Daily instead.";
      }
      // Term still needs day selection even if dates are missing
      if (scheduleType === "term" && !submitErrors.daysOfWeek) {
        if (daysOfWeek.length < 2) submitErrors.daysOfWeek = "Select at least 2 days per week for a term.";
        else if (daysOfWeek.length === 7) submitErrors.daysOfWeek = "All 7 days selected â€” use Daily instead.";
      }
    }

    // Grace period vs session duration (block if >= duration)
    if (startTime && endTime) {
      if (endTime <= startTime) {
        submitErrors.endTime = "End time must be after start time.";
      } else {
        const duration = computeDurationMinutes(startTime, endTime);
        if (duration > 0) {
          if (gracePeriodMinutes >= duration) {
            submitErrors.gracePeriod = "Grace period cannot exceed session duration.";
          }
          const limit = parseInt(absentLimitMinutes, 10);
          if (!isNaN(limit)) {
            if (limit > duration / 2) {
              submitErrors.absentLimit = `Absent limit must be ≤ 50% of session duration (≤ ${Math.floor(duration / 2)}m).`;
            }
            if (gracePeriodMinutes > limit) {
              submitErrors.gracePeriod = "Grace period must not be greater than the absent limit.";
            }
          }
        }
      }
    }

    // QR rotating fields
    if (selectedMethods.includes("qr") && qrMode === "rotating") {
      const n1 = parseInt(qrRefreshIntervalSecs);
      if (!qrRefreshIntervalSecs || isNaN(n1) || n1 <= 0) {
        submitErrors.qrRefresh = !qrRefreshIntervalSecs ? "This field is required" : "Value must be greater than 0";
      } else if (n1 > 3600) {
        submitErrors.qrRefresh = "Value is unreasonably large. Max is 3600 seconds.";
      }
      const n2 = parseInt(qrWindowSecs);
      if (!qrWindowSecs || isNaN(n2) || n2 <= 0) {
        submitErrors.qrWindow = !qrWindowSecs ? "This field is required" : "Value must be greater than 0";
      } else if (n2 > 3600) {
        submitErrors.qrWindow = "Value is unreasonably large. Max is 3600 seconds.";
      }
      
      if (!submitErrors.qrRefresh && !submitErrors.qrWindow) {
        if (n1 >= n2) {
          submitErrors.qrRefresh = `Refresh interval must be less than the scan window (${n2}s).`;
        }
      }
    }

    setScheduleErrors({});
    setFieldErrors(submitErrors);

    if (Object.keys(submitErrors).length > 0) {
      // Shake the button
      Animated.sequence([
        Animated.timing(submitBtnAnim, { toValue: 8,  duration: 60, useNativeDriver: true }),
        Animated.timing(submitBtnAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
        Animated.timing(submitBtnAnim, { toValue: 8,  duration: 60, useNativeDriver: true }),
        Animated.timing(submitBtnAnim, { toValue: 0,  duration: 60, useNativeDriver: true }),
      ]).start();
      setValidationToast("Please review the highlighted fields before continuing.");
      return;
    }

    const code = Math.random().toString(36).substr(2, 6).toUpperCase();
    let schedulePayload: any = { type: scheduleType, start_time: startTime, end_time: endTime };
    switch(scheduleType) {
      case "one-time":    schedulePayload.start_date = startDate; schedulePayload.end_date = startDate; break;
      case "daily":      schedulePayload.start_date = startDate; schedulePayload.end_date = endDate; schedulePayload.include_weekends = includeWeekends; break;
      case "weekly":     schedulePayload.start_date = startDate; schedulePayload.end_date = endDate; schedulePayload.days_of_week = daysOfWeek; break;
      case "monthly":
        schedulePayload.start_date = startDate;
        schedulePayload.end_date = endDate;
        schedulePayload.month_mode = monthlyMode;
        if (monthlyMode === "specific_date") {
          schedulePayload.day_of_month = parseInt(dayOfMonth, 10);
        } else {
          schedulePayload.week_number = weekNumber;
          schedulePayload.weekday = monthlyWeekday;
        }
        break;
      case "term":
        schedulePayload.start_date = startDate;
        schedulePayload.end_date = endDate;
        schedulePayload.days = daysOfWeek;
        schedulePayload.term_duration = termDuration === 0 ? parseInt(termDurationCustom, 10) : termDuration;
        break;
      case "custom":     schedulePayload.dates = customDates; break;
    }

    const payload = {
      session_code: code,
      session_name: sessionName,
      session_setup: sessionType.toLowerCase().replace("-", "_"),
      session_status: "upcoming",
      methods: selectedMethods,
      location: {
        ...((sessionType === "Remote" || sessionType === "Hybrid")
          ? { platform: remotePlatform === "Others" ? customPlatform : remotePlatform || undefined, link: remoteLink || undefined }
          : {}),
        ...((sessionType === "On-site" || sessionType === "Hybrid")
          ? {
              address: location || locationQuery,
              latitude: exactCoords?.lat ? parseFloat(exactCoords.lat) : undefined,
              longitude: exactCoords?.lon ? parseFloat(exactCoords.lon) : undefined,
              radius: parseInt(radius) || undefined,
            }
          : {}),
        include_geofencing: sessionType === "Remote" ? false : includeGeofencing,
      },
      schedule: schedulePayload,
      attendance_config: {
        grace_period_mins: gracePeriodMinutes,
        ...(absentLimitMinutes ? { absent_limit_mins: parseInt(absentLimitMinutes) } : {}),
      },
      ...(selectedMethods.includes("qr")
        ? { qr_config: { qr_mode: qrMode, ...(qrMode === "rotating" ? { refresh_interval_secs: parseInt(qrRefreshIntervalSecs), window_secs: parseInt(qrWindowSecs) } : {}) } }
        : {}),
    };

    const doUpdate = () => {
      onUpdate(payload);
      resetForm();
      onClose();
    };

    let msg = "";
    switch(scheduleType) {
      case "term":
        const termOcc = countOccurrences(startDate, endDate, daysOfWeek);
        msg = `You are creating a term session running for ${termDuration === 0 ? termDurationCustom : termDuration} weeks on ${daysOfWeek.map(d=>d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}. This will generate approximately ${termOcc} classes.`;
        break;
      case "monthly":
        if (monthlyMode === "specific_date") {
            msg = `You are creating a monthly session that will run on the ${dayOfMonth} of every month.`;
        } else {
            msg = `You are creating a monthly session that will run on the ${weekNumber} ${monthlyWeekday.charAt(0).toUpperCase() + monthlyWeekday.slice(1)} of every month.`;
        }
        break;
      case "weekly":
        msg = `You are creating a weekly session running on ${daysOfWeek.map(d=>d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}.`;
        break;
      case "daily":
        msg = `You are creating a daily session ${includeWeekends ? "including" : "excluding"} weekends.`;
        break;
      case "one-time":
        msg = `You are creating a one-time session on ${new Date(startDate + "T00:00:00").toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.`;
        break;
      case "custom":
        msg = `You are creating a custom session with ${customDates.length} selected dates.`;
        break;
    }

    if (scheduleType === "daily" || scheduleType === "one-time") { doUpdate(); return; }

    Alert.alert(
      "Confirm Schedule",
      `${msg}\n\nDo you want to proceed?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Update Session", style: "default", onPress: doUpdate }
      ]
    );
  };

  if (!visible) return null;

  // â”€â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
          {/* â”€â”€ Session Info â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <SectionHeader
            icon="information-circle-outline"
            title="Session Info"
            isDark={isDark}
          />

          <Text style={styles.label}>Title</Text>
          <TextInput
            style={[
              styles.input,
              isDark && styles.inputDark,
              !!fieldErrors.sessionName && styles.inputError,
            ]}
            placeholder="Min. 3 characters"
            placeholderTextColor="#94a3b8"
            value={sessionName}
            onChangeText={setSessionName}
          />
          {!!fieldErrors.sessionName && (
            <Text style={styles.fieldErrorText}>{fieldErrors.sessionName}</Text>
          )}

          <Text style={styles.label}>Frequency</Text>
          <View style={styles.scheduleGridRow}>
            {SCHEDULE_TYPES.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[
                  styles.scheduleBtn,
                  scheduleType === t.value && styles.scheduleBtnActive,
                ]}
                onPress={() => {
                  setScheduleType(t.value);
                  setScheduleErrors({});
                  setFieldErrors({});
                }}
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

          {/* â”€â”€ Timeline â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <SectionHeader
            icon="calendar-outline"
            title="Timeline"
            isDark={isDark}
          />

          {/* Monthly Picker */}
          {scheduleType === "monthly" && (
            <View style={[styles.accentBox, { marginBottom: 16 }]}>
              <Text style={styles.label}>Monthly Recurrence</Text>
              
              {/* Mode Toggle */}
              <View style={styles.monthlyModeToggle}>
                <TouchableOpacity 
                  style={[styles.monthlyModeBtn, monthlyMode === 'specific_date' && styles.monthlyModeBtnActive]}
                  onPress={() => setMonthlyMode('specific_date')}
                >
                  <Text style={[styles.monthlyModeBtnText, monthlyMode === 'specific_date' && styles.monthlyModeBtnTextActive]}>Specific Date</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.monthlyModeBtn, monthlyMode === 'week_position' && styles.monthlyModeBtnActive]}
                  onPress={() => setMonthlyMode('week_position')}
                >
                  <Text style={[styles.monthlyModeBtnText, monthlyMode === 'week_position' && styles.monthlyModeBtnTextActive]}>Week Position</Text>
                </TouchableOpacity>
              </View>

              {monthlyMode === "specific_date" ? (
                <View>
                  <Text style={styles.label}>Day of Month (1â€“31)</Text>
                  <TextInput
                    style={[styles.input, isDark && styles.inputDark]}
                    placeholder="15"
                    keyboardType="numeric"
                    value={dayOfMonth}
                    onChangeText={setDayOfMonth}
                  />
                  {!!fieldErrors.dayOfMonth && <Text style={styles.fieldErrorText}>{fieldErrors.dayOfMonth}</Text>}
                  <Text style={styles.monthlyHelperText}>
                    <Ionicons name="information-circle" size={14} color="#94A3B8" /> For months with fewer days (e.g. February), the last day of that month will be used.
                  </Text>
                </View>
              ) : (
                <View style={styles.monthlyWeekPosContainer}>
                  <View>
                    <Text style={styles.label}>Week</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthlyScrollContent}>
                      {WEEK_POSITIONS.map(w => (
                        <TouchableOpacity
                          key={w}
                          onPress={() => setWeekNumber(w)}
                          style={[styles.monthlyPill, weekNumber === w && styles.monthlyPillActive]}
                        >
                          <Text style={[styles.monthlyPillText, weekNumber === w && styles.monthlyPillTextActive]}>
                            {w === 'last' ? 'Last' : w}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                  <View>
                    <Text style={styles.label}>Day</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthlyScrollContent}>
                      {WEEKDAYS.map((d, i) => (
                        <TouchableOpacity
                          key={d}
                          onPress={() => setMonthlyWeekday(d)}
                          style={[styles.monthlyPill, monthlyWeekday === d && styles.monthlyPillActive]}
                        >
                          <Text style={[styles.monthlyPillText, monthlyWeekday === d && styles.monthlyPillTextActive]}>
                            {WEEKDAYS_SHORT[i]}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Weekly/Term days picker */}
          {(scheduleType === "weekly" || scheduleType === "term") && (
              <View style={[styles.accentBox, { marginBottom: 16 }, !!fieldErrors.daysOfWeek && styles.accentBoxError]}>
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
              {scheduleErrors.daysOfWeek && <Text style={styles.fieldErrorText}>{scheduleErrors.daysOfWeek}</Text>}
              {fieldErrors.daysOfWeek && <Text style={styles.fieldErrorText}>{fieldErrors.daysOfWeek}</Text>}
            </View>
          )}

          {/* Term Duration Picker */}
          {scheduleType === "term" && (
            <View style={[styles.accentBox, { marginBottom: 16 }, !!fieldErrors.termDuration && styles.accentBoxError]}>
              <Text style={styles.label}>Term Duration</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {TERM_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.weeks}
                    style={{
                      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1,
                      borderColor: termDuration === opt.weeks ? '#4F46E5' : '#E2E8F0',
                      backgroundColor: termDuration === opt.weeks ? '#EEF2FF' : '#F8FAFC'
                    }}
                    onPress={() => setTermDuration(opt.weeks)}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: termDuration === opt.weeks ? '#4F46E5' : '#64748B' }}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {termDuration === 0 && (
                <TextInput
                  style={[styles.input, isDark && styles.inputDark, { marginTop: 12 }]}
                  placeholder="Enter number of weeks (4â€“26)"
                  keyboardType="numeric"
                  value={termDurationCustom}
                  onChangeText={setTermDurationCustom}
                />
              )}
              {!!fieldErrors.termDuration && <Text style={styles.fieldErrorText}>{fieldErrors.termDuration}</Text>}
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
                {scheduleType === "monthly" ? (
                  <View style={[styles.input, isDark && styles.inputDark, { opacity: 0.8 }]}>
                    <Text style={[styles.valText, !startDate && styles.placeholder]}>
                      {startDate || "Calculating..."}
                    </Text>
                  </View>
                ) : (
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
                )}
                {!!fieldErrors.startDate && <Text style={styles.fieldErrorText}>{fieldErrors.startDate}</Text>}
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
                  {!!fieldErrors.endDate && <Text style={styles.fieldErrorText}>{fieldErrors.endDate}</Text>}
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
                return <Text style={{ color: "#EF4444", fontSize: 13, fontWeight: "600", marginTop: 8, paddingHorizontal: 4 }}>âš ï¸ End time must be after start time</Text>;
            }
            const hrs = Math.floor(diffMins / 60);
            const mins = diffMins % 60;
            const hrStr = hrs > 0 ? `${hrs} hour${hrs > 1 ? 's' : ''}` : '';
            const minStr = mins > 0 ? `${mins} minute${mins > 1 ? 's' : ''}` : '';
            return <Text style={{ color: "#10B981", fontSize: 13, fontWeight: "600", marginTop: 8, paddingHorizontal: 4 }}>â± Duration: {`${hrStr} ${minStr}`.trim()}</Text>;
          })()}

          {smartWarning && (
            <View style={{ backgroundColor: "#FEF2F2", padding: 12, borderRadius: 12, flexDirection: "row", gap: 8, marginBottom: 16, marginTop: 4, borderWidth: 1, borderColor: "#FECACA", alignItems: "flex-start" }}>
              <Ionicons name="warning" size={20} color="#DC2626" style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, color: "#991B1B", lineHeight: 18 }}>{smartWarning}</Text>
                {smartSuggestion && (
                  <TouchableOpacity onPress={() => { setScheduleType(smartSuggestion as ScheduleType); setSmartWarning(null); setSmartSuggestion(null); }} style={{ marginTop: 8, backgroundColor: "#FEE2E2", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignSelf: "flex-start" }}>
                    <Text style={{ fontSize: 12, color: "#DC2626", fontWeight: "700" }}>Switch to {smartSuggestion === "one-time" ? "One Time" : "Suggested"}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {scheduleWarn && (
            <View style={{ backgroundColor: "#FFFBEB", padding: 12, borderRadius: 12, flexDirection: "row", gap: 8, marginBottom: 16, marginTop: 4, borderWidth: 1, borderColor: "#FDE68A", alignItems: "center" }}>
              <Ionicons name="warning" size={20} color="#D97706" />
              <Text style={{ fontSize: 13, color: "#B45309", flex: 1 }}>{scheduleWarn}</Text>
            </View>
          )}

          {nextValidDate && (
            <View style={{ backgroundColor: "#EFF6FF", padding: 12, borderRadius: 12, flexDirection: "row", gap: 8, marginBottom: 16, marginTop: 4, borderWidth: 1, borderColor: "#BFDBFE", alignItems: "center" }}>
              <Ionicons name="information-circle" size={20} color="#2563EB" />
              <Text style={{ fontSize: 13, color: "#1E3A8A", flex: 1 }}>Next valid start date: {new Date(nextValidDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
            </View>
          )}

          {scheduleInfo && (
            <View style={{ backgroundColor: "#F8FAFC", padding: 12, borderRadius: 12, flexDirection: "row", gap: 8, marginBottom: 16, marginTop: 4, borderWidth: 1, borderColor: "#E2E8F0", alignItems: "center" }}>
              <Ionicons name="information-circle" size={20} color="#9CA3AF" />
              <Text style={{ fontSize: 13, color: "#6B7280", flex: 1 }}>{scheduleInfo}</Text>
            </View>
          )}


          {/* Include Weekends Switch */}
          {scheduleType === "daily" && (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, marginBottom: 16, backgroundColor: isDark ? "#1E293B" : "#F8FAFC", padding: 12, borderRadius: 12 }}>
              <View>
                <Text style={{ fontSize: 14, fontWeight: "600", color: isDark ? "#F8FAFC" : "#0F172A" }}>Include Weekends</Text>
                <Text style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>Allow sessions to run on Sat/Sun</Text>
              </View>
              <Switch
                value={includeWeekends}
                onValueChange={setIncludeWeekends}
                trackColor={{ false: "#CBD5E1", true: "#001F54" }}
                thumbColor={Platform.OS === "android" ? "#fff" : undefined}
              />
            </View>
          )}

          {/* â”€â”€ Attendance Settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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

          {/* Grace period submit-time error (>= session duration) */}
          {!!fieldErrors.gracePeriod && (
            <View style={styles.gracePeriodWarningBox}>
              <Ionicons name="warning-outline" size={16} color="#D97706" style={{ marginRight: 8 }} />
              <Text style={styles.gracePeriodWarningText}>
                âš ï¸  {fieldErrors.gracePeriod}
              </Text>
            </View>
          )}

          {/* Absent limit submit-time error */}
          {!!fieldErrors.absentLimit && (
            <View style={styles.gracePeriodWarningBox}>
              <Ionicons name="warning-outline" size={16} color="#D97706" style={{ marginRight: 8 }} />
              <Text style={styles.gracePeriodWarningText}>
                ⚠️  {fieldErrors.absentLimit}
              </Text>
            </View>
          )}

          {/* Soft amber warning: grace vs absent limit */}
          {graceWarning && !fieldErrors.gracePeriod && !fieldErrors.absentLimit && (
            <View style={styles.gracePeriodWarningBox}>
              <Ionicons name="warning-outline" size={16} color="#D97706" style={{ marginRight: 8 }} />
              <Text style={styles.gracePeriodWarningText}>{graceWarning}</Text>
            </View>
          )}

          {/* â”€â”€ Setup & Verification â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
                    disabled={isLocating}
                  >
                    {isLocating ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="location" size={20} color="#fff" />
                    )}
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
                          color="#001F54"
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
                  style={[
                    styles.radiusInput,
                    isDark && styles.inputDark,
                    !!fieldErrors.radius && styles.inputError,
                  ]}
                  placeholder="50"
                  keyboardType="numeric"
                  value={radius}
                  onChangeText={(t) => setRadius(sanitizeNumber(t, 1, 10000))}
                />
                <Text style={styles.unitText}>meters radius</Text>
              </View>
              {!!fieldErrors.radius && <Text style={styles.fieldErrorText}>{fieldErrors.radius}</Text>}

              {!!exactCoords && (
                <View style={[styles.geofenceToggleRow, isDark && styles.geofenceToggleRowDark]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.geofenceToggleLabel, isDark && styles.textWhite]}>
                      Verify attendee location?
                    </Text>
                    <Text style={styles.geofenceToggleHelper}>
                      Attendees must be within the set radius to check in.
                    </Text>
                  </View>
                  <Switch
                    value={includeGeofencing}
                    onValueChange={setIncludeGeofencing}
                    trackColor={{ false: "#CBD5E1", true: "#001F54" }}
                    thumbColor={Platform.OS === "android" ? "#fff" : undefined}
                  />
                </View>
              )}
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
                      style={[
                        styles.kvInput,
                        { width: 80, textAlign: "center" },
                        isDark && styles.inputDark,
                        (!!fieldErrors.qrRefresh || !!qrIntervalError) && styles.inputError,
                      ]}
                      placeholder="30"
                      keyboardType="numeric"
                      value={qrRefreshIntervalSecs}
                      onChangeText={(t) => setQrRefreshIntervalSecs(sanitizeQrValue(t))}
                    />
                    <Text style={[styles.unitText, { marginLeft: 8 }]}>sec</Text>
                  </View>
                  {!!qrIntervalError ? (
                    <Text style={[styles.fieldErrorText, { color: "#EF4444" }]}>{qrIntervalError}</Text>
                  ) : !!fieldErrors.qrRefresh ? (
                    <Text style={styles.fieldErrorText}>{fieldErrors.qrRefresh}</Text>
                  ) : null}

                  {/* Window Duration */}
                  <View style={[styles.gracePeriodRow, { marginTop: 8 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Scan Window</Text>
                      <Text style={styles.graceSubLabel}>Seconds a scanned QR token remains valid.</Text>
                    </View>
                    <TextInput
                      style={[
                        styles.kvInput,
                        { width: 80, textAlign: "center" },
                        isDark && styles.inputDark,
                        !!fieldErrors.qrWindow && styles.inputError,
                      ]}
                      placeholder="60"
                      keyboardType="numeric"
                      value={qrWindowSecs}
                      onChangeText={(t) => setQrWindowSecs(sanitizeQrValue(t))}
                    />
                    <Text style={[styles.unitText, { marginLeft: 8 }]}>sec</Text>
                  </View>
                  {!!fieldErrors.qrWindow && <Text style={styles.fieldErrorText}>{fieldErrors.qrWindow}</Text>}
                </View>
              )}
            </View>
          )}

          {/* â”€â”€ Additional Information â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
              <Ionicons name="add-circle-outline" size={20} color="#001F54" />
              <Text style={styles.addDetailText}>Add Description Item</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footerStandard}>
          {/* Validation toast inside modal footer */}
          {!!validationToast && (
            <Animated.View style={[styles.validationToast, { opacity: validationToastAnim }]}>
              <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
              <Text style={styles.validationToastText}>{validationToast}</Text>
            </Animated.View>
          )}
          <Animated.View style={{ transform: [{ translateX: submitBtnAnim }] }}>
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
          </Animated.View>
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

// â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  scheduleBtnActive: { borderColor: "#001F54", backgroundColor: "#001F54" },
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
  dayCardActive: { backgroundColor: "#001F54", borderColor: "#001F54" },
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
    color: "#001F54",
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
  pillBtnActive: { backgroundColor: "#001F54", borderColor: "#001F54" },
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
  radiusInput: { flex: 1, fontSize: 18, fontWeight: "900", color: "#001F54" },
  unitText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  geofenceToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    backgroundColor: "#F8FAFC",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  geofenceToggleRowDark: {
    backgroundColor: "#1E293B",
    borderColor: "#334155",
  },
  geofenceToggleLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 4,
  },
  geofenceToggleHelper: {
    fontSize: 12,
    color: "#9CA3AF",
    lineHeight: 16,
    paddingRight: 12,
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
  methodItemActive: { backgroundColor: "#001F54", borderColor: "#001F54" },
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
    borderColor: "#001F54",
    justifyContent: "center",
    marginBottom: 20,
  },
  addDetailText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#001F54",
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
    backgroundColor: "#001F54",
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#001F54",
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

  // Validation
  inputError: {
    borderColor: "#EF4444",
    borderWidth: 1.5,
    borderRadius: 12,
  },
  inputValid: {
    borderColor: "#22C55E",
    borderWidth: 1.5,
    borderRadius: 12,
  },
  fieldErrorText: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 4,
    marginBottom: 8,
  },
  accentBoxError: {
    borderColor: "#EF4444",
    borderWidth: 1.5,
  },
  gracePeriodWarningBox: {
    flexDirection: "row",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 16,
    alignItems: "flex-start",
  },
  gracePeriodWarningText: {
    flex: 1,
    fontSize: 12,
    color: "#D97706",
    fontWeight: "600",
    lineHeight: 18,
  },
  validationToast: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderLeftWidth: 4,
    borderLeftColor: "#DC2626",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 8,
  },
  validationToastText: {
    fontSize: 13,
    color: "#DC2626",
    fontWeight: "600",
    flex: 1,
  },
  
  // Monthly UI
  monthlyModeToggle: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  monthlyModeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  monthlyModeBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  monthlyModeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  monthlyModeBtnTextActive: {
    color: '#0F172A',
  },
  monthlyHelperText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 6,
  },
  monthlyWeekPosContainer: {
    gap: 16,
  },
  monthlyScrollContent: {
    gap: 8,
  },
  monthlyPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  monthlyPillActive: {
    borderColor: '#4F46E5',
    backgroundColor: '#4F46E5',
  },
  monthlyPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  monthlyPillTextActive: {
    color: '#FFFFFF',
  },
});


