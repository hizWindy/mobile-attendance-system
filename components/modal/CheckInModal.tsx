import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View, useColorScheme, StyleSheet, ScrollView, TouchableWithoutFeedback } from "react-native";

interface CheckInModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectType: (type: string) => void;
}

const METHODS = [
  { name: "Biometric", icon: "fingerprint", type: "MaterialCommunityIcons" },
  { name: "Fingerprint", icon: "fingerprint", type: "MaterialCommunityIcons" },
  { name: "Facial Recognition", icon: "face-recognition", type: "MaterialCommunityIcons" },
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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const iconColor = isDark ? "#93C5FD" : "#001F54";

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={StyleSheet.absoluteFill} />
      </TouchableWithoutFeedback>

      <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
        {/* Sticky Header with Close */}
        <View style={[styles.stickyHeader, isDark && styles.stickyHeaderDark]}>
          <Text style={[styles.title, isDark && styles.titleDark]}>Check In Method</Text>
          <TouchableOpacity onPress={onClose} style={[styles.closeIconWrapper, isDark && styles.closeIconWrapperDark]}>
            <Ionicons name="close" size={20} color={isDark ? "#94a3b8" : "#64748b"} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.subtitle, isDark && styles.subtitleDark]}>Select how you want to mark your attendance</Text>
          
          <View style={styles.methodsContainer}>
            {METHODS.map((method) => (
              <TouchableOpacity
                key={method.name}
                style={[styles.methodButton, isDark && styles.methodButtonDark]}
                activeOpacity={0.8}
                onPress={() => {
                  onSelectType(method.name);
                  onClose();
                }}
              >
                {method.type === "Ionicons" ? (
                  <Ionicons name={method.icon as any} size={22} color={iconColor} />
                ) : (
                  <MaterialCommunityIcons name={method.icon as any} size={22} color={iconColor} />
                )}
                <Text style={[styles.methodText, isDark && styles.methodTextDark]}>{method.name}</Text>
                <Ionicons name="chevron-forward" size={18} color={isDark ? "#475569" : "#cbd5e1"} style={{ marginLeft: "auto" }} />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
    elevation: 100,
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '85%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  modalContentDark: {
    backgroundColor: '#1e293b',
  },
  stickyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  stickyHeaderDark: {
    borderBottomColor: '#334155',
    backgroundColor: '#1e293b',
  },
  closeIconWrapper: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  closeIconWrapperDark: {
    backgroundColor: '#334155',
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  titleDark: {
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  subtitleDark: {
    color: '#94a3b8',
  },
  methodsContainer: {
    gap: 8,
  },
  methodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  methodButtonDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  methodText: {
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  methodTextDark: {
    color: '#e2e8f0',
  }
});
