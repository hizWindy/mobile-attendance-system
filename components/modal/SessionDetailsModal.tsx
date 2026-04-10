import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { BackendSession, SessionStatus } from "@/types/SessionTypes";
import { formatDuration, getSessionTerm, getSessionTimeStatus } from "@/utils/timeUtils";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.82;

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  SessionStatus | "active" | "past" | "upcoming",
  { label: string; accentColor: string; bgColor: string; borderColor: string; dotColor: string }
> = {
  active: { 
    label: "Active Now", 
    accentColor: "#0D9488", 
    bgColor: "#F0FDFA", 
    borderColor: "#0D948820", 
    dotColor: "#0D9488" 
  },
  "action-now": { 
    label: "Active Now", 
    accentColor: "#0D9488", 
    bgColor: "#F0FDFA", 
    borderColor: "#0D948820", 
    dotColor: "#0D9488" 
  },
  upcoming: { 
    label: "Upcoming", 
    accentColor: "#3B82F6", 
    bgColor: "#EFF6FF", 
    borderColor: "#3B82F620", 
    dotColor: "#3B82F6" 
  },
  past: { 
    label: "Past Session", 
    accentColor: "#64748B", 
    bgColor: "#F8FAFC", 
    borderColor: "#64748B20", 
    dotColor: "#64748B" 
  },
  completed: { 
    label: "Completed", 
    accentColor: "#64748B", 
    bgColor: "#F8FAFC", 
    borderColor: "#64748B20", 
    dotColor: "#64748B" 
  },
  missed: { 
    label: "Missed", 
    accentColor: "#EF4444", 
    bgColor: "#FEF2F2", 
    borderColor: "#FECACA", 
    dotColor: "#EF4444" 
  },
};


// ─── Method icons mapping ─────────────────────────────────────────────────────
const METHOD_ICONS: Record<string, string> = {
  qr: "qrcode-scan",
  manual: "pencil-outline",
  geolocation: "map-marker-radius-outline",
  nfc: "nfc-tap",
  face: "face-recognition",
  fingerprint: "fingerprint",
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

const MethodBadge = ({ method }: { method: string }) => (
  <View style={styles.methodBadge}>
    <MaterialCommunityIcons
      name={(METHOD_ICONS[method] || "check-circle-outline") as any}
      size={14}
      color="#475569"
    />
    <Text style={styles.methodText}>{method.toUpperCase()}</Text>
  </View>
);

// ─── Main Modal ───────────────────────────────────────────────────────────────
interface Props {
  session: BackendSession | null;
  visible: boolean;
  onClose: () => void;
  onManageSession?: () => void;
  onCheckIn?: () => void;
}

export const SessionDetailsModal: React.FC<Props> = ({
  session,
  visible,
  onClose,
  onManageSession,
  onCheckIn,
}) => {
  const slideAnim = useRef(new Animated.Value(SHEET_MAX_HEIGHT)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;

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

  const rawStatus = getSessionTimeStatus(session);
  const cfg = (STATUS_CONFIG as any)[rawStatus] || STATUS_CONFIG["upcoming"];

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
        <View style={[styles.accentBar, { backgroundColor: cfg.bgColor, borderBottomColor: cfg.borderColor }]}>
          {/* Left: status dot + label + code */}
          <View style={styles.accentLeft}>
            <View style={[styles.statusDot, { backgroundColor: cfg.dotColor }]} />
            <Text style={[styles.statusLabel, { color: cfg.accentColor }]}>
              {cfg.label}
            </Text>
            {session.session_code ? (
              <View style={[styles.codePill, { borderColor: cfg.borderColor }]}>
                <Text style={[styles.codeText, { color: cfg.accentColor }]}>
                  {session.session_code}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Right: term + type + policy chips */}
          <View style={styles.accentRight}>
            <View style={[styles.chip, { borderColor: cfg.borderColor }]}>
              <Text style={[styles.chipText, { color: cfg.accentColor }]}>
                {sessionTerm.label.toUpperCase()}
              </Text>
            </View>
            <View style={[styles.chip, { borderColor: cfg.borderColor }]}>
              <Text style={[styles.chipText, { color: cfg.accentColor }]}>
                {formattedSetup}
              </Text>
            </View>
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
            label="Term"
            value={sessionTerm.label}
          />
          <InfoRow
            iconName="time-outline"
            label="Duration"
            value={formatDuration(session.required_time_rendered)}
          />
          <InfoRow
            iconName="person-outline"
            label="Instructor / Speaker"
            value={instructorLabel}
          />
          <InfoRow
            iconName="layers-outline"
            label="Session Setup"
            value={formattedSetup}
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
              <InfoRow iconName="link-outline" label="Join Link" value={session.location?.link} />
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

            {/* 👨‍🏫 SUPERVISOR Manage */}
            {session.role_type === "Supervisors" && onManageSession && (
              <TouchableOpacity
                style={styles.btnManage}
                onPress={() => { onClose(); onManageSession(); }}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="cog-outline" size={17} color="#fff" />
                <Text style={styles.btnManageText}>Manage Session</Text>
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
    // Shadow for elevation
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
    // Tall hit area makes it easy to grab
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
});
