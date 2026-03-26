import { Tabs } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import CustomHeader from "@/components/layout/CustomHeader";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type TabIconProps = {
  focused: boolean;
  color: string;
  name: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
};

function TabIcon({ focused, color, name }: TabIconProps) {
  const dotScale = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const dotOpacity = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(dotScale, {
        toValue: focused ? 1 : 0,
        useNativeDriver: true,
        tension: 220,
        friction: 10,
      }),
      Animated.timing(dotOpacity, {
        toValue: focused ? 1 : 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused]);

  return (
    <Animated.View style={styles.iconContainer}>
      <MaterialCommunityIcons name={name} size={24} color={color} />
      <Animated.View
        style={[
          styles.dot,
          { backgroundColor: color, transform: [{ scale: dotScale }], opacity: dotOpacity },
        ]}
      />
    </Animated.View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        tabBarInactiveTintColor: isDark ? "#475569" : "#94a3b8",
        headerShown: false,
        tabBarButton: HapticTab,

        // Typography
        tabBarLabelStyle: {
          fontFamily: "Inter_400Regular",
          fontSize: 11,
          fontWeight: "600",
          marginBottom: Platform.OS === "ios" ? 0 : 4,
        },

        // Floating card-style tab bar
        tabBarStyle: {
          backgroundColor: isDark ? "#1e293b" : "#ffffff",
          borderTopWidth: 0,
          elevation: 20,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: isDark ? 0.3 : 0.08,
          shadowRadius: 16,
          height: Platform.OS === "ios" ? 88 : 68,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 28 : 8,
          paddingHorizontal: 8,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        },

        // Active tab indicator: pill highlight behind the icon+label
        tabBarItemStyle: {
          borderRadius: 14,
          marginHorizontal: 4,
        },

        tabBarActiveBackgroundColor: isDark
          ? "rgba(96, 165, 250, 0.12)"
          : "rgba(0, 31, 84, 0.07)",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          header: () => (
            <CustomHeader
              notificationCount={5}
              onNotificationPress={() => console.log("notifications pressed")}
            />
          ),
          headerShown: true,
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} name={focused ? "home-account" : "home-variant-outline"} />
          ),
        }}
      />

      <Tabs.Screen
        name="sessions"
        options={{
          header: () => (
            <CustomHeader
              notificationCount={2}
              onNotificationPress={() => console.log("notifications pressed")}
            />
          ),
          headerShown: true,
          title: "Sessions",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} name={focused ? "calendar-check" : "calendar-check-outline"} />
          ),
        }}
      />

      <Tabs.Screen
        name="analytics"
        options={{
          header: () => <CustomHeader />,
          headerShown: true,
          title: "Analytics",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} name={focused ? "chart-areaspline" : "chart-bell-curve-cumulative"} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} name={focused ? "account-circle" : "account-circle-outline"} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 42,
    paddingTop: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 3,
  },
});
