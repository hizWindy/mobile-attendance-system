import React from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
  useColorScheme,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import type { ActivityItem, ActionType } from "@/api/ActivityService";

// ─── Action config ────────────────────────────────────────────────────────────

const ACTION_META: Record<
  ActionType,
  {
    icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
    color: string;
    bg: string;
    bgDark: string;
    verb: string;
  }
> = {
  create_session: { icon: "calendar-plus",       color: "#3B82F6", bg: "#DBEAFE", bgDark: "rgba(59,130,246,0.18)",  verb: "Created a Session"  },
  update_session: { icon: "pencil-outline",       color: "#EAB308", bg: "#FEF9C3", bgDark: "rgba(234,179,8,0.18)",   verb: "Updated a Session"  },
  delete_session: { icon: "trash-can-outline",    color: "#EF4444", bg: "#FEE2E2", bgDark: "rgba(239,68,68,0.18)",   verb: "Deleted a Session"  },
  join_session:   { icon: "account-plus-outline", color: "#8B5CF6", bg: "#EDE9FE", bgDark: "rgba(139,92,246,0.18)",  verb: "Joined a Session"   },
  check_in:       { icon: "login",               color: "#22C55E", bg: "#DCFCE7", bgDark: "rgba(34,197,94,0.18)",   verb: "Checked In"         },
  check_out:      { icon: "logout",              color: "#F97316", bg: "#FFEDD5", bgDark: "rgba(249,115,22,0.18)",  verb: "Checked Out"        },
};

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

const formatTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });

// ─── Detail row ───────────────────────────────────────────────────────────────

const DetailRow: React.FC<{
  iconName: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
  isDark: boolean;
  capitalize?: boolean;
}> = ({ iconName, label, value, isDark, capitalize }) => (
  <View style={styles.detailRow}>
    <View style={styles.detailIconWrap}>
      <Ionicons name={iconName} size={15} color={isDark ? "#64748B" : "#94A3B8"} />
    </View>
    <Text style={[styles.detailLabel, isDark && styles.detailLabelDark]}>{label}</Text>
    <Text 
      style={[
        styles.detailValue, 
        isDark && styles.detailValueDark,
        capitalize && { textTransform: "capitalize" }
      ]} 
      numberOfLines={2}
    >
      {value}
    </Text>
  </View>
);

// ─── Props ────────────────────────────────────────────────────────────────────

interface ActivityDetailModalProps {
  visible: boolean;
  activity: ActivityItem | null;
  onClose: () => void;
  onViewAll: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ActivityDetailModal: React.FC<ActivityDetailModalProps> = ({
  visible,
  activity,
  onClose,
  onViewAll,
}) => {
  const isDark = useColorScheme() === "dark";

  if (!activity) return null;

  const meta        = ACTION_META[activity.action_type] ?? ACTION_META.create_session;
  const sessionName = activity.extra_data?.session_name ?? activity.extra_data?.name ?? "Untitled Session";

  const updatedFields = activity.extra_data?.updated_fields;
  const formattedFields = Array.isArray(updatedFields) && updatedFields.length > 0
    ? updatedFields.map((f: string) => f.replace(/_/g, " ")).join(", ")
    : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <View style={[styles.sheet, isDark && styles.sheetDark]}>

        {/* Drag handle pill */}
        <View style={styles.handleRow}>
          <View style={[styles.handle, isDark && styles.handleDark]} />
        </View>

        {/* Header: title + X */}
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, isDark && styles.modalTitleDark]}>Activity Detail</Text>
          <Pressable
            onPress={onClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={({ pressed }) => [styles.xBtn, isDark && styles.xBtnDark, pressed && styles.pressed]}
          >
            <Ionicons name="close" size={16} color={isDark ? "#94A3B8" : "#64748B"} />
          </Pressable>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={[styles.heroIcon, { backgroundColor: isDark ? meta.bgDark : meta.bg }]}>
            <MaterialCommunityIcons name={meta.icon} size={28} color={meta.color} />
          </View>
          <View style={styles.heroText}>
            <Text style={[styles.heroVerb, { color: meta.color }]}>{meta.verb}</Text>
            <Text style={[styles.heroSession, isDark && styles.heroSessionDark]} numberOfLines={2}>
              {sessionName}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, isDark && styles.dividerDark]} />

        {/* Details */}
        <View style={styles.details}>
          <DetailRow iconName="calendar-outline" label="Date"      value={formatDate(activity.created_at)} isDark={isDark} />
          <DetailRow iconName="time-outline"     label="Time"      value={formatTime(activity.created_at)} isDark={isDark} />
          <DetailRow iconName="flash-outline"    label="Action"    value={meta.verb}                        isDark={isDark} />
          {formattedFields && (
            <DetailRow iconName="list-outline"   label="Changes"   value={formattedFields} isDark={isDark} capitalize />
          )}
          {activity.session_id != null && (
            <DetailRow iconName="key-outline" label="Session ID" value={`#${activity.session_id}`} isDark={isDark} />
          )}
        </View>

        <View style={[styles.divider, isDark && styles.dividerDark]} />

        {/* Footer — CTA only */}
        <View style={styles.footer}>
          <Pressable
            onPress={() => { onClose(); onViewAll(); }}
            style={({ pressed }) => [styles.ctaBtn, pressed && styles.ctaBtnPressed]}
          >
            <Text style={styles.ctaBtnText}>View Full Activity Log</Text>
            <Ionicons name="arrow-forward" size={15} color="#FFFFFF" style={styles.ctaArrow} />
          </Pressable>
        </View>

      </View>
    </Modal>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    overflow: "hidden",
  },
  sheetDark: {
    backgroundColor: "#0F172A",
  },
  // Drag handle row
  handleRow: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 2,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
  },
  handleDark: {
    backgroundColor: "#334155",
  },
  // Modal header row
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 4,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  modalTitleDark: {
    color: "#F1F5F9",
  },
  xBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  xBtnDark: {
    backgroundColor: "#1E293B",
  },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 14,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  heroText: {
    flex: 1,
  },
  heroVerb: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  heroSession: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 24,
  },
  heroSessionDark: {
    color: "#F1F5F9",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginHorizontal: 20,
  },
  dividerDark: {
    backgroundColor: "#1E293B",
  },
  details: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  detailIconWrap: {
    width: 22,
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "500",
    width: 84,
  },
  detailLabelDark: {
    color: "#475569",
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "right",
  },
  detailValueDark: {
    color: "#E2E8F0",
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 10,
  },
  ctaBtn: {
    height: 52,
    backgroundColor: "#3B82F6",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaBtnPressed: {
    opacity: 0.85,
  },
  ctaBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  ctaArrow: {
    marginLeft: 6,
  },
  dismissBtn: {
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  dismissBtnDark: {
    backgroundColor: "#1E293B",
  },
  dismissText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  dismissTextDark: {
    color: "#475569",
  },
  pressed: {
    opacity: 0.7,
  },
});
