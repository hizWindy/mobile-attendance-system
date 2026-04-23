import AnalyticsService, { SessionStats } from "@/api/AnalyticsService";
import { BackendSession } from "@/types/SessionTypes";
import { formatTime12hr, getSessionTerm } from "@/utils/timeUtils";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Linking,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.82;

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    upcoming: { label: "Upcoming", color: "#3B82F6" },
    active:   { label: "Active",   color: "#22C55E" },
    on_break: { label: "On Break", color: "#EAB308" },
    past:     { label: "Past",     color: "#6B7280" },
};

// ─── Method config mapping ──────────────────────────────────────────────────────
const METHOD_CONFIG: Record<string, { icon: string; label: string }> = {
  qr:          { icon: "qrcode-scan", label: "QR Scanning" },
  "qr based":  { icon: "qrcode-scan", label: "QR Scanning" },
  manual:      { icon: "pencil-outline", label: "Manual" },
  "manual click":{ icon: "pencil-outline", label: "Manual" },
  geofencing:  { icon: "map-marker-radius-outline", label: "Location-based" },
  geolocation: { icon: "map-marker-radius-outline", label: "Location-based" },
  "location check": { icon: "map-marker-radius-outline", label: "Location-based" },
  nfc:         { icon: "nfc-tap", label: "NFC Tap" },
  face:        { icon: "face-recognition", label: "Biometrics" },
  "facial recognition": { icon: "face-recognition", label: "Biometrics" },
  fingerprint: { icon: "fingerprint", label: "Biometrics" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const InfoRow = ({
  iconName,
  iconLib = "ion",
  label,
  value,
}: {
  iconName: string;
  iconLib?: "ion" | "mci";
  label: string;
  value?: string | number | null;
}) => {
  if (!value && value !== 0) return null;
  const Icon = iconLib === "mci" ? MaterialCommunityIcons : Ionicons;
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconBox}>
        <Icon name={iconName as any} size={16} color="#64748B" />
      </View>
      <View style={styles.infoTextBox}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{String(value)}</Text>
      </View>
    </View>
  );
};

const SectionTitle = ({ title }: { title: string }) => (
  <View style={styles.sectionTitleRow}>
    <Text style={styles.sectionTitleText}>{title}</Text>
    <View style={styles.sectionTitleLine} />
  </View>
);

const MethodBadge = ({ method }: { method: string }) => {
  const cfg = METHOD_CONFIG[method.toLowerCase()] || { icon: "check-circle-outline", label: method };
  return (
    <View style={styles.methodBadge}>
      <MaterialCommunityIcons
        name={cfg.icon as any}
        size={14}
        color="#475569"
      />
      <Text style={styles.methodText}>{cfg.label.toUpperCase()}</Text>
    </View>
  );
};

// ─── Main Modal ───────────────────────────────────────────────────────────────
interface Props {
  session: BackendSession | null;
  visible: boolean;
  onClose: () => void;
  onManageSession?: () => void;
  /** Called when supervisor taps Live Attendance on an active session */
  onLiveAttendance?: () => void;
  onCheckIn?: () => void;
  /** Pass true when opening from Participate tab to enable inline check-in */
  isParticipant?: boolean;
  /** Called with the chosen method key when user confirms check-in */
  onCheckInWithMethod?: (method: string) => void;
}

