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

interface CheckInModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectType: (type: string) => void;
}

const METHODS = [
  { name: "Biometric", icon: "fingerprint", type: "MaterialCommunityIcons" },
  { name: "Fingerprint", icon: "fingerprint", type: "MaterialCommunityIcons" },
  {
    name: "Facial Recognition",
    icon: "face-recognition",
    type: "MaterialCommunityIcons",
  },
  { name: "QR Scan", icon: "qr-code-outline", type: "Ionicons" },
  { name: "RFID", icon: "radio", type: "Ionicons" },
  { name: "Geo Location", icon: "location-outline", type: "Ionicons" },
  { name: "Geo Fencing", icon: "map-outline", type: "Ionicons" },
];

export const CheckInModal: React.FC<CheckInModalProps> = ({
  visible,
  onClose,
  onSelectType,
}) => {
  const screenWidth = Dimensions.get("window").width;
  const modalWidth = screenWidth * 0.9;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { width: modalWidth }]}>
          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="checkmark-done-circle" size={36} color="#001F54" />
            <Text style={styles.title}>Check In Method</Text>
            <Text style={styles.subtitle}>Choose how you want to check in</Text>
          </View>

          {/* Methods */}
          {METHODS.map((method) => (
            <TouchableOpacity
              key={method.name}
              style={styles.methodButton}
              activeOpacity={0.8}
              onPress={() => {
                onSelectType(method.name);
                onClose();
              }}
            >
              {/* Icon */}
              {method.type === "Ionicons" ? (
                <Ionicons name={method.icon as any} size={22} color="#001F54" />
              ) : (
                <MaterialCommunityIcons
                  name={method.icon as any}
                  size={22}
                  color="#001F54"
                />
              )}

              {/* Text */}
              <Text style={styles.methodText}>{method.name}</Text>
            </TouchableOpacity>
          ))}

          {/* Cancel */}
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
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
    marginBottom: 16,
  },

  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#001F54",
    marginTop: 8,
  },

  subtitle: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },

  methodButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#F5F7FA",
    marginVertical: 5,
  },

  methodText: {
    marginLeft: 10,
    fontSize: 15,
    fontWeight: "600",
    color: "#001F54",
  },

  cancelButton: {
    marginTop: 12,
    alignItems: "center",
    paddingVertical: 10,
  },

  cancelText: {
    color: "#001F54",
    fontSize: 16,
    fontWeight: "bold",
  },
});
