import { SessionJoinData } from "@/api/AttendanceService";
import { QRScannerModal, QRScanResult } from "@/components/modal/QRScannerModal";
import { LocationContext } from "@/context/LocationContext";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useContext } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, useColorScheme, View } from "react-native";

interface CheckInModalProps {
  visible: boolean;
  session: SessionJoinData | null;
  /** Identifies if the user is entering check-in or check-out flow */
  actionType?: "check-in" | "check-out";
  onClose: () => void;
  onSelectType: (type: string, actionType: "check-in" | "check-out") => void;
  /** Called when QR scanner completes with qr data + GPS coords */
  onQRScan?: (result: QRScanResult, actionType: "check-in" | "check-out") => void;
}

// Maps backend method keys to human-readable display names and icons.
// ✅ Do NOT rename backend keys — all transformations happen here.
// Names are now functions that accept the actionType to produce dynamic labels.
const METHODS: Record<string, { 
  name: (action: "check-in" | "check-out") => string; 
  icon: string; 
  type: "Ionicons" | "MaterialCommunityIcons" 
}> = {
  manual:           { name: (a) => a === "check-in" ? "Manual Check-in"    : "Manual Check-out",    icon: "pencil-outline",            type: "MaterialCommunityIcons" },
  "manual click":   { name: (a) => a === "check-in" ? "Manual Check-in"    : "Manual Check-out",    icon: "pencil-outline",            type: "MaterialCommunityIcons" }, // Legacy alias
  qr:               { name: (a) => a === "check-in" ? "QR Check-in"        : "QR Check-out",        icon: "qr-code-outline",           type: "Ionicons" },
  "qr based":       { name: (a) => a === "check-in" ? "QR Check-in"        : "QR Check-out",        icon: "qr-code-outline",           type: "Ionicons" }, // Legacy alias
  geofencing:       { name: (a) => a === "check-in" ? "Location Check-in"  : "Location Check-out",  icon: "map-marker-radius-outline", type: "MaterialCommunityIcons" },
  geolocation:      { name: (a) => a === "check-in" ? "Location Check-in"  : "Location Check-out",  icon: "map-marker-radius-outline", type: "MaterialCommunityIcons" }, // Alias
  "location check": { name: (a) => a === "check-in" ? "Location Check-in"  : "Location Check-out",  icon: "map-marker-radius-outline", type: "MaterialCommunityIcons" }, // Legacy alias
  rfid:             { name: (_) => "RFID Tap",                                                      icon: "nfc-tap",                   type: "MaterialCommunityIcons" },
  nfc:              { name: (_) => "NFC Tap",                                                       icon: "nfc-tap",                   type: "MaterialCommunityIcons" },
  biometric:        { name: (_) => "Biometric",                                                     icon: "fingerprint",               type: "MaterialCommunityIcons" },
  fingerprint:      { name: (_) => "Fingerprint",                                                   icon: "fingerprint",               type: "MaterialCommunityIcons" },
  face:             { name: (_) => "Facial Recognition",                                            icon: "face-recognition",         type: "MaterialCommunityIcons" },
  "facial recognition": { name: (_) => "Facial Recognition",                                       icon: "face-recognition",         type: "MaterialCommunityIcons" }, // Legacy alias
};

const STATUS_CONFIG: Record<string, { label: string; accentColor: string; bgColor: string }> = {
  active: { label: "Active Now", accentColor: "#0D9488", bgColor: "#F0FDFA" },
  upcoming: { label: "Starts Soon", accentColor: "#3B82F6", bgColor: "#EFF6FF" },
  past: { label: "Ended", accentColor: "#64748B", bgColor: "#F8FAFC" },
};

