import { useEffect, useState } from "react";
import * as KeepAwake from "expo-keep-awake";

/**
 * A safe wrapper around Expo's keep awake functionality.
 * Prevents "Unhandled promise rejection: Unable to activate keep awake" crashes.
 * Ensures the app is fully mounted before attempting to lock screen awake.
 */
export function useSafeKeepAwake() {
  const [mounted, setMounted] = useState(false);

  // Defer execution until fully mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    let isActive = false;

    const activate = async () => {
      try {
        await KeepAwake.activateKeepAwakeAsync();
        isActive = true;
      } catch (error) {
        // Silently catch the rejection to prevent Dev/UI crashes
      }
    };

    activate();

    // Cleanup securely without rejecting
    return () => {
      if (isActive) {
        try {
          KeepAwake.deactivateKeepAwake().catch(() => {});
        } catch (e) {
          // ignore
        }
      }
    };
  }, [mounted]);
}
