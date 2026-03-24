import { Tabs } from "expo-router";
import React from "react";

import { HapticTab } from "@/components/haptic-tab";
import CustomHeader from "@/components/layout/CustomHeader";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarLabelStyle: { fontFamily: "Inter_400Regular" },
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
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons
              name="home-account"
              size={28}
              color={color}
            />
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
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons
              name="calendar-multiple-check"
              size={28}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="analytics"
        options={{
          header: () => <CustomHeader />,
          headerShown: true,
          title: "Analytics",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons
              name="chart-line-variant"
              size={28}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons
              name="account-badge-outline"
              size={28}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
