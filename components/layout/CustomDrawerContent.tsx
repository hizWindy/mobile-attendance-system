/**
 * CustomDrawerContent.tsx
 *
 * Redesigned sidebar — modern frosted card aesthetic.
 * ─ Staggered slide-in mount animation for nav items
 * ─ Spring-bounce press feedback per item
 * ─ Safe-area aware (top + bottom insets)
 * ─ Proper dark/light theme support
 * ─ 48dp minimum touch targets (both iOS + Android)
 * ─ Avatar with online presence ring
 * ─ Profile shortcut → navigates to profile screen
 */

import { AuthContext } from "@/context/AuthContext";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  DrawerContentComponentProps,
  DrawerContentScrollView,
} from "@react-navigation/drawer";
import { usePathname, useRouter } from "expo-router";
import React, { useContext, useEffect, useRef } from "react";
import {
  Alert,
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
  bg:             "#F8FAFC",
  card:           "#FFFFFF",
  cardBorder:     "#E8EDF5",
  navHover:       "#F1F5F9",
  activeBg:       "rgba(0,31,84,0.07)",   // navy tint
  activeTint:     "#001F54",              // navy
  activeBar:      "#001F54",              // navy
  iconDefault:    "#94A3B8",
  textPrimary:    "#0F172A",
  textSecondary:  "#64748B",
  textMuted:      "#94A3B8",
  divider:        "#E8EDF5",
  dangerBg:       "rgba(239,68,68,0.06)",
  dangerBorder:   "rgba(239,68,68,0.15)",
  danger:         "#EF4444",
  online:         "#22C55E",
  badgeBg:        "rgba(0,31,84,0.09)",   // navy tint
  badgeText:      "#001F54",              // navy
};

const dark = {
  bg:             "#0D1117",
  card:           "#161B22",
  cardBorder:     "#21262D",
  navHover:       "#1C2128",
  activeBg:       "rgba(0,31,84,0.25)",   // navy tint — brighter on dark
  activeTint:     "#4A7CC7",              // lighter navy for dark readability
  activeBar:      "#001F54",              // navy
  iconDefault:    "#4B5563",
  textPrimary:    "#F0F6FC",
  textSecondary:  "#8B949E",
  textMuted:      "#484F58",
  divider:        "#21262D",
  dangerBg:       "rgba(239,68,68,0.08)",
  dangerBorder:   "rgba(239,68,68,0.18)",
  danger:         "#F87171",
  online:         "#3FB950",
  badgeBg:        "rgba(0,31,84,0.30)",   // navy tint
  badgeText:      "#7BACD4",              // soft navy-blue for dark mode
};

// ─────────────────────────────────────────────────────────────────────────────
// Nav routes config
// ─────────────────────────────────────────────────────────────────────────────
type NavRoute = {
  name: string;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconActive: keyof typeof MaterialCommunityIcons.glyphMap;
};

const NAV_ROUTES: NavRoute[] = [
  { name: "index",      label: "Home",       icon: "home-outline",             iconActive: "home"                   },
  { name: "sessions",   label: "Sessions",   icon: "calendar-month-outline",   iconActive: "calendar-month"         },
  { name: "activities", label: "Activities", icon: "clipboard-list-outline",   iconActive: "clipboard-list"         },
  { name: "analytics",  label: "Analytics",  icon: "chart-line",               iconActive: "chart-areaspline"       },
];

// ─────────────────────────────────────────────────────────────────────────────
// Spring-press wrapper
// ─────────────────────────────────────────────────────────────────────────────
function SpringPress({
  onPress,
  style,
  children,
  disabled,
}: {
  onPress: () => void;
  style?: any;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 400,
      friction: 15,
    }).start();

  const pressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={disabled}
      android_ripple={{ color: "rgba(99,102,241,0.08)", borderless: false }}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Animated Nav Item
