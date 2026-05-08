import { AuthContext } from "@/context/AuthContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
    DrawerContentComponentProps,
    DrawerContentScrollView,
} from "@react-navigation/drawer";
import { usePathname, useRouter } from "expo-router";
import React, { useContext, useRef } from "react";
import {
    Alert,
    Animated,
    Image,
    Pressable,
    StyleSheet,
    Text,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ──────────────────────────────────────────────────────────────────────────────
// Design Tokens (8-pt grid)
// ──────────────────────────────────────────────────────────────────────────────
const C = {
  bg: "#0A0F1E",           // Drawer background
  surface: "#111827",      // Header / card surface
  surfaceAlt: "#1a2236",   // Hover surface
  border: "#1E2A45",       // Subtle borders
  active: "#3B82F6",       // Trust Blue — active tint
  activePill: "rgba(59,130,246,0.13)", // Active item bg
  textPrimary: "#F9FAFB",
  textSecondary: "#6B7280",
  textMuted: "#4B5563",
  danger: "#EF4444",
  online: "#22C55E",
};

// ──────────────────────────────────────────────────────────────────────────────
// Nav Item Config
// ──────────────────────────────────────────────────────────────────────────────
type NavRoute = {
  name: string;           // expo-router path segment
  label: string;
  icon: string;           // MaterialCommunityIcons name (inactive)
  iconActive: string;     // MaterialCommunityIcons name (active/filled)
};

const NAV_ROUTES: NavRoute[] = [
  { name: "index",     label: "Home",       icon: "home-variant-outline",         iconActive: "home-account"          },
  { name: "sessions",  label: "Sessions",   icon: "calendar-check-outline",       iconActive: "calendar-check"        },
  { name: "activities",label: "Activities", icon: "clipboard-text-outline",       iconActive: "clipboard-text"        },
  { name: "analytics", label: "Analytics",  icon: "chart-bell-curve-cumulative",  iconActive: "chart-areaspline"      },
  // { name: "profile", label: "Profile", icon: "account-circle-outline", iconActive: "account-circle" }, // Hidden for now
];

// ──────────────────────────────────────────────────────────────────────────────
// AnimatedPressable — scale feedback on press
// ──────────────────────────────────────────────────────────────────────────────
function AnimatedPressable({
  onPress,
  style,
  children,
}: {
  onPress: () => void;
  style?: any;
  children: React.ReactNode;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () =>
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();

  const handlePressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      android_ripple={{ color: "rgba(255,255,255,0.06)", borderless: false }}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// NavItem
// ──────────────────────────────────────────────────────────────────────────────
function NavItem({
  route,
  isActive,
  onPress,
}: {
  route: NavRoute;
  isActive: boolean;
  onPress: () => void;
}) {
  const iconColor = isActive ? C.active : C.textSecondary;
  const iconName = isActive ? route.iconActive : route.icon;

  return (
    <AnimatedPressable onPress={onPress} style={[
      styles.navItem,
      isActive && styles.navItemActive,
    ]}>
      {/* Active bar */}
      {isActive && <View style={styles.activeBar} />}

      {/* Icon container */}
      <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
        <MaterialCommunityIcons
          name={iconName as any}
          size={22}
          color={iconColor}
        />
      </View>

      {/* Label */}
      <Text
        style={[
          styles.navLabel,
          isActive ? styles.navLabelActive : styles.navLabelInactive,
        ]}
        numberOfLines={1}
      >
        {route.label}
      </Text>
    </AnimatedPressable>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// DrawerHeader — User info panel
// ──────────────────────────────────────────────────────────────────────────────
function DrawerHeader({ user }: { user: any }) {
  const initials = user?.full_name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "U";

  const displayName = user?.full_name ?? user?.username ?? "Guest";
  const email = user?.email ?? "";
  const avatarUrl = `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(displayName)}&backgroundColor=1e4d7a&fontColor=ffffff`;

  return (
    <View style={styles.header}>
      {/* App brand mark */}
      <View style={styles.brandRow}>
        <View style={styles.brandIcon}>
          <MaterialCommunityIcons name="clock-time-four" size={18} color={C.active} />
        </View>
        <Text style={styles.brandName}>ClockWise</Text>
      </View>

      {/* Divider */}
      <View style={styles.headerDivider} />

      {/* Avatar + name */}
      <View style={styles.userRow}>
        <View style={styles.avatarWrap}>
          <Image
            source={{ uri: avatarUrl }}
            style={styles.avatar}
            defaultSource={require("../../assets/images/icon.png")}
          />
          <View style={styles.onlineDot} />
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>{displayName}</Text>
          {email ? (
            <Text style={styles.userEmail} numberOfLines={1}>{email}</Text>
          ) : null}
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {user?.role ?? "Member"}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────────────────────────
export default function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { user, logout } = useContext(AuthContext);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  // Resolve active route from pathname
  const getActiveRoute = (): string => {
    if (pathname === "/" || pathname === "/(tabs)" || pathname === "/(tabs)/index") return "index";
    const segments = pathname.split("/").filter(Boolean);
    // Strip the (tabs) group segment
    const last = segments[segments.length - 1];
    return last === "(tabs)" ? "index" : (last ?? "index");
  };

  const activeRoute = getActiveRoute();

  const handleNavPress = (routeName: string) => {
    // Close drawer first, then navigate
    props.navigation.closeDrawer();
    if (routeName === "index") {
      router.push("/(tabs)");
    } else {
      router.push(`/(tabs)/${routeName}` as any);
    }
  };

  const handleLogout = () => {
    props.navigation.closeDrawer();
    setTimeout(() => {
      Alert.alert(
        "Logout",
        "Are you sure you want to log out? This will flush all session tokens.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Logout",
            style: "destructive",
            onPress: async () => {
              await logout();
            },
          },
        ]
      );
    }, 300); // Let drawer close before alert shows
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top > 0 ? 0 : 0 }]}>
      {/* ── Scrollable area: Header + Nav ── */}
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
      >
        {/* User header */}
        <DrawerHeader user={user} />

        {/* Section label */}
        <View style={styles.sectionLabelWrap}>
          <Text style={styles.sectionLabel}>NAVIGATION</Text>
        </View>

        {/* Nav Items */}
        <View style={styles.navList}>
          {NAV_ROUTES.map((route) => (
            <NavItem
              key={route.name}
              route={route}
              isActive={activeRoute === route.name}
              onPress={() => handleNavPress(route.name)}
            />
          ))}
        </View>
      </DrawerContentScrollView>

      {/* ── Bottom pinned: Logout + Version ── */}
      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        <View style={styles.footerDivider} />

        {/* Logout button */}
        <AnimatedPressable onPress={handleLogout} style={styles.logoutButton}>
          <View style={styles.logoutIconWrap}>
            <MaterialCommunityIcons name="logout-variant" size={20} color={C.danger} />
          </View>
          <Text style={styles.logoutLabel}>Logout</Text>
        </AnimatedPressable>

        {/* App version */}
        <Text style={styles.versionText}>ClockWise Mobile v2.0</Text>
      </View>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Styles (8pt grid)
// ──────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: C.surface,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(59,130,246,0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.25)",
  },
  brandName: {
    fontSize: 18,
    fontWeight: "900",
    color: C.textPrimary,
    letterSpacing: 0.3,
    fontFamily: "Inter_700Bold",
  },
  headerDivider: {
    height: 1,
    backgroundColor: C.border,
    marginBottom: 16,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarWrap: {
    position: "relative",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: C.active,
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: C.online,
    borderWidth: 2,
    borderColor: C.surface,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: "700",
    color: C.textPrimary,
    fontFamily: "Inter_700Bold",
  },
  userEmail: {
    fontSize: 11,
    color: C.textSecondary,
    marginTop: 1,
    fontFamily: "Inter_400Regular",
  },
  roleBadge: {
    marginTop: 5,
    alignSelf: "flex-start",
    backgroundColor: "rgba(59,130,246,0.12)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.2)",
  },
  roleText: {
    fontSize: 10,
    fontWeight: "700",
    color: C.active,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  // ── Section Label ────────────────────────────────────────────────────────────
  sectionLabelWrap: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: C.textMuted,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    fontFamily: "Inter_700Bold",
  },

  // ── Nav List ─────────────────────────────────────────────────────────────────
  navList: {
    paddingHorizontal: 12,
    gap: 2,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,         // >= 48dp Android / 44pt iOS
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 12,
    position: "relative",
    overflow: "hidden",
  },
  navItemActive: {
    backgroundColor: C.activePill,
  },
  activeBar: {
    position: "absolute",
    left: 0,
    top: 10,
    bottom: 10,
    width: 3,
    borderRadius: 2,
    backgroundColor: C.active,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: {
    backgroundColor: "rgba(59,130,246,0.15)",
  },
  navLabel: {
    flex: 1,
    fontSize: 15,
  },
  navLabelActive: {
    fontWeight: "700",
    color: C.textPrimary,
    fontFamily: "Inter_700Bold",
  },
  navLabelInactive: {
    fontWeight: "500",
    color: C.textSecondary,
    fontFamily: "Inter_400Regular",
  },

  // ── Footer ───────────────────────────────────────────────────────────────────
  footer: {
    paddingHorizontal: 12,
  },
  footerDivider: {
    height: 1,
    backgroundColor: C.border,
    marginBottom: 12,
    marginHorizontal: 8,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 12,
    backgroundColor: "rgba(239,68,68,0.06)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.12)",
  },
  logoutIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(239,68,68,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: C.danger,
    fontFamily: "Inter_700Bold",
  },
  versionText: {
    textAlign: "center",
    fontSize: 10,
    fontWeight: "800",
    color: C.textMuted,
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 4,
  },
});