export const CheckInModal: React.FC<CheckInModalProps> = ({
  visible,
  session,
  actionType = "check-in",
  onClose,
  onSelectType,
  onQRScan,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const iconColor = isDark ? "#93C5FD" : "#0D9488";
  const [qrScannerVisible, setQrScannerVisible] = React.useState(false);

  const { location, address, loading: locationLoading, errorMsg: locationError, refreshLocation } = useContext(LocationContext);
  const [selectedMethod, setSelectedMethod] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!visible) {
      setSelectedMethod(null);
    }
  }, [visible]);

  if (!visible || !session) return null;

  // Data comes directly from the /join API response — no client-side computation needed
  const isActive = session.is_active;
  const cfg = STATUS_CONFIG[session.status] || STATUS_CONFIG["upcoming"];

  // Maps legacy/alias keys to their canonical backend values.
  // This ensures we always send the correct value regardless of what the backend stores.
  const CANONICAL_KEY_MAP: Record<string, string> = {
    "manual click": "manual",
    "qr based":     "qr",
    "location check": "geofencing",
    "facial recognition": "face",
  };

  // Build display list while preserving the backend key used for the API call.
  // Alias keys are normalized to their canonical backend value here.
  const allowedMethods = session.allowed_methods
    .map((m) => {
      const rawKey = m.toLowerCase();
      const canonicalKey = CANONICAL_KEY_MAP[rawKey] ?? rawKey;
      const display = METHODS[canonicalKey] ?? METHODS[rawKey];
      // Resolve name dynamically based on current actionType
      return display ? { key: canonicalKey, name: display.name(actionType), icon: display.icon, type: display.type } : null;
    })
    .filter(Boolean) as Array<{ key: string; name: string; icon: string; type: "Ionicons" | "MaterialCommunityIcons" }>;

  return (
    <View style={styles.overlay}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={StyleSheet.absoluteFill} />
      </TouchableWithoutFeedback>

      <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
        {/* Sticky Header with Close */}
        <View style={[styles.stickyHeader, isDark && styles.stickyHeaderDark]}>
          <Text style={[styles.title, isDark && styles.titleDark]}>Session Preview</Text>
          <TouchableOpacity onPress={onClose} style={[styles.closeIconWrapper, isDark && styles.closeIconWrapperDark]}>
            <Ionicons name="close" size={20} color={isDark ? "#94a3b8" : "#64748b"} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* ── Preview Card ── */}
          <View style={[styles.previewCard, isDark && styles.previewCardDark]}>
            {/* Status Pill */}
            <View style={{ flexDirection: "row", marginBottom: 12 }}>
              <View style={[styles.statusPill, { backgroundColor: cfg.bgColor }]}>
                <Text style={{ fontSize: 11, fontWeight: "800", color: cfg.accentColor, textTransform: "uppercase" }}>
                  {cfg.label}
                </Text>
              </View> 
            </View>

            <Text style={[styles.sessionTitle, isDark && styles.sessionTitleDark]}>{session.session_name}</Text>
            
            {/* Location & Platform Info */}
            {(() => {
              // Legacy string fallback
              if (typeof session.location === "string") {
                return (
                  <View style={styles.previewInfoRow}>
                    <Ionicons name="location-outline" size={16} color={isDark ? "#94A3B8" : "#64748B"} />
                    <Text style={[styles.previewInfoText, isDark && styles.previewInfoTextDark]} numberOfLines={2}>
                      {session.location}
                    </Text>
                  </View>
                );
              }

              // Parsed JSON object handling based on session_setup
              const loc = session.location || {};
              const setup = (session.session_setup || "").toLowerCase().replace("-", "_");
              const isRemote = setup === "remote" || setup === "hybrid";
              const isOnSite = setup === "on_site" || setup === "hybrid" || setup === "onsite";

              return (
                <>
                  {isRemote && (loc.platform || loc.link) && (
                    <View style={styles.previewInfoRow}>
                      <Ionicons name="laptop-outline" size={16} color={isDark ? "#94A3B8" : "#64748B"} />
                      <Text style={[styles.previewInfoText, isDark && styles.previewInfoTextDark]} numberOfLines={2}>
                        {loc.platform ? `${loc.platform}` : "Remote"}
                        {loc.link ? ` • ${loc.link}` : ""}
                      </Text>
                    </View>
                  )}
                  {isOnSite && (loc.address || (loc.latitude && loc.longitude)) && (
                    <View style={styles.previewInfoRow}>
                      <Ionicons name="location-outline" size={16} color={isDark ? "#94A3B8" : "#64748B"} />
                      <Text style={[styles.previewInfoText, isDark && styles.previewInfoTextDark]} numberOfLines={2}>
                        {loc.address || `Lat: ${loc.latitude}, Lon: ${loc.longitude}`}
                      </Text>
                    </View>
                  )}
                </>
              );
            })()}

            <View style={styles.previewInfoRow}>
              <Ionicons
                name={isActive ? "radio-button-on-outline" : "time-outline"}
                size={16}
                color={isActive ? "#0D9488" : (isDark ? "#94A3B8" : "#64748B")}
              />
              <Text style={[styles.previewInfoText, isDark && styles.previewInfoTextDark, isActive && { color: "#0D9488", fontWeight: "700" }]}>
                {isActive ? "Session is currently active" : "Session has not started yet"}
              </Text>
            </View>
          </View>


          {/* ── Check-In Options (ONLY IF ACTIVE) ── */}
          {isActive ? (
            <>
              <Text style={[styles.subtitle, isDark && styles.subtitleDark]}>
                {actionType === "check-in" 
                  ? "Select an allowed method to mark your attendance" 
                  : "Select an allowed method to complete your check-out"}
              </Text>
              
              <View style={styles.methodsContainer}>
                {allowedMethods.length === 0 ? (
                   <Text style={{ color: "#EF4444", fontWeight: "600", fontSize: 13, padding: 10 }}>
                     No check-in methods allowed by supervisor.
                   </Text>
                ) : (
                  allowedMethods.map((method) => {
                    const isSelected = selectedMethod === method.key;
                    const isQR = method.key === "qr" || method.key === "qr based";
                    return (
                      <TouchableOpacity
                        key={method.key}
                        style={[
                          styles.methodButton,
                          isDark && styles.methodButtonDark,
                          isSelected && { borderColor: iconColor, backgroundColor: isDark ? "#1E293B" : "#F0FDFA" }
                        ]}
                        activeOpacity={0.8}
                        onPress={() => {
                          if (isQR && onQRScan) {
                            // QR method: skip confirm step, open scanner immediately
                            setQrScannerVisible(true);
                          } else {
                            setSelectedMethod(isSelected ? null : method.key);
                          }
                        }}
                      >
                        {method.type === "Ionicons" ? (
                          <Ionicons name={method.icon as any} size={22} color={iconColor} />
                        ) : (
                          <MaterialCommunityIcons name={method.icon as any} size={22} color={iconColor} />
                        )}
                        <Text style={[styles.methodText, isDark && styles.methodTextDark, isSelected && { color: iconColor }]}>{method.name}</Text>
                        
                        {isSelected ? (
                          <Ionicons name="checkmark-circle" size={20} color={iconColor} style={{ marginLeft: "auto" }} />
                        ) : (
                          <Ionicons name="chevron-forward" size={18} color={isDark ? "#475569" : "#cbd5e1"} style={{ marginLeft: "auto" }} />
                        )}
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>

              {/* Location handling is fully automatic and implicit (Backend Payload included automatically) */}

              {/* ── Confirm Button ── */}
              <View style={{ marginTop: 24 }}>
                <TouchableOpacity
                  style={[
                    styles.confirmButton, 
                    { backgroundColor: iconColor },
                    (!selectedMethod || !location) && { opacity: 0.5 }
                  ]}
                  activeOpacity={0.9}
                  disabled={!selectedMethod || !location}
                  onPress={() => {
                    if (selectedMethod && location) {
                      onSelectType(selectedMethod, actionType);
                      onClose();
                    }
                  }}
                >
                  <Text style={styles.confirmButtonText}>
                    Confirm {actionType === "check-in" ? "Check-in" : "Check-out"}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={[styles.inactiveWarning, isDark && styles.inactiveWarningDark]}>
               <Ionicons name="alert-circle-outline" size={24} color={cfg.accentColor} />
               <Text style={[styles.inactiveWarningText, { color: cfg.accentColor }]}>
                 Check-in is only available when the session is currently active.
               </Text>
            </View>
          )}

        </ScrollView>
      </View>

      {/* QR Scanner — full screen, launched directly when QR method is tapped */}
      <QRScannerModal
        visible={qrScannerVisible}
        actionType={actionType}
        sessionName={session?.session_name}
        onScanned={(result) => {
          setQrScannerVisible(false);
          onQRScan?.(result, actionType);
        }}
        onClose={() => setQrScannerVisible(false)}
      />
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
  
  // Preview Card
  previewCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  previewCardDark: {
    backgroundColor: "#0F172A",
    borderColor: "#1E293B"
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sessionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 10,
  },
  sessionTitleDark: {
    color: "#FFFFFF",
  },
  previewInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  previewInfoText: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "500",
  },
  previewInfoTextDark: {
    color: "#94A3B8"
  },

  // Subtitle
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: "600",
    marginBottom: 12,
  },
  subtitleDark: {
    color: '#94a3b8',
  },

  // Methods
  methodsContainer: {
    gap: 12,
  },
  confirmButton: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
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
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  methodTextDark: {
    color: '#e2e8f0',
  },

  // Warning
  inactiveWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
  },
  inactiveWarningDark: {
    backgroundColor: "#1E293B",
  },
  inactiveWarningText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  locationHelperText: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 4,
    marginBottom: 10,
  },
  locationHelperTextDark: {
    color: "#64748B",
  },
  locationAddressText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 4,
  },
  locationAddressTextDark: {
    color: "#F1F5F9",
  },
});