// ─────────────────────────────────────────────────────────────────────────────
function NavItem({
  route,
  isActive,
  onPress,
  delay,
  T,
}: {
  route: NavRoute;
  isActive: boolean;
  onPress: () => void;
  delay: number;
  T: typeof light;
}) {
  const slideX  = useRef(new Animated.Value(-24)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideX, {
        toValue: 0,
        duration: 320,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const iconColor = isActive ? T.activeTint : T.iconDefault;
  const iconName  = isActive ? route.iconActive : route.icon;

  return (
    <Animated.View style={{ transform: [{ translateX: slideX }], opacity }}>
      <SpringPress onPress={onPress}>
        <View
          style={[
            itemStyles.row,
            isActive && { backgroundColor: T.activeBg },
          ]}
        >
          {/* Active indicator pill */}
          {isActive && (
            <View style={[itemStyles.pill, { backgroundColor: T.activeBar }]} />
          )}

          {/* Icon */}
          <View
            style={[
              itemStyles.iconBox,
              {
                backgroundColor: isActive
                  ? T.activeBg
                  : "transparent",
              },
            ]}
          >
            <MaterialCommunityIcons
              name={iconName as any}
              size={21}
              color={iconColor}
            />
          </View>

          {/* Label */}
          <Text
            style={[
              itemStyles.label,
              {
                color: isActive ? T.activeTint : T.textSecondary,
                fontWeight: isActive ? "700" : "500",
              },
            ]}
            numberOfLines={1}
          >
            {route.label}
          </Text>

          {/* Active chevron */}
          {isActive && (
            <Ionicons
              name="chevron-forward"
              size={15}
              color={T.activeTint}
              style={{ opacity: 0.6 }}
            />
          )}
        </View>
      </SpringPress>
    </Animated.View>
  );
}

const itemStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,
    borderRadius: 14,
    marginHorizontal: 10,
    marginVertical: 2,
    paddingHorizontal: 12,
    paddingVertical: 2,
    gap: 12,
    position: "relative",
    overflow: "hidden",
  },
  pill: {
    position: "absolute",
    left: 0,
    top: 12,
    bottom: 12,
    width: 3,
    borderRadius: 3,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    flex: 1,
    fontSize: 15,
    letterSpacing: -0.1,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Profile header card
// ─────────────────────────────────────────────────────────────────────────────
function ProfileCard({
  user,
  onPress,
  T,
}: {
  user: any;
  onPress: () => void;
  T: typeof light;
}) {
  const displayName = user?.full_name ?? user?.username ?? "User";
  const email       = user?.email ?? "";
  const role        = user?.role ?? "Member";
  const avatarUrl   = `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(displayName)}&backgroundColor=1e4d7a&fontColor=ffffff`;

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(-8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.spring(slideY,  { toValue: 0, tension: 200, friction: 20, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideY }] }}>
      <SpringPress onPress={onPress}>
        <View style={[pcStyles.card, { backgroundColor: T.card, borderColor: T.cardBorder }]}>
          {/* Brand row */}
          <View style={pcStyles.brand}>
            <View style={[pcStyles.brandIcon, { backgroundColor: T.activeBg, borderColor: T.cardBorder }]}>
              <MaterialCommunityIcons name="clock-time-four" size={15} color={T.activeTint} />
            </View>
            <Text style={[pcStyles.brandName, { color: T.textPrimary }]}>ClockWise</Text>
          </View>

          <View style={[pcStyles.divider, { backgroundColor: T.divider }]} />

          {/* User row */}
          <View style={pcStyles.userRow}>
            {/* Avatar */}
            <View style={pcStyles.avatarWrap}>
              <Image
                source={{ uri: avatarUrl }}
                style={[pcStyles.avatar, { borderColor: T.activeTint }]}
                defaultSource={require("../../assets/images/icon.png")}
              />
              <View style={[pcStyles.onlineDot, { backgroundColor: T.online, borderColor: T.card }]} />
            </View>

            {/* Info */}
            <View style={{ flex: 1 }}>
              <Text style={[pcStyles.name, { color: T.textPrimary }]} numberOfLines={1}>
                {displayName}
              </Text>
              {!!email && (
                <Text style={[pcStyles.email, { color: T.textSecondary }]} numberOfLines={1}>
                  {email}
                </Text>
              )}
              <View style={[pcStyles.roleBadge, { backgroundColor: T.badgeBg }]}>
                <Text style={[pcStyles.roleText, { color: T.badgeText }]}>{role}</Text>
              </View>
            </View>

            {/* Tap hint */}
            <Ionicons name="chevron-forward" size={16} color={T.textMuted} />
          </View>
        </View>
      </SpringPress>
    </Animated.View>
  );
}