export const SessionDetailsModal: React.FC<Props> = ({
  session,
  visible,
  onClose,
  onManageSession,
  onLiveAttendance,
  onCheckIn,
  isParticipant = false,
  onCheckInWithMethod,
}) => {
  const slideAnim = useRef(new Animated.Value(SHEET_MAX_HEIGHT)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const [checkingIn, setCheckingIn] = useState(false);

  // ── Analytics state ──────────────────────────────────────────────────────────
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Dismiss threshold — if user drags down > 120px, close
  const DISMISS_THRESHOLD = 120;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, { dy }) => dy > 2,
      onPanResponderMove: (_, { dy }) => {
        // Only allow dragging downward
        if (dy > 0) dragY.setValue(dy);
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        if (dy > DISMISS_THRESHOLD || vy > 0.8) {
          // Flick or drag past threshold → dismiss
          Animated.timing(dragY, {
            toValue: SHEET_MAX_HEIGHT,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            dragY.setValue(0);
            onClose();
          });
        } else {
          // Snap back
          Animated.spring(dragY, {
            toValue: 0,
            tension: 80,
            friction: 10,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      dragY.setValue(0);
      setCheckingIn(false);
      setStats(null);
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();

      // Fetch analytics for supervisor sessions (any status)
      if (session?.role_type === "Supervisors" && session.session_id) {
        setStatsLoading(true);
        AnalyticsService.getSessionStats(session.session_id)
          .then((data) => setStats(data))
          .catch(() => setStats(null))
          .finally(() => setStatsLoading(false));
      }
    } else {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SHEET_MAX_HEIGHT,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!session) return null;

  const rawStatus = session.session_status || "upcoming";
  const { label, color } = STATUS_MAP[rawStatus] ?? STATUS_MAP["upcoming"];

  const instructorLabel =
    session.details?.instructor ||
    session.details?.speaker ||
    session.details?.host ||
    session.details?.trainer ||
    null;

  const locationLine = [
    session.location?.room,
    session.location?.floor,
    session.location?.building,
  ]
    .filter(Boolean)
    .join(", ");

  const formattedSetup = session.session_setup
    ?.split("_")
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ") ?? "General";

  const isRemote = session.session_setup === "remote";
  const sessionTerm = getSessionTerm(session);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* ── Dim overlay ── */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlay, { opacity: opacityAnim }]} />
      </TouchableWithoutFeedback>

      {/* ── Bottom sheet — translateY = entry animation + live drag ── */}
      <Animated.View
        style={[
          styles.sheet,
          { transform: [{ translateY: Animated.add(slideAnim, dragY) }] },
        ]}
        pointerEvents="box-none"
      >
        {/* Drag handle — attach panHandlers here */}
        <View style={styles.dragHandleWrapper} {...panResponder.panHandlers}>
          <View style={styles.dragHandle} />
          <Text style={styles.dragHint}>drag to dismiss</Text>
        </View>

        {/* ── Coloured accent bar ── */}
        <View style={[styles.accentBar, { backgroundColor: `${color}10`, borderBottomColor: `${color}30` }]}>
          {/* Left: status dot + label */}
          <View style={styles.accentLeft}>
            <View style={[styles.statusDot, { backgroundColor: color }]} />
            <Text style={[styles.statusLabel, { color: color }]}>
              {label}
            </Text>
          </View>
        </View>

        {/* ── Scrollable content ── */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Title */}
          <Text style={styles.title}>{session.session_name}</Text>

          {/* Agenda / topic */}
          {(session.details?.agenda || session.details?.topic) && (
            <Text style={styles.agenda}>
              {session.details.agenda || session.details.topic}
            </Text>
          )}

          {/* ── Session Details section ── */}
          <SectionTitle title="Session Details" />

          <InfoRow
            iconName="calendar-outline"
            label="Type"
            value={session.schedule?.type?.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
          />
          {session.session_code ? (
            <TouchableOpacity 
              activeOpacity={0.6} 
              onPress={() => Clipboard.setStringAsync(session.session_code)}
            >
              <InfoRow
                iconName="key-outline"
                label="Session Code (Tap to Copy)"
                value={session.session_code}
              />
            </TouchableOpacity>
          ) : null}
          <InfoRow
            iconName="time-outline"
            label="Time"
            value={`${formatTime12hr(session.schedule?.start_time)} – ${formatTime12hr(session.schedule?.end_time)}`}
          />
          <InfoRow
            iconName="person-outline"
            label="Instructor / Speaker"
            value={instructorLabel}
          />

          {/* ── Additional Dynamic Details ── */}
          {Object.entries(session.details || {}).map(([key, val]) => {
            const lowerKey = key.toLowerCase();
            // Skip keys that are already handled explicitly in the UI
            const handled = ["agenda", "note", "instructor", "speaker", "host", "trainer", "venue", "room", "floor", "building"];
            if (handled.includes(lowerKey)) return null;
            if (!val) return null;

            const formattedKey = key
              .split("_")
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(" ");

            return (
              <InfoRow
                key={key}
                iconName="information-circle-outline"
                label={formattedKey}
                value={String(val)}
              />
            );
          })}

          {/* ── Location section ── */}
          {!isRemote && (
            <>
              <SectionTitle title="Location" />
              {locationLine ? (
                <InfoRow
                  iconName="location-outline"
                  label="Room / Floor / Building"
                  value={locationLine}
                />
              ) : null}
              <InfoRow
                iconName="map-outline"
                label="Address"
                value={session.location?.address}
              />
              {session.location?.radius != null && (
                <InfoRow
                  iconName="radio-button-on-outline"
                  label="Geofence Radius"
                  value={`${session.location.radius} meters`}
                />
              )}
            </>
          )}

          {/* ── Remote section ── */}
          {isRemote && (
            <>
              <SectionTitle title="Remote Access" />
              <InfoRow iconName="videocam-outline" label="Platform" value={session.location?.platform} />
              {session.location?.link && (
                <TouchableOpacity 
                  activeOpacity={0.6} 
                  onPress={() => session.location?.link && Linking.openURL(session.location.link)}
                >
                  <InfoRow iconName="link-outline" label="Join Link" value={session.location.link} />
                </TouchableOpacity>
              )}
              <InfoRow iconName="key-outline" label="Passcode" value={session.location?.passcode} />
            </>
          )}

          {/* ── Check-in Methods ── */}
          {session.methods && session.methods.length > 0 && (
            <>
              <SectionTitle title="Check-in Methods" />
              <View style={styles.methodsRow}>
                {session.methods.map((m) => (
                  <MethodBadge key={m} method={m} />
                ))}
              </View>
            </>
          )}

          {/* ── Notes ── */}
          {session.details?.note && (
            <>
              <SectionTitle title="Notes" />
              <View style={styles.noteBox}>
                <Ionicons name="information-circle-outline" size={16} color="#92400E" style={{ marginTop: 1 }} />
                <Text style={styles.noteText}>{session.details.note}</Text>
              </View>
            </>
          )}

          {/* ── Session Analytics (Supervisor only — all statuses) ── */}
          {session.role_type === "Supervisors" && (
            <>
              <SectionTitle title="Session Analytics" />
              <View style={styles.analyticsCard}>
                {statsLoading ? (
                  <View style={{ alignItems: "center", paddingVertical: 18 }}>
                    <ActivityIndicator size="small" color="#3B82F6" />
                    <Text style={{ color: "#94A3B8", fontSize: 12, marginTop: 6 }}>Loading analytics…</Text>
                  </View>
                ) : stats ? (
                  <>
                    {/* ── Summary Group ── */}
                    <View style={styles.analyticsSummaryGroup}>
                      <View style={styles.analyticsSummaryRow}>
                        <MaterialCommunityIcons name="clipboard-list-outline" size={18} color="#475569" />
                        <Text style={styles.analyticsSummaryLabel}>Total Attendees</Text>
                        <Text style={styles.analyticsSummaryValue}>{stats.total_enrolled}</Text>
                      </View>
                      <View style={styles.analyticsSummaryRowBlue}>
                        <MaterialCommunityIcons name="account-group-outline" size={18} color="#1D4ED8" />
                        <Text style={styles.analyticsSummaryLabelBlue}>Active Check-ins</Text>
                        <Text style={styles.analyticsSummaryValueBlue}>{stats.live_count}</Text>
                      </View>
                    </View>

                    {rawStatus === "past" && (
                      <>
                        <View style={styles.analyticsDivider} />

                        {/* ── Outcomes ── */}
                        <Text style={styles.analyticsBreakdownTitle}>Outcomes</Text>
                        <View style={styles.analyticsRow}>
                          <View style={styles.statBox}>
                            <View style={[styles.statDot, { backgroundColor: "#059669" }]} />
                            <Text style={styles.statLabel}>Complete</Text>
                            <Text style={[styles.statValue, { color: "#059669" }]}>{stats.outcomes?.complete ?? 0}</Text>
                          </View>
                          <View style={styles.statDivider} />
                          <View style={styles.statBox}>
                            <View style={[styles.statDot, { backgroundColor: "#D97706" }]} />
                            <Text style={styles.statLabel}>Incomplete</Text>
                            <Text style={[styles.statValue, { color: "#D97706" }]}>{stats.outcomes?.incomplete ?? 0}</Text>
                          </View>
                        </View>

                        <View style={styles.analyticsDivider} />

                        {/* ── Punctuality ── */}
                        <Text style={styles.analyticsBreakdownTitle}>Punctuality</Text>
                        <View style={styles.analyticsRow}>
                          <View style={styles.statBox}>
                            <View style={[styles.statDot, { backgroundColor: "#059669" }]} />
                            <Text style={styles.statLabel}>On Time</Text>
                            <Text style={[styles.statValue, { color: "#059669" }]}>{stats.punctuality?.on_time ?? 0}</Text>
                          </View>
                          <View style={styles.statDivider} />
                          <View style={styles.statBox}>
                            <View style={[styles.statDot, { backgroundColor: "#EA580C" }]} />
                            <Text style={styles.statLabel}>Late</Text>
                            <Text style={[styles.statValue, { color: "#EA580C" }]}>{stats.punctuality?.late ?? 0}</Text>
                          </View>
                        </View>
                      </>
                    )}
                  </>
                ) : (
                  <Text style={{ color: "#94A3B8", fontSize: 13, textAlign: "center", paddingVertical: 12 }}>
                    No analytics available yet
                  </Text>
                )}
              </View>
            </>
          )}

          {/* ── Actions ── */}
          <View style={styles.actions}>
            {/* 🧑‍🎓 ATTENDEE Check-in */}
            {session.role_type === "Attendee" && !session.attended && rawStatus === "active" && onCheckIn && (
              <TouchableOpacity
                style={[styles.btnCheckIn, { backgroundColor: "#0D9488" }]}
                onPress={() => { onClose(); onCheckIn(); }}
                activeOpacity={0.85}
              >
                <Ionicons name="scan-outline" size={18} color="#fff" />
                <Text style={styles.btnCheckInText}>Check In Now</Text>
              </TouchableOpacity>
            )}

            {/* 👨‍🏫 SUPERVISOR Live Attendance */}
            {session.role_type === "Supervisors" && rawStatus !== "past" && (
              <TouchableOpacity
                style={[
                  styles.btnManage,
                  rawStatus !== "active" && { backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#E2E8F0" }
                ]}
                onPress={() => {
                  if (rawStatus === "active" && onLiveAttendance) {
                    onLiveAttendance();
                  }
                }}
                activeOpacity={rawStatus === "active" ? 0.85 : 1}
              >
                <MaterialCommunityIcons
                  name="account-eye-outline"
                  size={17}
                  color={rawStatus === "active" ? "#fff" : "#94A3B8"}
                />
                <Text style={[
                  styles.btnManageText,
                  rawStatus !== "active" && { color: "#94A3B8" }
                ]}>
                  {rawStatus === "active" ? "View Live Attendees" : "View Live Attendees (Starts soon)"}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.btnClose} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.btnCloseText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: SHEET_MAX_HEIGHT,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  dragHandleWrapper: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: "#FFFFFF",
    minHeight: 36,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
  },

  // Accent bar
  accentBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  accentLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  codePill: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  codeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  accentRight: {
    flexDirection: "row",
    gap: 6,
    flexShrink: 0,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  chipText: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  // Scroll
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },

  // Title / agenda
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 28,
    marginBottom: 6,
  },
  agenda: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
    marginBottom: 4,
  },

  // Section title
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    marginBottom: 8,
  },
  sectionTitleText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  sectionTitleLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#F1F5F9",
  },

  // Info rows
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  infoIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  infoTextBox: {
    flex: 1,
    paddingTop: 1,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1E293B",
    lineHeight: 20,
  },

  // Methods
  methodsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  methodBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  methodText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    letterSpacing: 0.5,
  },

  // Notes
  noteBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 10,
    padding: 12,
    alignItems: "flex-start",
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: "#92400E",
    lineHeight: 19,
  },

  // Analytics
  analyticsCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 16,
    marginTop: 4,
  },
  // Summary row: Total Joined
  analyticsSummaryGroup: {
    gap: 8,
  },
  analyticsSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  analyticsSummaryLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  analyticsSummaryValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#475569",
  },
  analyticsSummaryRowBlue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  analyticsSummaryLabelBlue: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#1E40AF",
  },
  analyticsSummaryValueBlue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1D4ED8",
  },
  analyticsDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 12,
  },
  analyticsBreakdownTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  analyticsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#E2E8F0",
  },
  btnViewLogs: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  btnViewLogsText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },

  // Actions
  actions: {
    marginTop: 24,
    gap: 10,
  },
  btnCheckIn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#059669",
    paddingVertical: 15,
    borderRadius: 14,
  },
  btnCheckInText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  btnManage: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0F172A",
    paddingVertical: 15,
    borderRadius: 14,
  },
  btnManageText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  btnClose: {
    alignItems: "center",
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  btnCloseText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#94A3B8",
  },
  dragHint: {
    fontSize: 10,
    color: "#CBD5E1",
    marginTop: 3,
    letterSpacing: 0.5,
  },
  
  // Method Picker Styles
  methodPickerContainer: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  methodPickerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
  },
  noMethodsText: {
    fontSize: 13,
    color: "#64748B",
    fontStyle: "italic",
    marginBottom: 8,
  },
  methodPickerRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  methodPickerRowText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginLeft: 12,
  },
  methodPickerCancel: {
    marginTop: 6,
    alignItems: "center",
    paddingVertical: 12,
  },
  methodPickerCancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
});
