import React, { useState } from "react";
import {
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface CreateSessionModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (sessionCode: string) => void;
}

export const CreateSessionModal: React.FC<CreateSessionModalProps> = ({
  visible,
  onClose,
  onCreate,
}) => {
  const [sessionName, setSessionName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [sessionType, setSessionType] = useState<"On-site" | "Remote">(
    "On-site",
  );
  const [location, setLocation] = useState("");

  const handleGenerate = () => {
    const code = Math.random().toString(36).substr(2, 6).toUpperCase();
    onCreate(code);
    setSessionName("");
    setDate("");
    setTime("");
    setLocation("");
    setSessionType("On-site");
    onClose();
  };

  const screenWidth = Dimensions.get("window").width;

  return (
    <Modal transparent visible={visible} animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.container, { width: screenWidth * 0.9 }]}>
          <Text style={styles.title}>Create Session</Text>

          <Text style={styles.label}>Session Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Advanced Mathematics Q1"
            value={sessionName}
            onChangeText={setSessionName}
          />

          <View style={styles.row}>
            <View style={styles.halfInputContainer}>
              <Text style={styles.label}>Date</Text>
              <TextInput
                style={styles.input}
                placeholder="mm/dd/yyyy"
                value={date}
                onChangeText={setDate}
              />
            </View>
            <View style={styles.halfInputContainer}>
              <Text style={styles.label}>Time</Text>
              <TextInput
                style={styles.input}
                placeholder="--:-- --"
                value={time}
                onChangeText={setTime}
              />
            </View>
          </View>

          <Text style={styles.label}>Session Type</Text>
          <View style={styles.segmented}>
            {(["On-site", "Remote"] as const).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.segmentButton,
                  sessionType === type && styles.segmentButtonActive,
                ]}
                onPress={() => setSessionType(type)}
              >
                <Text
                  style={
                    sessionType === type
                      ? styles.segmentTextActive
                      : styles.segmentText
                  }
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Location</Text>
          <TextInput
            style={styles.input}
            placeholder="Room Number or Building Name"
            value={location}
            onChangeText={setLocation}
          />

          <Text style={[styles.label, { marginTop: 14 }]}>
            Attendance Method
          </Text>
          <View style={styles.methodList}>
            {[
              "Entry Code",
              "QR Code Scan",
              "Geolocation",
              "RFID / NFC Card",
            ].map((method) => (
              <View key={method} style={styles.methodRow}>
                <Text>{method}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.generateButton}
            onPress={handleGenerate}
          >
            <Text style={styles.generateText}>Generate Session</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
  },
  label: {
    marginTop: 6,
    marginBottom: 4,
    color: "#555",
    fontWeight: "600",
  },
  input: {
    width: "100%",
    height: 42,
    borderWidth: 1,
    borderColor: "#d7dae2",
    borderRadius: 10,
    paddingHorizontal: 10,
    backgroundColor: "#fdfdff",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  halfInputContainer: {
    flex: 1,
  },
  segmented: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#c8d4e8",
    overflow: "hidden",
    marginTop: 4,
  },
  segmentButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    backgroundColor: "#f7f9fe",
  },
  segmentButtonActive: {
    backgroundColor: "#eaf1ff",
  },
  segmentText: {
    fontWeight: "600",
    color: "#1d4378",
  },
  segmentTextActive: {
    color: "#1f4d7a",
    fontWeight: "700",
  },
  methodList: {
    marginTop: 6,
    backgroundColor: "#f8faff",
    borderRadius: 10,
    padding: 8,
  },
  methodRow: {
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#fff",
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#dfe6f2",
  },
  generateButton: {
    marginTop: 12,
    backgroundColor: "#2c7eff",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  generateText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  closeButton: {
    marginTop: 8,
    alignItems: "center",
  },
  closeText: {
    color: "#1f4d7a",
    fontWeight: "700",
  },
});
