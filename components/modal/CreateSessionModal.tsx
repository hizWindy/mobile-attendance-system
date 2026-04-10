import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Location from "expo-location";
import React, { useEffect, useState, useCallback } from "react";
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
  Alert,
} from "react-native";

interface CreateSessionModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (sessionCode: string, payload?: any) => void;
}

const ATTENDANCE_METHODS = [
  { id: "Manual Click", label: "Manual Check-In", icon: "hand-left-outline", remote: true, onsite: true },
  { id: "QR Based", label: "QR Scanning", icon: "qr-code-outline", remote: true, onsite: true },
  { id: "Location Check", label: "Geofencing", icon: "map-outline", remote: false, onsite: true },
  { id: "Facial Recognition", label: "Biometrics", icon: "scan-outline", remote: true, onsite: true },
];

type ScheduleType = "one-time" | "daily" | "weekly" | "every_n_days";
const SCHEDULE_TYPES: { label: string; value: ScheduleType; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
  { label: "One-Time", value: "one-time", icon: "flash-outline" },
  { label: "Daily", value: "daily", icon: "repeat-outline" },
  { label: "Weekly", value: "weekly", icon: "calendar-outline" },
  { label: "Interval", value: "every_n_days", icon: "timer-outline" },
];

const format12h = (time24: string) => {
  if (!time24) return "";
  const [hours, minutes] = time24.split(":");
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
};

const SectionHeader = ({ icon, title, isDark }: { icon: any; title: string; isDark: boolean }) => (
  <View style={styles.sectionHeaderLine}>
    <Ionicons name={icon} size={18} color="#0F172A" />
    <Text style={[styles.sectionTitle, isDark && styles.textWhite]}>{title}</Text>
    <View style={styles.line} />
  </View>
);

