import { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef } from "react";
import { Animated, Pressable } from "react-native";

export function HapticTab(props: BottomTabBarButtonProps) {
  const { accessibilityState, onPress, onLongPress, children, style } = props;
  const focused = accessibilityState?.selected;

  // Scale spring for selected tab icon
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Translate UP when active (icon rises slightly)
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (focused) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1.15,
          useNativeDriver: true,
          tension: 200,
          friction: 10,
        }),
        Animated.spring(translateY, {
          toValue: -3,
          useNativeDriver: true,
          tension: 200,
          friction: 10,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 200,
          friction: 12,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 200,
          friction: 12,
        }),
      ]).start();
    }
  }, [focused]);

  return (
    <Pressable
      onPress={(ev) => {
        // Medium haptic on tab switch, light buzz on same tab re-tap
        if (!focused) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress?.(ev as any);
      }}
      onLongPress={(ev) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        onLongPress?.(ev as any);
      }}
      style={[
        style,
        {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        },
      ]}
    >
      <Animated.View
        style={{
          alignItems: "center",
          justifyContent: "center",
          transform: [
            { scale: scaleAnim },
            { translateY: translateY },
          ],
        }}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}
