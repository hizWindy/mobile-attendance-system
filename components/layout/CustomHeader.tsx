/**
 * CustomHeader.tsx
 *
 * Redesigned app-wide header for the Drawer navigator.
 * ─ Adapts to light / dark color scheme
 * ─ Spring-feedback on every interactive element
 * ─ Safe-area aware via useSafeAreaInsets
 * ─ 44pt / 48dp minimum touch targets
 * ─ Subtle elevation + brand accent underline
 * ─ Greeting changes by time of day
 */

import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  Animated,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─────────────────────────────────────────────────────────────────────────────
// Theme tokens
// ─────────────────────────────────────────────────────────────────────────────
const light = {
  bg:           "#FFFFFF",
  surface:      "#F1F5F9",
  surfacePress: "#E2E8F0",
  border:       "#E8EDF5",
  accent:       "#001F54",             // navy
  accentLight:  "rgba(0,31,84,0.07)", // navy tint
  textPrimary:  "#0F172A",
  textSecondary:"#64748B",
  icon:         "#64748B",
  iconPress:    "#001F54",            // navy
  danger:       "#EF4444",
  online:       "#22C55E",
};

const dark = {
  bg:           "#0D1117",
  surface:      "#161B22",
  surfacePress: "#1C2128",
  border:       "#21262D",
  accent:       "#4A7CC7",              // lighter navy — readable on dark
  accentLight:  "rgba(0,31,84,0.25)",  // navy tint
  textPrimary:  "#F0F6FC",
  textSecondary:"#8B949E",
  icon:         "#6B7280",
  iconPress:    "#4A7CC7",             // lighter navy
  danger:       "#F87171",
  online:       "#3FB950",
};

const HEADER_CONTENT_HEIGHT = 56;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

// ─────────────────────────────────────────────────────────────────────────────
// Spring icon button
// ─────────────────────────────────────────────────────────────────────────────
function IconButton({
  onPress,
  children,
  style,
}: {
  onPress?: () => void;
  children: React.ReactNode;
  style?: any;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.spring(scale, { toValue: 0.90, useNativeDriver: true, tension: 400, friction: 14 }).start();
  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }).start();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      android_ripple={{ color: "rgba(99,102,241,0.1)", borderless: true, radius: 22 }}
      hitSlop={8}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
type User = { name?: string; photoURL?: string };

type CustomHeaderProps = {
  user?: User;
  notificationCount?: number;
  onNotificationPress?: () => void;
  onMenuPress?: () => void;
};

export const DEFAULT_USER: User = {
  name: "User",
  photoURL: undefined,
};

const CustomHeader: React.FC<CustomHeaderProps> = ({
  user = DEFAULT_USER,
  notificationCount = 0,
  onNotificationPress,
  onMenuPress,
}) => {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const T = scheme === "dark" ? dark : light;

  return (
    <View
      style={[
        styles.safeWrap,
        {
          paddingTop: insets.top,
          backgroundColor: T.bg,
          borderBottomColor: T.border,
          ...Platform.select({
            ios: {
              shadowColor: scheme === "dark" ? "#000" : "#001F54",
              shadowOpacity: scheme === "dark" ? 0.3 : 0.06,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 3 },
            },
            android: { elevation: scheme === "dark" ? 6 : 3 },
          }),
        },
      ]}
    >
      <View style={[styles.row, { height: HEADER_CONTENT_HEIGHT }]}>

        {/* ── Hamburger menu ── */}
        {onMenuPress && (
          <IconButton
            onPress={onMenuPress}
            style={[styles.menuButton, { backgroundColor: T.surface, borderColor: T.border }]}
          >
            <MaterialCommunityIcons name="menu" size={22} color={T.icon} />
          </IconButton>
        )}

        {/* ── Avatar + Greeting ── */}
        <View style={styles.userSection}>
          {/* Avatar */}
          <View style={styles.avatarWrap}>
            {user.photoURL ? (
              <Image
                source={{ uri: user.photoURL }}
                style={[styles.avatar, { borderColor: T.accent }]}
              />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: T.accent }]}>
                <Text style={styles.avatarInitial}>
                  {user.name?.charAt(0)?.toUpperCase() ?? "U"}
                </Text>
              </View>
            )}
            <View
              style={[styles.onlineDot, { backgroundColor: T.online, borderColor: T.bg }]}
            />
          </View>

          {/* Greeting text */}
          <View style={styles.greetingWrap}>
            <Text style={[styles.greeting, { color: T.textSecondary }]}>
              {getGreeting()} 👋
            </Text>
            <Text
              style={[styles.name, { color: T.textPrimary }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {user.name ?? "User"}
            </Text>
          </View>
        </View>

        {/* ── Notification bell ── */}
        <IconButton
          onPress={onNotificationPress}
          style={[styles.bellButton, { backgroundColor: T.surface, borderColor: T.border }]}
        >
          <Ionicons
            name={notificationCount > 0 ? "notifications" : "notifications-outline"}
            size={20}
            color={notificationCount > 0 ? T.accent : T.icon}
          />
          {notificationCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {notificationCount > 99 ? "99+" : notificationCount}
              </Text>
            </View>
          )}
        </IconButton>
      </View>

      {/* Brand accent underline */}
      <View
        style={[
          styles.accentStrip,
          { backgroundColor: T.accent, opacity: scheme === "dark" ? 0.3 : 0.12 },
        ]}
      />
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeWrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 10,
  },

  // Menu button
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // User section
  userSection: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarWrap: { position: "relative" },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
  },
  avatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
  },
  greetingWrap: { flex: 1 },
  greeting: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.1,
    fontFamily: "Inter_400Regular",
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 1,
    letterSpacing: -0.2,
    fontFamily: "Inter_700Bold",
  },

  // Bell
  bellButton: {
    position: "relative",
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#EF4444",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "800",
    lineHeight: 11,
    fontFamily: "Inter_700Bold",
  },

  // Accent strip
  accentStrip: {
    height: 2,
  },
});

export default CustomHeader;