const pcStyles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  brandIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
    fontFamily: "Inter_700Bold",
  },
  divider: {
    height: 1,
    marginBottom: 12,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarWrap: { position: "relative" },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
  },
  onlineDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
    fontFamily: "Inter_700Bold",
  },
  email: {
    fontSize: 11,
    marginTop: 2,
    fontFamily: "Inter_400Regular",
  },
  roleBadge: {
    alignSelf: "flex-start",
    marginTop: 5,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  roleText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    fontFamily: "Inter_700Bold",
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { user, logout } = useContext(AuthContext);
  const router           = useRouter();
  const insets           = useSafeAreaInsets();
  const pathname         = usePathname();
  const scheme           = useColorScheme();
  const T                = scheme === "dark" ? dark : light;

  // Resolve active route segment
  const getActiveRoute = (): string => {
    if (
      pathname === "/" ||
      pathname === "/(tabs)" ||
      pathname === "/(tabs)/index"
    )
      return "index";
    const segments = pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1];
    return last === "(tabs)" ? "index" : (last ?? "index");
  };

  const activeRoute = getActiveRoute();

  const handleNav = (name: string) => {
    props.navigation.closeDrawer();
    if (name === "index") {
      router.push("/(tabs)");
    } else {
      router.push(`/(tabs)/${name}` as any);
    }
  };

  const handleProfile = () => {
    props.navigation.closeDrawer();
    router.push("/(tabs)/profile");
  };

  const handleLogout = () => {
    props.navigation.closeDrawer();
    setTimeout(() => {
      Alert.alert(
        "Sign Out",
        "Are you sure you want to sign out?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Sign Out",
            style: "destructive",
            onPress: async () => await logout(),
          },
        ]
      );
    }, 280);
  };

  return (
    <View style={[styles.container, { backgroundColor: T.bg, paddingTop: insets.top }]}>
      {/* ── Scrollable: profile card + nav ── */}
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
      >
        {/* Profile card */}
        <ProfileCard user={user} onPress={handleProfile} T={T} />

        {/* Section heading */}
        <View style={styles.sectionHead}>
          <Text style={[styles.sectionLabel, { color: T.textMuted }]}>MENU</Text>
        </View>

        {/* Nav items */}
        <View style={{ paddingBottom: 8 }}>
          {NAV_ROUTES.map((route, i) => (
            <NavItem
              key={route.name}
              route={route}
              isActive={activeRoute === route.name}
              onPress={() => handleNav(route.name)}
              delay={60 + i * 55}
              T={T}
            />
          ))}
        </View>
      </DrawerContentScrollView>

      {/* ── Bottom-pinned footer ── */}
      <View
        style={[
          styles.footer,
          {
            paddingBottom: Math.max(insets.bottom, 20),
            borderTopColor: T.divider,
          },
        ]}
      >
        {/* Logout */}
        <SpringPress onPress={handleLogout}>
          <View
            style={[
              styles.logoutRow,
              {
                backgroundColor: T.dangerBg,
                borderColor: T.dangerBorder,
              },
            ]}
          >
            <View style={[styles.logoutIcon, { backgroundColor: "rgba(239,68,68,0.10)" }]}>
              <Ionicons name="log-out-outline" size={20} color={T.danger} />
            </View>
            <Text style={[styles.logoutText, { color: T.danger }]}>Sign Out</Text>
          </View>
        </SpringPress>

        {/* App version */}
        <Text style={[styles.version, { color: T.textMuted }]}>ClockWise · v2.0</Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shell styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  sectionHead: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 6,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    fontFamily: "Inter_700Bold",
  },
  footer: {
    paddingHorizontal: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 2,
    gap: 12,
    borderWidth: 1,
    marginBottom: 2,
  },
  logoutIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  version: {
    textAlign: "center",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.8,
    marginTop: 10,
    marginBottom: 2,
  },
});
