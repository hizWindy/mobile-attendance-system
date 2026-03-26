import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Image,
  Platform,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

type User = {
  name?: string;
  photoURL?: string;
};

type CustomHeaderProps = {
  user?: User;
  notificationCount?: number;
  onNotificationPress?: () => void;
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

const CustomHeader: React.FC<CustomHeaderProps> = ({
  user = DEFAULT_USER,
  notificationCount = 3,
  onNotificationPress,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [notifPressed, setNotifPressed] = useState(false);

  return (
    <SafeAreaView
      style={{
        backgroundColor: "#0A0F1E",
        paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
        // Bottom border glow
        borderBottomWidth: 1,
        borderBottomColor: "#1E2A45",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 10,
      }}
    >
      <View className="flex-row items-center justify-between px-5 py-3">

        {/* Left: Avatar + Greeting + Name */}
        <View className="flex-row items-center gap-3 flex-1">

          {/* Avatar with online dot */}
          <View className="relative">
            {user.photoURL ? (
              <Image
                source={{ uri: user.photoURL }}
                className="w-11 h-11 rounded-full"
                style={{
                  borderWidth: 2,
                  borderColor: "#1E3A8A",
                }}
              />
            ) : (
              // Fallback initials avatar
              <View
                className="w-11 h-11 rounded-full items-center justify-center"
                style={{ backgroundColor: "#1E3A8A" }}
              >
                <Text className="text-white text-base font-bold">
                  {user.name?.charAt(0) ?? "U"}
                </Text>
              </View>
            )}

            {/* Online indicator dot */}
            <View
              className="absolute bottom-0 right-0 w-3 h-3 rounded-full"
              style={{
                backgroundColor: "#22C55E",
                borderWidth: 2,
                borderColor: "#0A0F1E",
              }}
            />
          </View>

          {/* Greeting + Name */}
          <View className="flex-1">
            <Text
              className="text-xs font-medium"
              style={{ color: "#6B7280" }}
            >
              {getGreeting()}
            </Text>
            <Text
              className="text-base font-bold"
              style={{ color: "#F9FAFB" }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {user.name ?? "User"}
            </Text>
          </View>
        </View>

        {/* Right: Notification Bell + Badge */}
        <TouchableOpacity
          onPress={onNotificationPress}
          onPressIn={() => setNotifPressed(true)}
          onPressOut={() => setNotifPressed(false)}
          activeOpacity={1}
          className="relative items-center justify-center w-11 h-11 rounded-full"
          style={{
            backgroundColor: notifPressed ? "#1E2A45" : "#131929",
            borderWidth: 1,
            borderColor: "#1E2A45",
            transform: [{ scale: notifPressed ? 0.93 : 1 }],
          }}
        >
          <MaterialCommunityIcons
            name={"bell-outline" as IconName}
            size={22}
            color="#D1D5DB"
          />

          {/* Notification Badge */}
          {notificationCount > 0 && (
            <View
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full
                items-center justify-center px-1"
              style={{
                backgroundColor: "#EF4444",
                borderWidth: 2,
                borderColor: "#0A0F1E",
              }}
            >
              <Text
                className="text-white font-bold"
                style={{ fontSize: 10, lineHeight: 13 }}
              >
                {notificationCount > 99 ? "99+" : notificationCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
};

export default CustomHeader;