const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const WEEKDAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const CreateSessionModal: React.FC<CreateSessionModalProps> = ({
  visible,
  onClose,
  onCreate,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [sessionName, setSessionName] = useState("");
  const [scheduleType, setScheduleType] = useState<ScheduleType>("one-time");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>([]);
  const [intervalDays, setIntervalDays] = useState("2");

  const [sessionType, setSessionType] = useState<"On-site" | "Remote" | "Hybrid">("On-site");
  const [selectedMethods, setSelectedMethods] = useState<string[]>(["Manual Click"]);

  const [location, setLocation] = useState("");
  const [radius, setRadius] = useState("");
  const [additionalDetails, setAdditionalDetails] = useState<{ key: string; value: string }[]>([]);

  const [dateObj, setDateObj] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<"single" | "start" | "end">("single");
  
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerMode, setTimePickerMode] = useState<"start" | "end">("start");

  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [exactCoords, setExactCoords] = useState<{ lat: string; lon: string } | null>(null);

  const [remotePlatform, setRemotePlatform] = useState("");
  const [customPlatform, setCustomPlatform] = useState("");
  const [remoteLink, setRemoteLink] = useState("");
  const [remotePasscode, setRemotePasscode] = useState("");

  useEffect(() => {
    if (locationQuery.length < 3) {
      setLocationResults([]);
      setShowDropdown(false);
      return;
    }
    if (locationQuery === location) return;

    const delayDebounceFn = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(locationQuery)}&limit=5`
        );
        const data = await response.json();
        if (data.features) {
          const results = data.features.map((f: any) => ({
            displayName: [
              f.properties.name,
              f.properties.street,
              f.properties.city,
              f.properties.country
            ].filter(Boolean).join(", "),
            lat: f.geometry.coordinates[1].toString(),
            lon: f.geometry.coordinates[0].toString(),
          }));
          setLocationResults(results);
          setShowDropdown(true);
        }
      } catch (error) {
        console.error("Photon API search failed", error);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [locationQuery]);

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

  const toggleDay = (day: string) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const addDetailRow = () => {
    setAdditionalDetails([...additionalDetails, { key: "", value: "" }]);
  };

  const removeDetailRow = (index: number) => {
    const newDetails = [...additionalDetails];
    newDetails.splice(index, 1);
    setAdditionalDetails(newDetails);
  };

  const updateDetailRow = (index: number, fld: 'key' | 'value', val: string) => {
    const newDetails = [...additionalDetails];
    newDetails[index][fld] = val;
    setAdditionalDetails(newDetails);
  };

  const getAutomaticLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      let loc = await Location.getCurrentPositionAsync({});
      let reverse = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (reverse.length > 0) {
        const address = `${reverse[0].streetNumber || ""} ${reverse[0].street || ""} ${reverse[0].city || ""}`.trim();
        setLocationQuery(address);
        setLocation(address);
        setExactCoords({
          lat: loc.coords.latitude.toString(),
          lon: loc.coords.longitude.toString(),
        });
        setShowDropdown(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setDateObj(selectedDate);
      const dateStr = selectedDate.toISOString().split("T")[0];
      if (datePickerMode === "start" || datePickerMode === "single") setStartDate(dateStr);
      else if (datePickerMode === "end") setEndDate(dateStr);
    }
  };

  const onTimeChange = (event: any, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === "ios");
    if (selectedDate) {
      setDateObj(selectedDate);
      const timeStr = selectedDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
      if (timePickerMode === "start") setStartTime(timeStr);
      else setEndTime(timeStr);
    }
  };

  const handleGenerate = () => {
    if (!sessionName.trim()) return Alert.alert("Required", "Session name is missing.");
    if (!startDate || !startTime || !endTime) return Alert.alert("Required", "Please complete the timeline.");

    const code = Math.random().toString(36).substr(2, 6).toUpperCase();
    
    const otherDetailsFormatted = additionalDetails.reduce((acc, curr) => {
       if (curr.key.trim() && curr.value.trim()) acc[curr.key.trim()] = curr.value.trim();
       return acc;
    }, {} as any);

    const payload = {
      session_code: code,
      session_name: sessionName,
      session_setup: sessionType.toLowerCase(),
      session_status: "upcoming",
      other_details: Object.keys(otherDetailsFormatted).length > 0 ? otherDetailsFormatted : undefined,
      methods: selectedMethods,
      location: {
        ...((sessionType === "Remote" || sessionType === "Hybrid") ? {
          platform: remotePlatform === "Others" ? customPlatform : remotePlatform || undefined,
          link: remoteLink || undefined,
          passcode: remotePasscode || undefined
        } : {}),
        ...((sessionType === "On-site" || sessionType === "Hybrid") ? {
          address: location || locationQuery,
          latitude: exactCoords?.lat,
          longitude: exactCoords?.lon,
          radius: parseInt(radius) || undefined
        } : {})
      },
      schedule: {
        type: scheduleType,
        start_time: startTime,
        end_time: endTime,
        start_date: startDate,
        end_date: scheduleType === "one-time" ? startDate : endDate,
        ...(scheduleType === "weekly" ? { days_of_week: daysOfWeek } : {}),
        ...(scheduleType === "every_n_days" ? { interval: parseInt(intervalDays) || 1 } : {})
      }
    };

    onCreate(code, payload);
    onClose();
  };

  if (!visible) return null;

  return (
    <View style={styles.fullscreenOverlay}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={StyleSheet.absoluteFill} />
      </TouchableWithoutFeedback>

      <View style={[styles.modalBox, isDark && styles.modalBoxDark]}>
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
          <SectionHeader icon="information-circle-outline" title="Session Info" isDark={isDark} />
          
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
                style={[styles.scheduleBtn, scheduleType === t.value && styles.scheduleBtnActive]}
                onPress={() => setScheduleType(t.value)}
              >
                <Ionicons name={t.icon} size={18} color={scheduleType === t.value ? "#fff" : "#0F172A"} />
                <Text style={[styles.scheduleBtnText, scheduleType === t.value && styles.textWhite]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <SectionHeader icon="calendar-outline" title="Timeline Defaults" isDark={isDark} />
          
          <View style={styles.mb4}>
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
              </View>
            )}

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
                      <Text style={[styles.dayCardText, isSelected && styles.textWhite]}>
                        {WEEKDAYS_SHORT[idx]}
                      </Text>
                    </TouchableOpacity>
                  )})}
                </View>
              </View>
            )}

            <View style={styles.gridRow}>
              <View style={styles.flex1}>
                <Text style={styles.label}>From Date</Text>
                <TouchableOpacity style={[styles.input, isDark && styles.inputDark]} onPress={() => { setDatePickerMode("start"); setShowDatePicker(true); }}>
                  <Text style={[styles.valText, !startDate && styles.placeholder]}>{startDate || "Select"}</Text>
                </TouchableOpacity>
              </View>
              {scheduleType !== "one-time" && (
                <View style={styles.flex1}>
                  <Text style={styles.label}>To Date</Text>
                  <TouchableOpacity style={[styles.input, isDark && styles.inputDark]} onPress={() => { setDatePickerMode("end"); setShowDatePicker(true); }}>
                    <Text style={[styles.valText, !endDate && styles.placeholder]}>{endDate || "Select"}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.gridRow}>
              <View style={styles.flex1}>
                <Text style={styles.label}>Start Time</Text>
                <TouchableOpacity style={[styles.input, isDark && styles.inputDark]} onPress={() => { setTimePickerMode("start"); setShowTimePicker(true); }}>
                  <Text style={[styles.valText, !startTime && styles.placeholder]}>{format12h(startTime) || "09:00 AM"}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.flex1}>
                <Text style={styles.label}>End Time</Text>
                <TouchableOpacity style={[styles.input, isDark && styles.inputDark]} onPress={() => { setTimePickerMode("end"); setShowTimePicker(true); }}>
                  <Text style={[styles.valText, !endTime && styles.placeholder]}>{format12h(endTime) || "05:00 PM"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <SectionHeader icon="settings-outline" title="Setup & Verification" isDark={isDark} />

          <Text style={styles.label}>Session Mode</Text>
          <View style={styles.scheduleGridRow}>
            {[
              { id: "On-site", icon: "location-outline" },
              { id: "Remote", icon: "videocam-outline" },
              { id: "Hybrid", icon: "sync-outline" }
            ].map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.scheduleBtn, { width: "31%" }, sessionType === t.id && styles.scheduleBtnActive]}
                onPress={() => setSessionType(t.id as any)}
              >
                <Ionicons name={t.icon as any} size={18} color={sessionType === t.id ? "#fff" : "#0F172A"} />
                <Text style={[styles.scheduleBtnText, sessionType === t.id && styles.textWhite]}>{t.id}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {(sessionType === "Remote" || sessionType === "Hybrid") && (
            <View style={styles.locationWrapper}>
              <Text style={styles.label}>Virtual Link</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {["Zoom", "Google Meet", "Teams", "Discord", "Others"].map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.pillBtn, remotePlatform === p && styles.pillBtnActive]}
                    onPress={() => setRemotePlatform(p === remotePlatform ? "" : p)}
                  >
                    <Text style={[styles.pillBtnText, remotePlatform === p && styles.textWhite]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {remotePlatform === "Others" && (
                <TextInput style={[styles.input, isDark && styles.inputDark]} placeholder="Manual Platform" value={customPlatform} onChangeText={setCustomPlatform} />
              )}
              <TextInput style={[styles.input, isDark && styles.inputDark, { marginBottom: 0 }]} placeholder="Meeting URL" value={remoteLink} onChangeText={setRemoteLink} />
            </View>
          )}

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
                  <TouchableOpacity onPress={getAutomaticLocation} style={styles.gpsAction}>
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
                          setExactCoords({ lat: item.lat, lon: item.lon });
                          setShowDropdown(false);
                        }}
                      >
                        <Ionicons name="pin" size={18} color="#3B82F6" style={{ marginRight: 12 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.dropdownTitle} numberOfLines={1}>{item.displayName.split(',')[0]}</Text>
                          <Text style={styles.dropdownSub} numberOfLines={2}>{item.displayName.split(',').slice(1).join(',').trim()}</Text>
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
                  onChangeText={setRadius} 
                />
                <Text style={styles.unitText}>meters radius</Text>
              </View>
            </View>
          )}

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
                <Ionicons name={m.icon as any} size={20} color={active ? "#fff" : "#0F172A"} />
                <Text style={[styles.methodItemText, active && styles.textWhite]}>{m.label}</Text>
                <Ionicons name={active ? "checkmark-circle" : "ellipse-outline"} size={20} color={active ? "#fff" : "#cbd5e1"} />
              </TouchableOpacity>
            )})}
          </View>

          <View style={{ marginTop: 24 }}>
            <SectionHeader icon="document-text-outline" title="Additional Information" isDark={isDark} />
            
            {additionalDetails.map((item, idx) => (
              <View key={idx} style={styles.kvRow}>
                 <TextInput
                   style={[styles.kvInput, { flex: 1 }, isDark && styles.inputDark]}
                   placeholder="Label (e.g. Host)"
                   placeholderTextColor="#94a3b8"
                   value={item.key}
                   onChangeText={(v) => updateDetailRow(idx, 'key', v)}
                 />
                 <TextInput
                   style={[styles.kvInput, { flex: 1.5 }, isDark && styles.inputDark]}
                   placeholder="Info (e.g. John Doe)"
                   placeholderTextColor="#94a3b8"
                   value={item.value}
                   onChangeText={(v) => updateDetailRow(idx, 'value', v)}
                 />
                 <TouchableOpacity onPress={() => removeDetailRow(idx)} style={styles.removeBtn}>
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

        <View style={styles.footerStandard}>
          <TouchableOpacity style={styles.primaryActionBtn} onPress={handleGenerate}>
            <Ionicons name="add-circle" size={22} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.primaryActionBtnText}>Create Session</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showDatePicker && <DateTimePicker value={dateObj} mode="date" display="default" onChange={onDateChange} />}
      {showTimePicker && <DateTimePicker value={dateObj} mode="time" display="default" onChange={onTimeChange} />}
    </View>
  );
};

const styles = StyleSheet.create({
  fullscreenOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "center", alignItems: "center", zIndex: 10000 },
  modalBox: { width: "94%", maxWidth: 460, maxHeight: "88%", backgroundColor: "#fff", borderRadius: 32, overflow: "hidden", elevation: 20 },
  modalBoxDark: { backgroundColor: "#1e293b" },
  headerStandard: { padding: 24, paddingBottom: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  headerDark: { borderBottomColor: "#334155" },
  headerTitle: { fontSize: 22, fontWeight: "900", color: "#0F172A", letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: "#94a3b8", fontWeight: "600", marginTop: 2 },
  closeBtnStandard: { padding: 8, backgroundColor: "#f8fafc", borderRadius: 12 },
  scrollContent: { padding: 24, paddingBottom: 40 },
  sectionHeaderLine: { flexDirection: "row", alignItems: "center", marginBottom: 20, marginTop: 10 },
  sectionTitle: { fontSize: 13, fontWeight: "900", color: "#0F172A", marginLeft: 8, textTransform: "uppercase", letterSpacing: 1 },
  line: { flex: 1, height: 1, backgroundColor: "#0F172A", opacity: 0.1, marginLeft: 15 },
  label: { fontSize: 11, fontWeight: "800", color: "#94a3b8", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 },
  input: { height: 56, backgroundColor: "#f8fafc", borderRadius: 16, paddingHorizontal: 16, borderWidth: 1.5, borderColor: "#e2e8f0", justifyContent: "center", marginBottom: 20 },
  inputDark: { backgroundColor: "#0f172a", borderColor: "#334155" },
  valText: { fontSize: 15, fontWeight: "700", color: "#1e293b" },
  placeholder: { color: "#cbd5e1" },
  scheduleGridRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 20, gap: 8 },
  scheduleBtn: { width: "48%", backgroundColor: "#f8fafc", paddingVertical: 14, borderRadius: 16, borderWidth: 1.5, borderColor: "#e2e8f0", alignItems: "center", flexDirection: "row", justifyContent: "center" },
  scheduleBtnActive: { borderColor: "#3B82F6", backgroundColor: "#3B82F6" },
  scheduleBtnText: { fontSize: 13, fontWeight: "800", color: "#0F172A", marginLeft: 8 },
  daysGrid: { flexDirection: "row", justifyContent: "space-between", gap: 4 },
  dayCard: { flex: 1, height: 48, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#e2e8f0" },
  dayCardActive: { backgroundColor: "#3B82F6", borderColor: "#3B82F6" },
  dayCardText: { fontSize: 13, fontWeight: "800", color: "#64748b" },
  gridRow: { flexDirection: "row", gap: 12 },
  flex1: { flex: 1 },
  accentBox: { backgroundColor: "#f8fafc", padding: 18, borderRadius: 20, marginBottom: 12, borderWidth: 1.5, borderColor: "#e2e8f0" },
  locationWrapper: { backgroundColor: "#f8fafc", padding: 16, borderRadius: 24, marginBottom: 20, borderWidth: 1.5, borderColor: "#e2e8f0" },
  pillBtn: { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1.5, borderColor: "#e2e8f0", marginRight: 8, marginBottom: 8 },
  pillBtnActive: { backgroundColor: "#3B82F6", borderColor: "#3B82F6" },
  pillBtnText: { fontSize: 12, fontWeight: "800", color: "#64748b" },
  searchBarBox: { flexDirection: "row", alignItems: "center" },
  searchField: { flex: 1, height: 56, backgroundColor: "#fff", borderRadius: 16, paddingLeft: 16, paddingRight: 60, borderWidth: 1.5, borderColor: "#e2e8f0", color: "#1e293b", fontSize: 15, fontWeight: "700" },
  gpsAction: { position: "absolute", right: 6, width: 44, height: 44, backgroundColor: "#0F172A", borderRadius: 12, alignItems: "center", justifyContent: "center" },
  dropdownResultsOverlay: { position: "absolute", top: 60, left: 0, right: 0, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1.5, borderColor: "#e2e8f0", overflow: "hidden", elevation: 20, zIndex: 1000, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 15 },
  dropdownItemModern: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  dropdownTitle: { fontSize: 14, fontWeight: "800", color: "#1e293b" },
  dropdownSub: { fontSize: 11, color: "#94a3b8", marginTop: 2, fontWeight: "600" },
  radiusBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 16, borderWidth: 1.5, borderColor: "#e2e8f0", height: 56, paddingHorizontal: 16 },
  radiusInput: { flex: 1, fontSize: 18, fontWeight: "900", color: "#3B82F6" },
  unitText: { fontSize: 11, fontWeight: "900", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 },
  kvRow: { flexDirection: "row", gap: 8, marginBottom: 10, alignItems: "center" },
  kvInput: { height: 48, backgroundColor: "#f8fafc", borderRadius: 12, paddingHorizontal: 12, borderWidth: 1.5, borderColor: "#e2e8f0", fontSize: 13, fontWeight: "600", color: "#1e293b" },
  removeBtn: { padding: 8, backgroundColor: "#fef2f2", borderRadius: 10 },
  addDetailBtn: { flexDirection: "row", alignItems: "center", padding: 14, backgroundColor: "#eff6ff", borderRadius: 16, borderStyle: "dashed", borderWidth: 1.5, borderColor: "#3B82F6", justifyContent: "center", marginBottom: 20 },
  addDetailText: { fontSize: 14, fontWeight: "800", color: "#3B82F6", marginLeft: 8 },
  methodList: { gap: 10 },
  methodItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", padding: 18, borderRadius: 20, borderWidth: 1.5, borderColor: "#e2e8f0" },
  methodItemActive: { backgroundColor: "#3B82F6", borderColor: "#3B82F6" },
  methodItemText: { flex: 1, fontSize: 14, fontWeight: "800", color: "#0F172A", marginLeft: 12 },
  textWhite: { color: "#fff" },
  footerStandard: { padding: 24, borderTopWidth: 1, borderTopColor: "#f1f5f9", backgroundColor: "#fff" },
  primaryActionBtn: { height: 64, backgroundColor: "#3B82F6", borderRadius: 20, flexDirection: "row", alignItems: "center", justifyContent: "center", shadowColor: "#3B82F6", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 12 },
  primaryActionBtnText: { color: "#fff", fontSize: 16, fontWeight: "900", letterSpacing: 0.5 },
  mb4: { marginBottom: 16 },
});
