import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View, ScrollView, TouchableWithoutFeedback, StyleSheet, useColorScheme } from "react-native";
import { Activity } from "../activity/ActivityItem";

interface ActivityModalProps {
  visible: boolean;
  activity: Activity | null;
  onClose: () => void;
}

export const ActivityModal: React.FC<ActivityModalProps> = ({
  visible,
  activity,
  onClose,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  if (!activity || !visible) return null;

  const getMeta = () => {
    switch (activity.type) {
      case "attendance":
        return {
          icon: <Ionicons name="checkmark-circle" size={30} color="#2563eb" />,
          label: "Attendance Action",
          description: "User checked into a session.",
          bg: isDark ? "rgba(37, 99, 235, 0.2)" : "#eff6ff",
        };
      case "management":
        return {
          icon: <MaterialCommunityIcons name="shield-account" size={30} color="#7c3aed" />,
          label: "Management Action",
          description: "Administrative action performed.",
          bg: isDark ? "rgba(124, 58, 237, 0.2)" : "#f5f3ff",
        };
      default:
        return {
          icon: <Ionicons name="information-circle" size={30} color="#64748b" />,
          label: "System Event",
          description: "Background system activity.",
          bg: isDark ? "rgba(100, 116, 139, 0.2)" : "#f8fafc",
        };
    }
  };

  const meta = getMeta();

  return (
    <View style={styles.overlay}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={StyleSheet.absoluteFill} />
      </TouchableWithoutFeedback>

      <View style={[styles.modalBox, isDark && styles.modalBoxDark]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity onPress={onClose} style={[styles.closeBtn, isDark && styles.closeBtnDark]}>
            <Ionicons name="close" size={20} color={isDark ? "#94a3b8" : "#64748b"} />
          </TouchableOpacity>
          
          <View style={styles.centerItems}>
            <View style={[styles.iconContainer, { backgroundColor: meta.bg }]}>
              {meta.icon}
            </View>
            <Text style={[styles.title, isDark && styles.textWhite]}>{activity.title}</Text>
            <Text style={[styles.label, isDark && styles.textGrayDim]}>{meta.label}</Text>
          </View>

          <Text style={[styles.description, isDark && styles.textGrayDim]}>{meta.description}</Text>

          <View style={[styles.detailBox, isDark && styles.detailBoxDark]}>
            <View style={[styles.detailRow, styles.borderBottom]}>
              <View style={styles.rowLead}>
                <Ionicons name="finger-print-outline" size={18} color="#9ca3af" />
                <Text style={[styles.rowLabel, isDark && styles.textGrayDim]}>Type</Text>
              </View>
              <Text style={[styles.rowValue, isDark && styles.textBlueLt]}>{activity.type}</Text>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.rowLead}>
                <Ionicons name="time-outline" size={18} color="#9ca3af" />
                <Text style={[styles.rowLabel, isDark && styles.textGrayDim]}>Logged At</Text>
              </View>
              <Text style={[styles.rowValue, isDark && styles.textBlueLt]}>{activity.timestamp}</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
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
    borderRadius: 32,
    overflow: "hidden",
    elevation: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  modalBoxDark: {
    backgroundColor: "#1e293b",
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 32,
  },
  closeBtn: {
    alignSelf: "flex-end",
    padding: 6,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    marginBottom: 8,
  },
  closeBtnDark: {
    backgroundColor: "#334155",
  },
  centerItems: {
    alignItems: "center",
    marginBottom: 20,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748b",
    marginTop: 4,
  },
  description: {
    textAlign: "center",
    fontSize: 14,
    color: "#64748b",
    marginBottom: 24,
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  detailBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  detailBoxDark: {
    backgroundColor: "#0f172a",
    borderColor: "#334155",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  rowLead: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: "#64748b",
  },
  rowValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0f172a",
  },
  textWhite: { color: "white" },
  textGrayDim: { color: "#94a3b8" },
  textBlueLt: { color: "#bfdbfe" },
});
