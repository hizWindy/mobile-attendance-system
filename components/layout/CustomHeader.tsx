/**
 * CustomHeader.tsx
 *
 * App-wide header for the Drawer navigator.
 * Fixed 64dp content area · 8pt grid spacing · pure StyleSheet (no className)
 * Safe area handled via useSafeAreaInsets for precise control.
 *
 * Theme: Clean white — brand navy (#001F54) as accent
 */

import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ── Design Tokens (8pt grid) ─────────────────────────────────────────────────
const T = {
  bg:            "#FFFFFF",
  surface:       "#F1F5F9",       // Subtle chip background
  surfacePress:  "#E2E8F0",       // Pressed state
  border:        "#E8EDF5",       // Very light separator
  accent:        "#001F54",       // Brand navy — avatar ring, active states
  accentLight:   "#EEF2FF",       // Soft indigo tint for bell hover
  textPrimary:   "#0F172A",       // Near-black for name
  textSecondary: "#64748B",       // Slate-500 for greeting
  iconDefault:   "#475569",       // Slate-600 for icons
  online:        "#22C55E",
  danger:        "#EF4444",
};

const HEADER_HEIGHT = 64;

// ── Types ────────────────────────────────────────────────────────────────────
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

type User = {
  name?: string;
  photoURL?: string;
};

type CustomHeaderProps = {
  user?: User;
  notificationCount?: number;
  onNotificationPress?: () => void;
  /** Called when the hamburger/menu button is pressed */
  onMenuPress?: () => void;
};

export const DEFAULT_USER: User = {
  name: "Al-khair Pama",
  photoURL: "https://api.dicebear.com/7.x/adventurer/png?seed=alkhair",
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

// ── Component ────────────────────────────────────────────────────────────────
const CustomHeader: React.FC<CustomHeaderProps> = ({
  user = DEFAULT_USER,
  notificationCount = 3,
  onNotificationPress,
  onMenuPress,
}) => {
  const insets = useSafeAreaInsets();
  const [notifPressed, setNotifPressed] = useState(false);
  const [menuPressed, setMenuPressed] = useState(false);

  return (
    <View style={[styles.safeWrap, { paddingTop: insets.top }]}>
      <View style={styles.row}>

        {/* ── Hamburger menu ── */}
        {onMenuPress ? (
          <Pressable
            onPress={onMenuPress}
            onPressIn={() => setMenuPressed(true)}
            onPressOut={() => setMenuPressed(false)}
            android_ripple={{ color: "rgba(0,31,84,0.08)", radius: 22 }}
            style={[styles.menuButton, menuPressed && styles.menuButtonPressed]}
            hitSlop={8}
          >
            <MaterialCommunityIcons
              name="menu"
              size={22}
              color={menuPressed ? T.accent : T.iconDefault}
            />
          </Pressable>
        ) : null}

        {/* ── Avatar + Greeting + Name ── */}
        <View style={styles.userSection}>
          {/* Avatar with online dot */}
          <View style={styles.avatarWrap}>
            {user.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>
                  {user.name?.charAt(0) ?? "U"}
                </Text>
              </View>
            )}
            <View style={styles.onlineDot} />
          </View>

          {/* Greeting + Name */}
          <View style={styles.greetingWrap}>
            <Text style={styles.greetingText}>{getGreeting()} 👋</Text>
            <Text
              style={styles.nameText}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {user.name ?? "User"}
            </Text>
          </View>
        </View>

        {/* ── Notification Bell ── */}
        <Pressable
          onPress={onNotificationPress}
          onPressIn={() => setNotifPressed(true)}
          onPressOut={() => setNotifPressed(false)}
          style={[styles.bellButton, notifPressed && styles.bellButtonPressed]}
          hitSlop={4}
        >
          <MaterialCommunityIcons
            name={"bell-outline" as IconName}
            size={21}
            color={notifPressed ? T.accent : T.iconDefault}
          />

          {/* Badge */}
          {notificationCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {notificationCount > 99 ? "99+" : notificationCount}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* ── Subtle brand accent strip at the bottom ── */}
      <View style={styles.accentStrip} />
    </View>
  );
};

// ── Styles (8pt grid) ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeWrap: {
    backgroundColor: T.bg,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    // Soft lift shadow tinted navy
    shadowColor: "#001F54",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 4,
  },
  row: {
    height: HEADER_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 12,
  },

  // ── Brand accent strip (very subtle) ──
  accentStrip: {
    height: 2,
    backgroundColor: T.accent,
    opacity: 0.12,
  },

  // ── Menu button ──
  menuButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
  },
  menuButtonPressed: {
    backgroundColor: T.surfacePress,
    borderColor: "#C7D2E0",
  },

  // ── User section (avatar + text) ──
  userSection: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarWrap: {
    position: "relative",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: T.accent,
  },
  avatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: T.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  onlineDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: T.online,
    borderWidth: 2,
    borderColor: T.bg,
  },

  // ── Greeting text ──
  greetingWrap: {
    flex: 1,
  },
  greetingText: {
    fontSize: 11,
    fontWeight: "500",
    color: T.textSecondary,
    letterSpacing: 0.1,
  },
  nameText: {
    fontSize: 15,
    fontWeight: "700",
    color: T.textPrimary,
    marginTop: 1,
    letterSpacing: -0.2,
  },

  // ── Notification bell ──
  bellButton: {
    position: "relative",
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
  },
  bellButtonPressed: {
    backgroundColor: T.accentLight,
    borderColor: "#C7D2FF",
  },
  badge: {
    position: "absolute",
    top: -1,
    right: -1,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: T.danger,
    borderWidth: 1.5,
    borderColor: T.bg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
    lineHeight: 12,
  },
});

export default CustomHeader;