/**
 * GeofenceMapModal.tsx
 *
 * Supervisor-only modal that renders a full-screen MapView showing:
 *  • The session venue pinned at the centre
 *  • A translucent Circle overlay representing the configured geofence radius
 *  • A bottom-sheet info card with venue details and radius
 *
 * All data comes directly from the existing BackendSession.location object —
 * no new backend routes are required.
 */

import { SessionLocation } from "@/types/SessionTypes";
import AttendanceService, { AttendeeLocation } from "@/api/AttendanceService";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import MapView, { Circle, Marker, PROVIDER_DEFAULT } from "react-native-maps";

// ── Constants ──────────────────────────────────────────────────────────────────
const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get("window");

const GEOFENCE_COLOR  = "rgba(59, 130, 246, 0.18)"; // Trust Blue fill
const GEOFENCE_STROKE = "rgba(59, 130, 246, 0.70)"; // Trust Blue border
const VENUE_COLOR     = "#3B82F6";

const MAP_STYLES = {
  light: [],
  dark: [
    { elementType: "geometry",            stylers: [{ color: "#1a2236" }] },
    { elementType: "labels.text.stroke",  stylers: [{ color: "#0a0f1e" }] },
    { elementType: "labels.text.fill",    stylers: [{ color: "#94a3b8" }] },
    { featureType: "road",                elementType: "geometry",        stylers: [{ color: "#243047" }] },
    { featureType: "water",               elementType: "geometry",        stylers: [{ color: "#0d1b2a" }] },
    { featureType: "poi",                 elementType: "geometry",        stylers: [{ color: "#1e293b" }] },
  ],
} as const;

