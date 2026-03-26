import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Location from "expo-location";
import React, { useEffect, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useColorScheme,
} from "react-native";

interface CreateSessionModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (sessionCode: string) => void;
}

const ATTENDANCE_METHODS = [
  { id: "Manual Click", label: "Manual Check-In", remote: true, onsite: true },
  { id: "QR Based", label: "QR Based", remote: true, onsite: true },
  {
    id: "Location Check",
    label: "Location Based",
    remote: false,
    onsite: true,
  },
  {
    id: "Facial Recognition",
    label: "Facial Recognition",
    remote: true,
    onsite: true,
  },
];

export const CreateSessionModal: React.FC<CreateSessionModalProps> = ({
  visible,
  onClose,
  onCreate,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [sessionName, setSessionName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [sessionType, setSessionType] = useState<
    "On-site" | "Remote" | "Hybrid"
  >("On-site");
  const [sessionDuration, setSessionDuration] = useState<
    "One-Time" | "Long-Term"
  >("One-Time");
  const [location, setLocation] = useState("");
  const [radius, setRadius] = useState("");
  const [punctualityRequired, setPunctualityRequired] = useState(true);
  const [requiredHours, setRequiredHours] = useState("");
  const [selectedMethods, setSelectedMethods] = useState<string[]>([
    "Manual Click",
  ]);

  // Auto-correct invalid selections when switching types
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

  const toggleMethod = (methodId: string) => {
    const config = ATTENDANCE_METHODS.find((m) => m.id === methodId);
    if (sessionType === "Remote" && !config?.remote) return;

    setSelectedMethods((prev) =>
      prev.includes(methodId)
        ? prev.filter((m) => m !== methodId)
        : [...prev, methodId],
    );
  };

  const [dateObj, setDateObj] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<
    "single" | "start" | "end"
  >("single");
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerMode, setTimePickerMode] = useState<"start" | "end">(
    "start",
  );

  // Geo-location Search states
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState<any[]>([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [exactCoords, setExactCoords] = useState<{
    lat: string;
    lon: string;
  } | null>(null);

  useEffect(() => {
    const loadCache = async () => {
      try {
        const cached = await AsyncStorage.getItem("cached_facility_location");
        if (cached) {
          const parsed = JSON.parse(cached);
          setLocationQuery(parsed.address);
          setLocation(parsed.address);
          setExactCoords({ lat: parsed.lat, lon: parsed.lon });
        }
      } catch (e) {}
    };
    if (visible) {
      loadCache();
    }
  }, [visible]);

  const saveToCache = async (address: string, lat: string, lon: string) => {
    try {
      await AsyncStorage.setItem(
        "cached_facility_location",
        JSON.stringify({ address, lat, lon }),
      );
    } catch (e) {}
  };

  const getAutomaticLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      let location = await Location.getCurrentPositionAsync({});
      let reverse = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (reverse.length > 0) {
        const address =
          `${reverse[0].streetNumber || ""} ${reverse[0].street || ""} ${reverse[0].city || ""}, ${reverse[0].region || ""}`.trim();
        setLocationQuery(address);
        setLocation(address);
        setExactCoords({
          lat: location.coords.latitude.toString(),
          lon: location.coords.longitude.toString(),
        });
        saveToCache(
          address,
          location.coords.latitude.toString(),
          location.coords.longitude.toString(),
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (locationQuery.length < 3) {
      setLocationResults([]);
      setShowLocationDropdown(false);
      return;
    }
    if (locationQuery === location) return;

    const delayDebounceFn = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationQuery)}&limit=5`,
          {
            headers: {
              "User-Agent": "MobileAttendanceSystem/1.0",
              "Accept-Language": "en-US,en;q=0.9",
            },
          },
        );

        const data = await response.json();
        setLocationResults(data);
        setShowLocationDropdown(true);
      } catch (error) {
        console.error("Location search failed", error);
      }
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [locationQuery]);

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setDateObj(selectedDate);
      const dateStr = selectedDate.toLocaleDateString();
      if (datePickerMode === "start") setStartDate(dateStr);
      else if (datePickerMode === "end") setEndDate(dateStr);
      else setStartDate(dateStr);
    }
  };

  const onTimeChange = (event: any, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === "ios");
    if (selectedDate) {
      setDateObj(selectedDate);
      const timeStr = selectedDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      if (timePickerMode === "start") setStartTime(timeStr);
      else setEndTime(timeStr);
    }
  };

  const calculateDuration = () => {
    if (!startTime || !endTime) return null;
    try {
      const parseTime = (str: string) => {
        const [time, modifier] = str.split(" ");
        let [hours, minutes] = time.split(":").map(Number);
        if (modifier === "PM" && hours < 12) hours += 12;
        if (modifier === "AM" && hours === 12) hours = 0;
        return hours * 60 + minutes;
      };
      const start = parseTime(startTime);
      const end = parseTime(endTime);
      let diff = end - start;
      if (diff < 0) diff += 1440;
      const hrs = Math.floor(diff / 60);
      const mins = diff % 60;
      return `${hrs}h ${mins}m`;
    } catch (e) {
      return null;
    }
  };

  const handleGenerate = () => {
    const code = Math.random().toString(36).substr(2, 6).toUpperCase();
    onCreate(code);
    setSessionName("");
    setStartDate("");
    setEndDate("");
    setStartTime("");
    setEndTime("");
    setRadius("");
    setPunctualityRequired(true);
    setRequiredHours("");
    setLocationQuery("");
    setExactCoords(null);
    setSelectedMethods(["Manual Click"]);
    setSessionType("On-site");
    setSessionDuration("One-Time");
    onClose();
  };

  if (!visible) return null;

  return (
    <View style={styles.fullscreenOverlay}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={StyleSheet.absoluteFill} />
      </TouchableWithoutFeedback>

      <View style={[styles.modalBox, isDark && styles.modalBoxDark]}>
        {/* Header */}
        <View style={[styles.header, isDark && styles.headerDark]}>
          <Text style={[styles.headerTitle, isDark && styles.textWhite]}>
            Create Session
          </Text>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeBtn, isDark && styles.closeBtnDark]}
          >
            <Ionicons
              name="close"
              size={20}
              color={isDark ? "#94a3b8" : "#64748b"}
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={[styles.label, isDark && styles.labelDark]}>
            Session Name
          </Text>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            placeholder="e.g. Advanced Mathematics"
            placeholderTextColor="#9ca3af"
            value={sessionName}
            onChangeText={setSessionName}
          />

          <Text style={[styles.label, isDark && styles.labelDark]}>
            Attendance Requirement
          </Text>
          <View
            style={[styles.segmentedRow, isDark && styles.segmentedRowDark]}
          >
            <TouchableOpacity
              style={[
                styles.segmentBtn,
                punctualityRequired &&
                  (isDark
                    ? styles.segmentBtnActiveDark
                    : styles.segmentBtnActive),
              ]}
              onPress={() => setPunctualityRequired(true)}
            >
              <Text
                style={[
                  styles.segmentText,
                  punctualityRequired
                    ? styles.segmentTextActive
                    : styles.textGray,
                ]}
              >
                Strict Time
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.segmentBtn,
                !punctualityRequired &&
                  (isDark
                    ? styles.segmentBtnActiveDark
                    : styles.segmentBtnActive),
              ]}
              onPress={() => setPunctualityRequired(false)}
            >
              <Text
                style={[
                  styles.segmentText,
                  !punctualityRequired
                    ? styles.segmentTextActive
                    : styles.textGray,
                ]}
              >
                Flexible Task
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, isDark && styles.labelDark]}>
            Session Duration
          </Text>
          <View
            style={[styles.segmentedRow, isDark && styles.segmentedRowDark]}
          >
            {(["One-Time", "Long-Term"] as const).map((duration) => (
              <TouchableOpacity
                key={duration}
                style={[
                  styles.segmentBtn,
                  sessionDuration === duration &&
                    (isDark
                      ? styles.segmentBtnActiveDark
                      : styles.segmentBtnActive),
                ]}
                onPress={() => setSessionDuration(duration)}
              >
                <Text
                  style={[
                    styles.segmentText,
                    sessionDuration === duration
                      ? styles.segmentTextActive
                      : styles.textGray,
                  ]}
                >
                  {duration}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {punctualityRequired ? (
            <>
              {sessionDuration === "One-Time" && (
                <View style={styles.mb4}>
                  <Text style={[styles.label, isDark && styles.labelDark]}>
                    Date
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.input,
                      isDark && styles.inputDark,
                      styles.pickerTrigger,
                    ]}
                    onPress={() => {
                      setDatePickerMode("single");
                      setShowDatePicker(true);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerText,
                        startDate
                          ? isDark
                            ? styles.textWhite
                            : styles.textBlack
                          : styles.textPlaceholder,
                      ]}
                    >
                      {startDate || "mm/dd/yyyy"}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.gridRow}>
                    <View style={styles.flex1}>
                      <Text style={[styles.label, isDark && styles.labelDark]}>
                        Start Time
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.input,
                          isDark && styles.inputDark,
                          styles.pickerTrigger,
                        ]}
                        onPress={() => {
                          setTimePickerMode("start");
                          setShowTimePicker(true);
                        }}
                      >
                        <Text
                          style={[
                            styles.pickerText,
                            startTime
                              ? isDark
                                ? styles.textWhite
                                : styles.textBlack
                              : styles.textPlaceholder,
                          ]}
                        >
                          {startTime || "Start"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.flex1}>
                      <Text style={[styles.label, isDark && styles.labelDark]}>
                        End Time
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.input,
                          isDark && styles.inputDark,
                          styles.pickerTrigger,
                        ]}
                        onPress={() => {
                          setTimePickerMode("end");
                          setShowTimePicker(true);
                        }}
                      >
                        <Text
                          style={[
                            styles.pickerText,
                            endTime
                              ? isDark
                                ? styles.textWhite
                                : styles.textBlack
                              : styles.textPlaceholder,
                          ]}
                        >
                          {endTime || "End"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}

              {sessionDuration === "Long-Term" && (
                <View style={styles.mb4}>
                  <View style={styles.gridRow}>
                    <View style={styles.flex1}>
                      <Text style={[styles.label, isDark && styles.labelDark]}>
                        Start Date
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.input,
                          isDark && styles.inputDark,
                          styles.pickerTrigger,
                        ]}
                        onPress={() => {
                          setDatePickerMode("start");
                          setShowDatePicker(true);
                        }}
                      >
                        <Text
                          style={[
                            styles.pickerText,
                            startDate
                              ? isDark
                                ? styles.textWhite
                                : styles.textBlack
                              : styles.textPlaceholder,
                          ]}
                        >
                          {startDate || "mm/dd/yyyy"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.flex1}>
                      <Text style={[styles.label, isDark && styles.labelDark]}>
                        End Date
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.input,
                          isDark && styles.inputDark,
                          styles.pickerTrigger,
                        ]}
                        onPress={() => {
                          setDatePickerMode("end");
                          setShowDatePicker(true);
                        }}
                      >
                        <Text
                          style={[
                            styles.pickerText,
                            endDate
                              ? isDark
                                ? styles.textWhite
                                : styles.textBlack
                              : styles.textPlaceholder,
                          ]}
                        >
                          {endDate || "mm/dd/yyyy"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.gridRow}>
                    <View style={styles.flex1}>
                      <Text style={[styles.label, isDark && styles.labelDark]}>
                        Start Time
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.input,
                          isDark && styles.inputDark,
                          styles.pickerTrigger,
                        ]}
                        onPress={() => {
                          setTimePickerMode("start");
                          setShowTimePicker(true);
                        }}
                      >
                        <Text
                          style={[
                            styles.pickerText,
                            startTime
                              ? isDark
                                ? styles.textWhite
                                : styles.textBlack
                              : styles.textPlaceholder,
                          ]}
                        >
                          {startTime || "Start"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.flex1}>
                      <Text style={[styles.label, isDark && styles.labelDark]}>
                        End Time
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.input,
                          isDark && styles.inputDark,
                          styles.pickerTrigger,
                        ]}
                        onPress={() => {
                          setTimePickerMode("end");
                          setShowTimePicker(true);
                        }}
                      >
                        <Text
                          style={[
                            styles.pickerText,
                            endTime
                              ? isDark
                                ? styles.textWhite
                                : styles.textBlack
                              : styles.textPlaceholder,
                          ]}
                        >
                          {endTime || "End"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </>
          ) : (
            <View style={styles.mb4}>
              {sessionDuration === "One-Time" ? (
                <View style={[styles.gridRow, styles.mb4]}>
                  <View style={styles.flex1}>
                    <Text style={[styles.label, isDark && styles.labelDark]}>
                      Execution Date
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.input,
                        isDark && styles.inputDark,
                        styles.pickerTrigger,
                      ]}
                      onPress={() => {
                        setDatePickerMode("single");
                        setShowDatePicker(true);
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerText,
                          startDate
                            ? isDark
                              ? styles.textWhite
                              : styles.textBlack
                            : styles.textPlaceholder,
                        ]}
                      >
                        {startDate || "mm/dd/yyyy"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.flex1}>
                    <Text style={[styles.label, isDark && styles.labelDark]}>
                      Quota (Hours)
                    </Text>
                    <TextInput
                      style={[styles.input, isDark && styles.inputDark]}
                      placeholder="e.g. 8"
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                      value={requiredHours}
                      onChangeText={setRequiredHours}
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.mb4}>
                  <View style={[styles.gridRow, styles.mb4]}>
                    <View style={styles.flex1}>
                      <Text style={[styles.label, isDark && styles.labelDark]}>
                        Start Date
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.input,
                          isDark && styles.inputDark,
                          styles.pickerTrigger,
                        ]}
                        onPress={() => {
                          setDatePickerMode("start");
                          setShowDatePicker(true);
                        }}
                      >
                        <Text
                          style={[
                            styles.pickerText,
                            startDate
                              ? isDark
                                ? styles.textWhite
                                : styles.textBlack
                              : styles.textPlaceholder,
                          ]}
                        >
                          {startDate || "mm/dd/yyyy"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.flex1}>
                      <Text style={[styles.label, isDark && styles.labelDark]}>
                        End Date
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.input,
                          isDark && styles.inputDark,
                          styles.pickerTrigger,
                        ]}
                        onPress={() => {
                          setDatePickerMode("end");
                          setShowDatePicker(true);
                        }}
                      >
                        <Text
                          style={[
                            styles.pickerText,
                            endDate
                              ? isDark
                                ? styles.textWhite
                                : styles.textBlack
                              : styles.textPlaceholder,
                          ]}
                        >
                          {endDate || "mm/dd/yyyy"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View>
                    <Text style={[styles.label, isDark && styles.labelDark]}>
                      Quota (Hours per Session)
                    </Text>
                    <TextInput
                      style={[styles.input, isDark && styles.inputDark]}
                      placeholder="e.g. 8"
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                      value={requiredHours}
                      onChangeText={setRequiredHours}
                    />
                  </View>
                </View>
              )}
              <View style={[styles.infoBox, isDark && styles.infoBoxDark]}>
                <Ionicons
                  name="information-circle-outline"
                  size={16}
                  color="#64748b"
                />
                <Text style={styles.infoText}>
                  User must render the quota within 24h from activation.
                </Text>
              </View>
            </View>
          )}

          {calculateDuration() && punctualityRequired && (
            <View
              style={[styles.durationBadge, isDark && styles.durationBadgeDark]}
            >
              <Ionicons name="time-outline" size={16} color="#2563eb" />
              <Text style={styles.durationText}>
                Total Rendered: {calculateDuration()}
              </Text>
            </View>
          )}

          <Text style={[styles.label, isDark && styles.labelDark]}>
            Session Type
          </Text>
          <View
            style={[styles.segmentedRow, isDark && styles.segmentedRowDark]}
          >
            {(["On-site", "Remote", "Hybrid"] as const).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.segmentBtn,
                  sessionType === type &&
                    (isDark
                      ? styles.segmentBtnActiveDark
                      : styles.segmentBtnActive),
                ]}
                onPress={() => setSessionType(type)}
              >
                <Text
                  style={[
                    styles.segmentText,
                    sessionType === type
                      ? styles.segmentTextActive
                      : styles.textGray,
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {sessionType !== "Remote" && (
            <View style={styles.gridRow}>
              <View style={styles.flex2}>
                <Text style={[styles.label, isDark && styles.labelDark]}>
                  Location {sessionType === "Hybrid" && "(On-site Area)"}
                </Text>
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  placeholder="Search globally..."
                  placeholderTextColor="#9ca3af"
                  value={locationQuery}
                  onChangeText={(text) => {
                    setLocationQuery(text);
                    if (text === "") {
                      setLocation("");
                      setExactCoords(null);
                    }
                  }}
                />
                {showLocationDropdown && locationResults.length > 0 && (
                  <View
                    style={[styles.dropdown, isDark && styles.dropdownDark]}
                  >
                    {locationResults.map((item, idx) => (
                      <TouchableOpacity
                        key={item.place_id || idx}
                        style={[
                          styles.dropdownItem,
                          idx !== locationResults.length - 1 &&
                            styles.borderBottom,
                        ]}
                        onPress={() => {
                          setLocationQuery(item.display_name);
                          setLocation(item.display_name);
                          setExactCoords({ lat: item.lat, lon: item.lon });
                          saveToCache(item.display_name, item.lat, item.lon);
                          setShowLocationDropdown(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.dropdownText,
                            isDark && styles.textBlueLt,
                          ]}
                          numberOfLines={2}
                        >
                          {item.display_name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                <TouchableOpacity
                  onPress={getAutomaticLocation}
                  style={styles.gpsRow}
                >
                  <Ionicons name="navigate-circle" size={16} color="#2563eb" />
                  <Text style={styles.gpsText}>Use my current location</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.flex1}>
                <Text style={[styles.label, isDark && styles.labelDark]}>
                  Radius (m)
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    isDark && styles.inputDark,
                    (radius === "0" ||
                      (radius !== "" &&
                        (parseInt(radius) < 5 || parseInt(radius) > 9999))) &&
                      styles.inputError,
                  ]}
                  placeholder="20"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  value={radius}
                  onChangeText={(text) => {
                    const clean = text
                      .replace(/[^0-9]/g, "")
                      .replace(/^0+/, (match, offset) =>
                        offset === 0 && text.length > 1 ? "" : match,
                      );
                    setRadius(clean);
                  }}
                />
                {radius === "0" && (
                  <Text style={styles.errorTextSm}>Invalid</Text>
                )}
                {radius !== "" && parseInt(radius) > 1000 && (
                  <Text style={styles.errorTextSm}>Exceeds 1km max</Text>
                )}
              </View>
            </View>
          )}

          <Text style={[styles.label, isDark && styles.labelDark, styles.mt4]}>
            Attendance Methods {sessionType === "Remote" && "(Remote Only)"}
          </Text>
          <View style={styles.methodsPillRow}>
            {ATTENDANCE_METHODS.map((method) => {
              const active = selectedMethods.includes(method.id);
              const isAvailable =
                sessionType === "Hybrid" ||
                (sessionType === "On-site" && method.onsite) ||
                (sessionType === "Remote" && method.remote);

              if (!isAvailable) return null;

              return (
                <TouchableOpacity
                  key={method.id}
                  onPress={() => toggleMethod(method.id)}
                  style={[
                    styles.pill,
                    active ? styles.pillActive : styles.pillInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      active ? styles.textWhite : styles.textGray,
                    ]}
                  >
                    {method.label}
                    {sessionType === "Hybrid" && (
                      <Text style={styles.pillTag}>
                        {method.remote && method.onsite
                          ? " (Both)"
                          : method.onsite
                            ? " (On-site)"
                            : " (Remote)"}
                      </Text>
                    )}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <View style={[styles.footer, isDark && styles.footerDark]}>
          <TouchableOpacity
            style={styles.generateBtn}
            onPress={handleGenerate}
            activeOpacity={0.8}
          >
            <Text style={styles.generateBtnText}>Generate Session</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={dateObj}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      )}
      {showTimePicker && (
        <DateTimePicker
          value={dateObj}
          mode="time"
          display="default"
          onChange={onTimeChange}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  fullscreenOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 1000,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "90%",
    maxWidth: 400,
    maxHeight: "85%",
    backgroundColor: "white",
    borderRadius: 24,
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
  },
  modalBoxDark: {
    backgroundColor: "#1e293b",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  headerDark: {
    borderBottomColor: "#334155",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0f172a",
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
  },
  closeBtnDark: {
    backgroundColor: "#334155",
  },
  scrollContent: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 6,
  },
  labelDark: {
    color: "#94a3b8",
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: "#f8fafc",
    color: "#0f172a",
    marginBottom: 16,
  },
  inputDark: {
    borderColor: "#334155",
    backgroundColor: "#0f172a",
    color: "white",
  },
  inputError: {
    borderColor: "#ef4444",
    backgroundColor: "#fef2f2",
  },
  errorTextSm: {
    color: "#ef4444",
    fontSize: 9,
    marginTop: -12,
    marginBottom: 12,
    fontWeight: "600",
  },
  segmentedRow: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  segmentedRowDark: {
    backgroundColor: "#334155",
    borderColor: "#475569",
  },
  segmentBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: "white",
    elevation: 2,
  },
  segmentBtnActiveDark: {
    backgroundColor: "#1e293b",
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "600",
  },
  segmentTextActive: {
    color: "#2563eb",
  },
  gridRow: {
    flexDirection: "row",
    gap: 12,
  },
  flex1: { flex: 1 },
  flex2: { flex: 2 },
  mb4: { marginBottom: 16 },
  mt4: { marginTop: 16 },
  pickerTrigger: {
    justifyContent: "center",
  },
  pickerText: {
    fontSize: 15,
  },
  textWhite: { color: "white" },
  textBlack: { color: "#0f172a" },
  textGray: { color: "#64748b" },
  textPlaceholder: { color: "#9ca3af" },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  infoBoxDark: {
    backgroundColor: "rgba(51, 65, 85, 0.4)",
    borderColor: "#334155",
  },
  infoText: {
    marginLeft: 8,
    fontSize: 10,
    color: "#64748b",
    fontStyle: "italic",
  },
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dbeafe",
    marginBottom: 16,
  },
  durationBadgeDark: {
    backgroundColor: "rgba(37, 99, 235, 0.1)",
    borderColor: "#1e40af",
  },
  durationText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "bold",
    color: "#1d4ed8",
  },
  dropdown: {
    marginTop: 8,
    backgroundColor: "white",
    borderRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  dropdownDark: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
  },
  dropdownItem: {
    padding: 14,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  dropdownText: {
    fontSize: 12,
    color: "#1e40af",
  },
  textBlueLt: {
    color: "#bfdbfe",
  },
  gpsRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 8,
  },
  gpsText: {
    marginLeft: 4,
    fontSize: 12,
    color: "#2563eb",
    fontWeight: "600",
  },
  methodsPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  pillInactive: {
    backgroundColor: "#f1f5f9",
    borderColor: "#e2e8f0",
  },
  pillText: {
    fontSize: 13,
    fontWeight: "600",
  },
  pillTag: {
    fontSize: 9,
    opacity: 0.7,
    fontWeight: "normal",
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  footerDark: {
    borderTopColor: "#334155",
  },
  generateBtn: {
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  generateBtnText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});
