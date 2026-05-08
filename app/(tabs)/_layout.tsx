/**
 * app/(tabs)/_layout.tsx
 *
 * Drawer Navigator — replaces the 5-tab bottom bar.
 * Uses @react-navigation/drawer (already installed) via expo-router's
 * `<Drawer />` integration so route names stay consistent.
 *
 * Drawer behaviour:
 *  • Slides in from the left with a spring animation
 *  • Swipe gesture enabled natively (react-native-gesture-handler)
 *  • Hamburger toggle rendered in the screen header
 *  • Custom content component (CustomDrawerContent) handles
 *    avatar, nav items, active highlighting, logout
 */

import CustomDrawerContent from "@/components/layout/CustomDrawerContent";
import CustomHeader from "@/components/layout/CustomHeader";
import { AuthContext } from "@/context/AuthContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Drawer } from "expo-router/drawer";
import React, { useContext } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// Active/brand colour aligned to the app's Trust Navy
const ACTIVE_COLOR = "#001F54";

export default function DrawerLayout() {
  const { user } = useContext(AuthContext);

  const headerUser = {
    name: user ? `${user.first_name} ${user.last_name}` : "Guest",
    photoURL: user
      ? `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(
          user.full_name ?? user.username ?? "User"
        )}&backgroundColor=1e4d7a&fontColor=ffffff`
      : undefined,
  };

  
  return (
    <GestureHandlerRootView style={styles.root}>
      <Drawer
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={({ navigation }) => ({
          /**
           * Drawer appearance
           */
          drawerType: "slide",           // Pushes screen content — feels native
          drawerPosition: "left",
          drawerStyle: {
            width: 300,
            backgroundColor: "#0A0F1E", // Matches CustomDrawerContent bg
          },
          overlayColor: "rgba(0,0,0,0.45)",
          swipeEnabled: true,
          swipeEdgeWidth: 60,            // Wide enough to swipe open from edge
          drawerActiveTintColor: ACTIVE_COLOR,
          drawerInactiveTintColor: "#6B7280",

          /**
           * Shared header — shows the hamburger toggle
           */
          header: ({ route, options }) => (
            <CustomHeader
              user={headerUser}
              notificationCount={5}
              onNotificationPress={() =>
                console.log("notifications pressed")
              }
              onMenuPress={() => navigation.toggleDrawer()}
            />
          ),
          headerShown: true,
        })}
      >
        {/* ─── Screens ─────────────────────────────────────────────────── */}
        <Drawer.Screen
          name="index"
          options={{
            drawerLabel: "Home",
            title: "Home",
            drawerIcon: ({ focused, color }) => (
              <MaterialCommunityIcons
                name={focused ? "home-account" : "home-variant-outline"}
                size={22}
                color={color}
              />
            ),
          }}
        />

        <Drawer.Screen
          name="sessions"
          options={{
            drawerLabel: "Sessions",
            title: "Sessions",
            drawerIcon: ({ focused, color }) => (
              <MaterialCommunityIcons
                name={focused ? "calendar-check" : "calendar-check-outline"}
                size={22}
                color={color}
              />
            ),
          }}
        />

        <Drawer.Screen
          name="activities"
          options={{
            drawerLabel: "Activities",
            title: "Activities",
            drawerIcon: ({ focused, color }) => (
              <MaterialCommunityIcons
                name={focused ? "clipboard-text" : "clipboard-text-outline"}
                size={22}
                color={color}
              />
            ),
          }}
        />

        <Drawer.Screen
          name="analytics"
          options={{
            drawerLabel: "Analytics",
            title: "Analytics",
            drawerIcon: ({ focused, color }) => (
              <MaterialCommunityIcons
                name={
                  focused
                    ? "chart-areaspline"
                    : "chart-bell-curve-cumulative"
                }
                size={22}
                color={color}
              />
            ),
          }}
        />

        {/* Profile — hidden from drawer but still navigable */}
        <Drawer.Screen
          name="profile"
          options={{
            drawerLabel: "Profile",
            title: "Profile",
            drawerItemStyle: { display: "none" }, // Hidden from menu
          }}
        />

        {/* Analytics Sessions — hidden from drawer but still navigable */}
        <Drawer.Screen
          name="analytics-sessions"
          options={{
            drawerLabel: "Analytics Sessions",
            title: "Analytics Sessions",
            drawerItemStyle: { display: "none" }, // Hidden from menu
          }}
        />

        {/* Debug — hidden from drawer but still navigable */}
        <Drawer.Screen
          name="debug"
          options={{
            drawerLabel: "Debug",
            title: "Debug",
            drawerItemStyle: { display: "none" }, // Hidden from menu
          }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