// ── Helpers ────────────────────────────────────────────────────────────────────
/** Convert metres to a readable string, e.g. "250 m", "1.2 km" */
function fmtRadius(m: number): string {
  if (m < 1000) return `${m} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

/** Compute the map delta so the circle fits with padding. */
function deltaForRadius(radiusM: number): number {
  // 1 degree latitude ≈ 111 km; multiply by 3 for comfortable padding
  return (radiusM / 111_000) * 3;
}

// ── Props ──────────────────────────────────────────────────────────────────────
interface GeofenceMapModalProps {
  visible: boolean;
  onClose: () => void;
  sessionName: string;
  location: SessionLocation;
  sessionId?: number;
  isDark?: boolean;
  checkInCoord?: { latitude: number; longitude: number } | null;
  checkOutCoord?: { latitude: number; longitude: number } | null;
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function GeofenceMapModal({
  visible,
  onClose,
  sessionName,
  location,
  sessionId,
  isDark = false,
  checkInCoord,
  checkOutCoord,
}: GeofenceMapModalProps) {
  const mapRef = useRef<MapView>(null);
  const slideAnim = useRef(new Animated.Value(300)).current;
  const [mapReady, setMapReady] = useState(false);
  const [attendeeLocations, setAttendeeLocations] = useState<AttendeeLocation[]>([]);

  const lat = typeof location?.latitude  === "string" ? parseFloat(location.latitude)  : (location?.latitude  ?? 0);
  const lon = typeof location?.longitude === "string" ? parseFloat(location.longitude) : (location?.longitude ?? 0);
  const radius = location?.radius ?? 100;
  const hasCoords = lat !== 0 && lon !== 0;

  // Animate bottom sheet in when modal opens
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();

      if (sessionId) {
        AttendanceService.getSessionAttendeeLocations(sessionId)
          .then(res => {
            if (res.success && res.data) {
              setAttendeeLocations(res.data);
            }
          })
          .catch(() => setAttendeeLocations([]));
      }
    } else {
      slideAnim.setValue(300);
      setMapReady(false);
      setAttendeeLocations([]);
    }
  }, [visible, sessionId]);

  const handleMapReady = () => {
    setMapReady(true);
    if (hasCoords) {
      const delta = deltaForRadius(radius);
      mapRef.current?.animateToRegion(
        { latitude: lat, longitude: lon, latitudeDelta: delta, longitudeDelta: delta },
        600,
      );
    }
  };

  const recenter = () => {
    if (!hasCoords) return;
    const delta = deltaForRadius(radius);
    mapRef.current?.animateToRegion(
      { latitude: lat, longitude: lon, latitudeDelta: delta, longitudeDelta: delta },
      500,
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.root, isDark && styles.rootDark]}>

        {/* ── Top header bar ── */}
        <View style={[styles.header, isDark && styles.headerDark]}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <MaterialCommunityIcons
              name="arrow-left"
              size={22}
              color={isDark ? "#F9FAFB" : "#0F172A"}
            />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, isDark && styles.textPrimary]} numberOfLines={1}>
              Geofence Map
            </Text>
            <Text style={styles.headerSub} numberOfLines={1}>
              {sessionName}
            </Text>
          </View>

          {/* Recenter */}
          <TouchableOpacity style={styles.closeBtn} onPress={recenter}>
            <MaterialCommunityIcons name="crosshairs-gps" size={22} color={VENUE_COLOR} />
          </TouchableOpacity>
        </View>

        {/* ── Map ── */}
        {hasCoords ? (
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_DEFAULT}
            customMapStyle={isDark ? MAP_STYLES.dark : MAP_STYLES.light}
            initialRegion={{
              latitude: lat,
              longitude: lon,
              latitudeDelta: deltaForRadius(radius),
              longitudeDelta: deltaForRadius(radius),
            }}
            onMapReady={handleMapReady}
            showsUserLocation
            showsCompass
            showsScale
            mapType="standard"
          >
            {/* ── Geofence circle ── */}
            <Circle
              center={{ latitude: lat, longitude: lon }}
              radius={radius}
              fillColor={GEOFENCE_COLOR}
              strokeColor={GEOFENCE_STROKE}
              strokeWidth={2.5}
            />

            {/* ── Venue centre marker ── */}
            <Marker
              coordinate={{ latitude: lat, longitude: lon }}
              title={location?.address ?? sessionName}
              description={`Geofence radius: ${fmtRadius(radius)}`}
              pinColor={VENUE_COLOR}
            />

            {/* ── Attendee Check-in / Check-out markers ── */}
            {attendeeLocations.map(attendee => (
              <React.Fragment key={attendee.attendance_id}>
                {attendee.checkin?.latitude != null && attendee.checkin?.longitude != null && (
                  <Marker
                    coordinate={{ latitude: attendee.checkin.latitude, longitude: attendee.checkin.longitude }}
                    title={`${attendee.full_name} (Check-in)`}
                    description={`Checked in via ${attendee.checkin.action_type || 'app'}`}
                    pinColor="#10B981"
                    zIndex={2}
                  >
                    <View style={{ alignItems: "center", justifyContent: "center" }}>
                      <MaterialCommunityIcons name="map-marker-account" size={32} color="#10B981" />
                    </View>
                  </Marker>
                )}
                {attendee.checkout?.latitude != null && attendee.checkout?.longitude != null && (
                  <Marker
                    coordinate={{ latitude: attendee.checkout.latitude, longitude: attendee.checkout.longitude }}
                    title={`${attendee.full_name} (Check-out)`}
                    description={`Checked out via ${attendee.checkout.action_type || 'app'}`}
                    pinColor="#F97316"
                    zIndex={2}
                  >
                    <View style={{ alignItems: "center", justifyContent: "center" }}>
                      <MaterialCommunityIcons name="map-marker-account" size={32} color="#F97316" />
                    </View>
                  </Marker>
                )}
              </React.Fragment>
            ))}

            {/* ── Single Attendee Fallback ── */}
            {checkInCoord && (
              <Marker
                coordinate={checkInCoord}
                title="Check-In Location"
                description="Where you checked in"
                pinColor="#10B981"
                zIndex={2}
              >
                <View style={{ alignItems: "center", justifyContent: "center" }}>
                  <MaterialCommunityIcons name="map-marker-account" size={32} color="#10B981" />
                </View>
              </Marker>
            )}
            {checkOutCoord && (
              <Marker
                coordinate={checkOutCoord}
                title="Check-Out Location"
                description="Where you checked out"
                pinColor="#F97316"
                zIndex={2}
              >
                <View style={{ alignItems: "center", justifyContent: "center" }}>
                  <MaterialCommunityIcons name="map-marker-account" size={32} color="#F97316" />
                </View>
              </Marker>
            )}
          </MapView>
        ) : (
          /* No coords placeholder */
          <View style={[styles.noCoords, isDark && styles.noCoordsark]}>
            <MaterialCommunityIcons
              name="map-marker-off-outline"
              size={52}
              color={isDark ? "#475569" : "#CBD5E1"}
            />
            <Text style={[styles.noCoordsTitle, isDark && styles.textPrimary]}>
              No location data
            </Text>
            <Text style={styles.noCoordsBody}>
              This session was created without GPS coordinates.{"\n"}
              Edit the session to add a precise location.
            </Text>
          </View>
        )}

        {/* ── Legend overlay (top-right of map) ── */}
        {hasCoords && (
          <View style={styles.legendWrap}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: VENUE_COLOR }]} />
              <Text style={styles.legendText}>Venue centre</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: GEOFENCE_COLOR, borderWidth: 1.5, borderColor: GEOFENCE_STROKE }]} />
              <Text style={styles.legendText}>Geofence zone</Text>
            </View>
            <View style={styles.legendItem}>
              <MaterialCommunityIcons name="crosshairs" size={12} color="#22C55E" />
              <Text style={styles.legendText}>Your position</Text>
            </View>
            <View style={styles.legendItem}>
              <MaterialCommunityIcons name="map-marker-account" size={14} color="#10B981" />
              <Text style={styles.legendText}>Check-in</Text>
            </View>
            <View style={styles.legendItem}>
              <MaterialCommunityIcons name="map-marker-account" size={14} color="#F97316" />
              <Text style={styles.legendText}>Check-out</Text>
            </View>
          </View>
        )}

        {/* ── Bottom info sheet ── */}
        <Animated.View
          style={[
            styles.sheet,
            isDark && styles.sheetDark,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Drag handle */}
          <View style={styles.handle} />

          <Text style={[styles.sheetTitle, isDark && styles.textPrimary]}>
            Session Geofence
          </Text>

          {/* Radius badge */}
          <View style={styles.radiusRow}>
            <View style={styles.radiusBadge}>
              <MaterialCommunityIcons name="radar" size={16} color={VENUE_COLOR} />
              <Text style={styles.radiusValue}>{fmtRadius(radius)}</Text>
              <Text style={styles.radiusLabel}>radius</Text>
            </View>
          </View>

          {/* Detail rows */}
          <View style={[styles.detailCard, isDark && styles.detailCardDark]}>
            <DetailRow
              icon="map-marker-outline"
              label="Address"
              value={location?.address ?? location?.name ?? location?.room ?? "Not specified"}
              isDark={isDark}
            />
            {location?.building && (
              <DetailRow icon="office-building-outline" label="Building" value={location.building} isDark={isDark} />
            )}
            {location?.floor && (
              <DetailRow icon="layers-outline" label="Floor" value={location.floor} isDark={isDark} />
            )}
            {location?.room && (
              <DetailRow icon="door-open" label="Room" value={location.room} isDark={isDark} />
            )}
            <DetailRow
              icon="circle-double"
              label="Geofence radius"
              value={`${fmtRadius(radius)} — attendees must check in within this zone`}
              isDark={isDark}
            />
          </View>

          {/* How it works callout */}
          <View style={[styles.callout, isDark && styles.calloutDark]}>
            <MaterialCommunityIcons name="information-outline" size={16} color={VENUE_COLOR} />
            <Text style={[styles.calloutText, isDark && styles.calloutTextDark]}>
              Attendees must be inside the blue zone at the moment of check-in.
              The system validates their GPS position server-side and flags check-ins
              outside the boundary.
            </Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ── Sub-component ──────────────────────────────────────────────────────────────
function DetailRow({
  icon,
  label,
  value,
  isDark,
}: {
  icon: string;
  label: string;
  value: string;
  isDark: boolean;
}) {
  return (
    <View style={styles.detailRow}>
      <MaterialCommunityIcons name={icon as any} size={15} color={isDark ? "#6B7280" : "#94A3B8"} />
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={[styles.detailValue, isDark && styles.textPrimary]}>{value}</Text>
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: "#F1F5F9" },
  rootDark:     { backgroundColor: "#0A0F1E" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 56 : 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    gap: 8,
    zIndex: 10,
  },
  headerDark: { backgroundColor: "#111827", borderBottomColor: "#1E293B" },
  closeBtn:   { padding: 6, borderRadius: 10 },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: 0.2,
  },
  headerSub:   { fontSize: 11, color: "#9CA3AF", marginTop: 1 },
  textPrimary: { color: "#F9FAFB" },

  // Map
  map: { flex: 1 },

  // No-coords fallback
  noCoords: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    gap: 12,
    paddingHorizontal: 40,
  },
  noCoordsark:   { backgroundColor: "#1E293B" },
  noCoordsTitle: { fontSize: 17, fontWeight: "700", color: "#334155", textAlign: "center" },
  noCoordsBody:  { fontSize: 13, color: "#94A3B8", textAlign: "center", lineHeight: 20 },

  // Legend overlay
  legendWrap: {
    position: "absolute",
    top: Platform.OS === "ios" ? 116 : 76,
    right: 12,
    backgroundColor: "rgba(255,255,255,0.93)",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 4,
  },
  legendItem:  { flexDirection: "row", alignItems: "center", gap: 7 },
  legendDot:   { width: 12, height: 12, borderRadius: 6 },
  legendText:  { fontSize: 11, fontWeight: "600", color: "#374151" },

  // Bottom sheet
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 12,
  },
  sheetDark:  { backgroundColor: "#111827" },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 12,
  },

  // Radius badge
  radiusRow:   { flexDirection: "row", marginBottom: 14 },
  radiusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  radiusValue: { fontSize: 18, fontWeight: "900", color: VENUE_COLOR },
  radiusLabel: { fontSize: 12, fontWeight: "600", color: "#6B7280" },

  // Detail card
  detailCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  detailCardDark: { backgroundColor: "#1E293B", borderColor: "#334155" },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  detailContent: { flex: 1 },
  detailLabel:   { fontSize: 10, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  detailValue:   { fontSize: 13, fontWeight: "600", color: "#1E293B", lineHeight: 18 },

  // Callout
  callout: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: "#EFF6FF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  calloutDark:     { backgroundColor: "rgba(59,130,246,0.10)", borderColor: "rgba(59,130,246,0.2)" },
  calloutText:     { fontSize: 12, color: "#1E40AF", lineHeight: 18, flex: 1 },
  calloutTextDark: { color: "#93C5FD" },
});
