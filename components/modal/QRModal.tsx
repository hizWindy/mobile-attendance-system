// /components/modal/QRModal.tsx
//
// Reusable QR code viewer modal.
// Uses the free api.qrserver.com service to render a QR code image —
// no extra native dependencies required (works with standard RN Image).

import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useColorScheme,
  View,
} from "react-native";
import AttendanceService from "../../api/AttendanceService";
import { QrConfig } from "../../types/SessionTypes";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const QR_SIZE = Math.min(SCREEN_WIDTH * 0.62, 240);

interface QRModalProps {
  visible: boolean;
  qrPayload: string | null | undefined;
  sessionName?: string;
  sessionCode?: string;
  sessionId?: number;
  qrConfig?: QrConfig;
  isActive?: boolean;
  onClose: () => void;
}

/**
 * Converts any qr_payload value to a flat string suitable for encoding.
 * If the payload is an object (JSON), we stringify it.
 */
function resolvePayloadString(payload: any): string {
  if (!payload) return "";
  if (typeof payload === "string") return payload;
  try {
    return JSON.stringify(payload);
  } catch {
    return String(payload);
  }
}

export const QRModal: React.FC<QRModalProps> = ({
  visible,
  qrPayload,
  sessionName,
  sessionCode,
  sessionId,
  qrConfig,
  isActive = true,
  onClose,
}) => {
  const isDark = useColorScheme() === "dark";
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Refresh state
  const [currentQrPayload, setCurrentQrPayload] = useState<string | null | undefined>(qrPayload);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(qrConfig?.last_refreshed_at ?? null);
  const [cooldown, setCooldown] = useState<number>(0);

  // Sync initial payload
  useEffect(() => {
    if (visible) {
      setCurrentQrPayload(qrPayload);
      setLastRefreshedAt(qrConfig?.last_refreshed_at ?? null);
      setImageLoaded(false);
      setImageError(false);
      setIsDownloading(false);
    }
  }, [visible, qrPayload, qrConfig]);

  // Handle Cooldown Timer
  useEffect(() => {
    if (!visible || qrConfig?.qr_mode !== "rotating") {
      setCooldown(0);
      return;
    }

    const interval = qrConfig?.refresh_interval_secs || 0;
    
    // Evaluate immediately
    const updateCooldown = () => {
      if (!lastRefreshedAt || interval <= 0) {
        setCooldown(0);
        return;
      }
      const now = Math.floor(Date.now() / 1000);
      const passed = now - lastRefreshedAt;
      const remaining = Math.max(0, interval - passed);
      setCooldown(remaining);
    };

    updateCooldown();
    const timerId = setInterval(updateCooldown, 1000);
    return () => clearInterval(timerId);
  }, [visible, lastRefreshedAt, qrConfig]);

  // Handle Manual Refresh
  const handleRefresh = useCallback(async () => {
    if (!sessionId || isRefreshing) return;
    setIsRefreshing(true);
    try {
      const data = await AttendanceService.refreshQr(sessionId);
      if (data.qr_payload) {
        setCurrentQrPayload(data.qr_payload);
        setLastRefreshedAt(Math.floor(Date.now() / 1000));
        setImageLoaded(false); // trigger loading spin for new image
      }
    } catch (err) {
      console.warn("Failed to refresh QR code:", err);
      Alert.alert("Refresh Failed", "Could not generate a new QR code. Check connection.");
    } finally {
      setIsRefreshing(false);
    }
  }, [sessionId, isRefreshing]);

  const payloadStr = resolvePayloadString(currentQrPayload);

  // Build the QR image URL from the free qrserver.com API — higher res for saving
  const qrImageUri = payloadStr
    ? `https://api.qrserver.com/v1/create-qr-code/?size=500x500&qzone=2&data=${encodeURIComponent(payloadStr)}`
    : null;

  // ── Download Handler ───────────────────────────────────────────────────────
  const handleDownload = async () => {
    if (!qrImageUri || isDownloading) return;

    setIsDownloading(true);

    try {
      // Try native gallery save (only works in a development build, not Expo Go)
      const { status } = await MediaLibrary.requestPermissionsAsync(false, ["photo"]);
      if (status === "granted") {
        const fileUri = FileSystem.documentDirectory + `${sessionCode || "session"}_qr.png`;
        const { uri } = await FileSystem.downloadAsync(qrImageUri, fileUri);
        await MediaLibrary.saveToLibraryAsync(uri);
        Alert.alert("Saved!", "QR Code saved to your photo gallery.");
        setIsDownloading(false);
        return;
      }
    } catch {
      // Expo Go blocks MediaLibrary — fall through to browser
    }

    setIsDownloading(false);

    // Seamless fallback: open QR image directly in browser
    // User can long-press → "Save image" to store it locally
    Linking.openURL(qrImageUri);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.sheet, isDark && styles.sheetDark]}>

              {/* Top action bar: download (left) + close (right) */}
              <View style={styles.topBar}>
                {/* Download icon — minimal, top-left */}
                <View style={{ flexDirection: "row", gap: 8, flex: 1 }}>
                  {qrImageUri && (
                    <TouchableOpacity
                      style={[styles.iconBtn, isDark && styles.iconBtnDark]}
                      onPress={handleDownload}
                      disabled={isDownloading}
                      hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
                    >
                      <Ionicons
                        name={isDownloading ? "cloud-download-outline" : "download-outline"}
                        size={18}
                        color={isDownloading ? "#94A3B8" : (isDark ? "#60A5FA" : "#3B82F6")}
                      />
                    </TouchableOpacity>
                  )}

                  {/* Show Refresh Button ONLY on active rotating sessions */}
                  {isActive && qrConfig?.qr_mode === "rotating" && (
                    <TouchableOpacity
                      style={[
                        styles.iconBtn,
                        { paddingHorizontal: 12, width: "auto" },
                        isDark && styles.iconBtnDark,
                        cooldown > 0 && { opacity: 0.5 }
                      ]}
                      onPress={handleRefresh}
                      disabled={isRefreshing || cooldown > 0}
                    >
                      {isRefreshing ? (
                        <ActivityIndicator size="small" color={isDark ? "#60A5FA" : "#3B82F6"} />
                      ) : (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Ionicons
                            name="refresh-outline"
                            size={16}
                            color={isDark ? "#10B981" : "#059669"}
                          />
                          <Text style={{ fontSize: 13, fontWeight: "600", color: isDark ? "#10B981" : "#059669" }}>
                            {cooldown > 0 ? `Refresh in ${cooldown}s` : "Refresh QR"}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  )}
                </View>

                {/* Close icon — top-right */}
                <TouchableOpacity
                  style={[styles.iconBtn, isDark && styles.iconBtnDark, styles.closeBtn]}
                  onPress={onClose}
                  hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
                >
                  <Ionicons name="close" size={18} color={isDark ? "#94A3B8" : "#64748B"} />
                </TouchableOpacity>
              </View>

              {/* Header */}
              <View style={styles.header}>
                <View style={[styles.iconBadge, isDark && styles.iconBadgeDark]}>
                  <Ionicons name="qr-code-outline" size={24} color={isDark ? "#60A5FA" : "#3B82F6"} />
                </View>
                <Text style={[styles.title, isDark && styles.titleDark]}>Session QR Code</Text>
                {sessionName ? (
                  <Text style={[styles.subtitle, isDark && styles.subtitleDark]} numberOfLines={2}>
                    {sessionName}
                  </Text>
                ) : null}
              </View>

              {/* QR Code image */}
              <View style={[styles.qrContainer, isDark && styles.qrContainerDark]}>
                {!qrImageUri ? (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
                    <Text style={styles.errorText}>Invalid QR payload</Text>
                  </View>
                ) : imageError ? (
                  <View style={styles.errorBox}>
                    <Ionicons name="wifi-outline" size={40} color="#EF4444" />
                    <Text style={styles.errorText}>Failed to load QR code.{"\n"}Check your connection.</Text>
                  </View>
                ) : (
                  <>
                    {!imageLoaded && (
                      <ActivityIndicator
                        size="large"
                        color="#3B82F6"
                        style={StyleSheet.absoluteFillObject}
                      />
                    )}
                    <View style={{ width: QR_SIZE, height: QR_SIZE, justifyContent: "center", alignItems: "center" }}>
                      <Image
                        source={{ uri: qrImageUri }}
                        style={[
                          styles.qrImage,
                          { width: QR_SIZE, height: QR_SIZE },
                          !isActive && { opacity: 0.15 }
                        ]}
                        resizeMode="contain"
                        onLoad={() => setImageLoaded(true)}
                        onError={() => setImageError(true)}
                        blurRadius={!isActive ? 15 : 0}
                      />
                      {!isActive && (
                        <View style={[StyleSheet.absoluteFillObject, { justifyContent: "center", alignItems: "center", padding: 12, backgroundColor: isDark ? "rgba(30,41,59,0.4)" : "rgba(255,255,255,0.4)" }]}>
                          <Ionicons name="time-outline" size={32} color={isDark ? "#CBD5E1" : "#475569"} style={{ marginBottom: 10 }} />
                          <Text style={{ textAlign: "center", fontWeight: "700", color: isDark ? "#CBD5E1" : "#475569", fontSize: 13, lineHeight: 18 }}>
                            Session is still inactive or has ended. Please wait.
                          </Text>
                        </View>
                      )}
                    </View>
                  </>
                )}
              </View>

              {/* Instruction label */}
              <View style={styles.instructionRow}>
                <Ionicons name="information-circle-outline" size={15} color={isDark ? "#64748B" : "#94A3B8"} />
                <Text style={[styles.instruction, isDark && styles.instructionDark]}>
                  Present this QR code for attendance verification
                </Text>
              </View>

              {/* Dismiss button */}
              <TouchableOpacity
                style={[styles.dismissBtn, isDark && styles.dismissBtnDark]}
                onPress={onClose}
                activeOpacity={0.85}
              >
                <Text style={[styles.dismissText, isDark && styles.dismissTextDark]}>Done</Text>
              </TouchableOpacity>

            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  sheet: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
    position: "relative",
  },
  sheetDark: {
    backgroundColor: "#1E293B",
  },
  // ── Top action bar ──────────────────────────────────────────────────────────
  topBar: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(100,116,139,0.10)",
    justifyContent: "center",
    alignItems: "center",
  },
  iconBtnDark: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  closeBtn: {
    // no extra overrides needed — lives at the right end of topBar
  },
  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  iconBadgeDark: {
    backgroundColor: "#1E3A5F",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  titleDark: {
    color: "#F1F5F9",
  },
  subtitle: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    fontWeight: "500",
  },
  subtitleDark: {
    color: "#94A3B8",
  },
  // ── QR image ────────────────────────────────────────────────────────────────
  qrContainer: {
    width: QR_SIZE + 24,
    height: QR_SIZE + 24,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  qrContainerDark: {
    backgroundColor: "#FFFFFF", // keep white so QR stays readable in dark mode
    borderColor: "#334155",
  },
  qrImage: {
    borderRadius: 8,
  },
  errorBox: {
    alignItems: "center",
    gap: 8,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  // ── Instruction ─────────────────────────────────────────────────────────────
  instructionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  instruction: {
    fontSize: 12,
    color: "#94A3B8",
    flex: 1,
    fontWeight: "500",
    lineHeight: 16,
  },
  instructionDark: {
    color: "#64748B",
  },
  // ── Dismiss ─────────────────────────────────────────────────────────────────
  dismissBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
  },
  dismissBtnDark: {
    backgroundColor: "#334155",
  },
  dismissText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#475569",
  },
  dismissTextDark: {
    color: "#CBD5E1",
  },
});
