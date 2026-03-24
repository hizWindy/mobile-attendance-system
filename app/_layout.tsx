import React from "react";
import { Text } from "react-native";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFonts } from "expo-font";
import { Inter_400Regular, Inter_700Bold } from "@expo-google-fonts/inter";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [loaded] = useFonts({
    Inter_400Regular,
    Inter_700Bold,
  });

  if (!loaded) return null;

  (Text as any).defaultProps = {
    ...(Text as any).defaultProps,
    style: { fontFamily: "Inter_400Regular" },
  };

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          // ⚠️ React Navigation headers cannot use Tailwind className —
          // these must stay as plain style objects
          headerTitleStyle: { fontFamily: "Inter_700Bold", fontSize: 18 },
          headerStyle: {
            backgroundColor: isDark ? "#000000" : "#ffffff",
          },
          headerTintColor: isDark ? "#ffffff" : "#000000",
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", title: "Modal" }}
        />
      </Stack>

      <StatusBar style={isDark ? "light" : "dark"} />
    </ThemeProvider>
  );
}