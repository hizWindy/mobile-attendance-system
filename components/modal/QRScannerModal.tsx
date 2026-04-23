// /components/modal/QRScannerModal.tsx
//
// Full-screen QR scanner for attendance check-in/check-out.
// Opens camera immediately, scans QR, captures GPS, then fires onScanned.

import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export interface QRScanResult {
  qrData: string;
  latitude: number;
  longitude: number;
}

interface QRScannerModalProps {
  visible: boolean;
  actionType?: "check-in" | "check-out";
  sessionName?: string;
  onScanned: (result: QRScanResult) => void;
  onClose: () => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  visible,
  actionType = "check-in",
  sessionName,
  onScanned,
  onClose,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [processing, setProcessing] = useState(false);
  const scannedRef = useRef(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation on the scan frame
  React.useEffect(() => {
    if (!visible) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [visible]);

  // Reset state each time modal opens
  React.useEffect(() => {
    if (visible) {
      scannedRef.current = false;
      setScanning(true);
      setProcessing(false);
    }
  }, [visible]);

  const handleBarCodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      if (scannedRef.current || !scanning) return;
      scannedRef.current = true;
      setScanning(false);
      setProcessing(true);
      
      console.log(`\n\n[QR Scanner] Scanned QR Token detected: ${data}\n\n`);

      try {
        // Get GPS coordinates immediately after scan
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Location Required",
            "Location access is needed to verify your attendance.",
            [{ text: "OK", onPress: onClose }]
          );
          return;
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        onScanned({
          qrData: data,
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      } catch (err) {
        console.error("QR scan GPS error:", err);
        Alert.alert("Location Error", "Unable to get your location. Please try again.", [
          { text: "Retry", onPress: () => { scannedRef.current = false; setScanning(true); setProcessing(false); } },
          { text: "Cancel", style: "cancel", onPress: onClose },
        ]);
      } finally {
        setProcessing(false);
      }
    },
    [scanning, onScanned, onClose]
  );

  if (!visible) return null;

  // ── Permission not determined yet ──────────────────────────────────────────
  if (!permission) {
    return (
      <Modal visible transparent animationType="fade">
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </Modal>
    );
  }

  // ── Permission denied ──────────────────────────────────────────────────────
  if (!permission.granted) {
    return (
      <Modal visible transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.permissionSheet}>
          <View style={styles.permissionCard}>
            <View style={styles.permBadge}>
              <Ionicons name="camera-outline" size={32} color="#3B82F6" />
            </View>
            <Text style={styles.permTitle}>Camera Access Required</Text>
            <Text style={styles.permSub}>
              To scan the session QR code for attendance, please allow camera access.
            </Text>
            <TouchableOpacity style={styles.permBtn} onPress={requestPermission} activeOpacity={0.85}>
              <Text style={styles.permBtnText}>Allow Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.permCancel} onPress={onClose}>
              <Text style={styles.permCancelText}>Not Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // ── QR Scanner ─────────────────────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.container}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={scanning ? handleBarCodeScanned : undefined}
        />

        {/* Dark overlay with transparent cutout */}
        <View style={styles.overlay}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 12, left: 12, bottom: 12, right: 12 }}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={styles.topCenter}>
              <Text style={styles.topTitle}>
                {actionType === "check-in" ? "Scan to Check In" : "Scan to Check Out"}
              </Text>
              {sessionName ? (
                <Text style={styles.topSub} numberOfLines={1}>{sessionName}</Text>
              ) : null}
            </View>
            <View style={{ width: 40 }} />
          </View>

          {/* Scan frame */}
          <View style={styles.frameRow}>
            <View style={styles.frameSide} />
            <View style={styles.frameCenter}>
              <Animated.View style={[styles.scanFrame, { transform: [{ scale: pulseAnim }] }]}>
                {/* Corner decorations */}
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />

                {processing ? (
                  <View style={styles.processingBox}>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={styles.processingText}>Getting location…</Text>
                  </View>
                ) : null}
              </Animated.View>
            </View>
            <View style={styles.frameSide} />
          </View>

          {/* Bottom info */}
          <View style={styles.bottomBar}>
            <Ionicons name="scan-outline" size={18} color="rgba(255,255,255,0.7)" />
            <Text style={styles.hint}>
              {processing
                ? "Please wait…"
                : "Align the session QR code within the frame"}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ── Styles ──────────────────────────────────────────────────────────────────
const FRAME_SIZE = 240;
const CORNER_SIZE = 28;
const CORNER_THICKNESS = 4;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  centered: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },

  // Permission sheet
  permissionSheet: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  permissionCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 32,
    alignItems: "center",
  },
  permBadge: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: "#EFF6FF",
    justifyContent: "center", alignItems: "center",
    marginBottom: 16,
  },
  permTitle: { fontSize: 20, fontWeight: "800", color: "#0F172A", marginBottom: 8 },
  permSub: { fontSize: 14, color: "#64748B", textAlign: "center", lineHeight: 20, marginBottom: 24 },
  permBtn: {
    width: "100%", paddingVertical: 15,
    backgroundColor: "#3B82F6", borderRadius: 14,
    alignItems: "center", marginBottom: 10,
  },
  permBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  permCancel: { paddingVertical: 10 },
  permCancelText: { fontSize: 14, color: "#94A3B8", fontWeight: "600" },

  // Scanner overlay
  overlay: { flex: 1, flexDirection: "column" },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  closeBtn: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center", alignItems: "center",
  },
  topCenter: { flex: 1, alignItems: "center" },
  topTitle: { fontSize: 17, fontWeight: "800", color: "#fff", letterSpacing: -0.3 },
  topSub: { fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 2 },

  frameRow: { flex: 1, flexDirection: "row" },
  frameSide: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  frameCenter: {
    width: FRAME_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },

  scanFrame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },

  corner: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: "#3B82F6",
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS, borderTopLeftRadius: 6 },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS, borderTopRightRadius: 6 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS, borderBottomRightRadius: 6 },

  processingBox: { alignItems: "center", gap: 10 },
  processingText: { color: "#fff", fontSize: 13, fontWeight: "600" },

  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  hint: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
});
