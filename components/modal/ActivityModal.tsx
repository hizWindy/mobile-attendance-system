import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import {
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
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
  if (!activity) return null;

  const screenWidth = Dimensions.get("window").width;

  const getMeta = () => {
    switch (activity.type) {
      case "attendance":
        return {
          icon: <Ionicons name="checkmark-circle" size={30} color="#1976d2" />,
          label: "Attendance",
          description: "User checked into a session.",
          bg: "#e3f2fd",
        };
      case "management":
        return {
          icon: <MaterialCommunityIcons name="cog" size={30} color="#7b1fa2" />,
          label: "Management",
          description: "Administrative action performed.",
          bg: "#f3e5f5",
        };
      default:
        return {
          icon: <Ionicons name="information-circle" size={30} color="#666" />,
          label: "Other",
          description: "General system activity.",
          bg: "#eeeeee",
        };
    }
  };

  const meta = getMeta();

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { width: screenWidth * 0.9 }]}>
          {/* HEADER */}
          <View style={styles.header}>
            <View style={[styles.iconBadge, { backgroundColor: meta.bg }]}>
              {meta.icon}
            </View>

            <Text style={styles.title}>{activity.title}</Text>
            <Text style={styles.subtitle}>{meta.label}</Text>
          </View>

          {/* DESCRIPTION */}
          <Text style={styles.description}>{meta.description}</Text>

          {/* INFO CARD */}
          <View style={styles.card}>
            {/* TYPE */}
            <View style={styles.row}>
              <Ionicons name="pricetag-outline" size={18} color="#555" />
              <Text style={styles.label}>Type</Text>
            </View>
            <Text style={styles.value}>{activity.type}</Text>

            {/* TIME */}
            <View style={styles.row}>
              <Ionicons name="time-outline" size={18} color="#555" />
              <Text style={styles.label}>Timestamp</Text>
            </View>
            <Text style={styles.value}>{activity.timestamp}</Text>
          </View>

          {/* CLOSE BUTTON */}
          <TouchableOpacity
            style={styles.closeButton}
            activeOpacity={0.85}
            onPress={onClose}
          >
            <Ionicons name="close-circle" size={18} color="#fff" />
            <Text style={styles.closeText}> Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 10,
  },

  header: {
    alignItems: "center",
    marginBottom: 12,
  },

  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f4d7a",
    textAlign: "center",
  },

  subtitle: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
  },

  description: {
    textAlign: "center",
    fontSize: 13,
    color: "#666",
    marginBottom: 14,
  },

  card: {
    backgroundColor: "#f9fafc",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },

  label: {
    marginLeft: 6,
    fontSize: 13,
    color: "#666",
  },

  value: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1f4d7a",
    marginTop: 2,
  },

  closeButton: {
    flexDirection: "row",
    backgroundColor: "#001F54",
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  closeText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});
