import { useColorScheme } from "@/hooks/use-color-scheme";
import { Inter_400Regular, Inter_700Bold } from "@expo-google-fonts/inter";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { Text } from "react-native";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthContext, AuthProvider } from "../context/AuthContext";
import { SessionProvider } from "../context/SessionContext";
import "../global.css";

export const unstable_settings = {
  anchor: "login",
};

function RootLayoutNav() {
  const { user, isLoading } = React.useContext(AuthContext);
  const segments = useSegments();
  const router = useRouter();

  React.useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(tabs)";

    if (!user && inAuthGroup) {
      // Redirect to login if NOT authenticated but trying to access tabs
      router.replace("/login");
    } else if (user && !inAuthGroup) {
      // Redirect to tabs if authenticated but trying to access login/register
      router.replace("/(tabs)");
    }
  }, [user, isLoading, segments]);

  if (isLoading) {
    // Show a basic loading state or splash screen while checking auth
    return null; 
  }

  return (
    <Stack
      screenOptions={{
        headerTitleStyle: { fontFamily: "Inter_700Bold", fontSize: 18 },
        headerStyle: {
          backgroundColor: "#ffffff",
        },
        headerTintColor: "#000000",
      }}
    >
      <Stack.Screen
        name="login"
        options={{ headerShown: false, animation: "fade" }}
      />
      <Stack.Screen
        name="register"
        options={{ headerShown: false, animation: "fade" }}
      />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="modal"
        options={{ presentation: "modal", title: "Modal" }}
      />
    </Stack>
  );
}

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
    <SafeAreaProvider>
      <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
        <AuthProvider>
          <SessionProvider>
            <RootLayoutNav />
            <StatusBar style={isDark ? "light" : "dark"} />
          </SessionProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
