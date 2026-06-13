/**
 * utils/pushNotifications.ts
 *
 * Expo push-token registration & teardown.
 * ─ registerPushToken()  → request permission + register device with backend
 * ─ unregisterPushToken() → remove device token from backend on logout
 *
 * NOTE: Token registration is intentionally gated behind Device.isDevice
 * so it never fires in simulators / emulators (where push is unsupported).
 *
 * IMPORTANT: expo-notifications remote push was removed from Expo Go in SDK 53+.
 * All calls are wrapped in try/catch so the app degrades gracefully in Expo Go.
 * Push notifications will only work in a development build or production.
 */

import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import UserDeviceService from "../api/UserDevice";

// ─── Lazy-load expo-notifications to avoid crashes in Expo Go ──────────────
let Notifications: typeof import("expo-notifications") | null = null;

function getNotificationsModule() {
  if (Notifications) return Notifications;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Notifications = require("expo-notifications");
    return Notifications;
  } catch {
    console.warn("[Push] expo-notifications not available (Expo Go?)");
    return null;
  }
}

// ─── Check whether we're running inside Expo Go ────────────────────────────
function isExpoGo(): boolean {
  return Constants.appOwnership === "expo";
}

// ─── Configure default notification behaviour (safe init) ──────────────────
function initNotificationHandler() {
  if (isExpoGo()) {
    console.log("[Push] Skipping notification handler — running in Expo Go");
    return;
  }

  const N = getNotificationsModule();
  if (!N) return;

  try {
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (error) {
    console.warn("[Push] Failed to set notification handler:", error);
  }
}

// Initialize on import — but safely
initNotificationHandler();

// ─── Register push token after login ────────────────────────────────────────
export const registerPushToken = async (): Promise<void> => {
  // Skip entirely in Expo Go — push is not supported
  if (isExpoGo()) {
    console.log("[Push] Skipping registration — running in Expo Go");
    return;
  }

  // Only works on physical devices
  if (!Device.isDevice) {
    console.log("[Push] Skipping — not a physical device");
    return;
  }

  const N = getNotificationsModule();
  if (!N) return;

  try {
    // Check existing permission status
    const { status: existingStatus } = await N.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permission if not already granted
    if (existingStatus !== "granted") {
      const { status } = await N.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("[Push] Permission not granted");
      return;
    }

    // Android-specific: set up a notification channel
    if (Platform.OS === "android") {
      await N.setNotificationChannelAsync("default", {
        name: "Default",
        importance: N.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#1e4d7a",
      });
    }

    // Get the Expo push token
    const tokenData = await N.getExpoPushTokenAsync({
      projectId: undefined, // uses the projectId from app.json automatically
    });
    const token = tokenData.data;

    console.log("[Push] Expo push token:", token);

    // Register with backend
    await UserDeviceService.registerDevice({
      push_token: token,
      platform: Platform.OS as "ios" | "android",
      device_name: Device.deviceName ?? undefined,
    });

    console.log("[Push] Device registered with backend");
  } catch (error) {
    // Non-blocking — don't break login flow if push registration fails
    console.warn("[Push] Registration failed:", error);
  }
};

// ─── Unregister push token on logout ────────────────────────────────────────
export const unregisterPushToken = async (): Promise<void> => {
  try {
    await UserDeviceService.removeDeviceToken();
    console.log("[Push] Device token removed from backend");
  } catch (error) {
    // Non-blocking — don't break logout flow
    console.warn("[Push] Token removal failed:", error);
  }
};
