import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View, Dimensions, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface ActionToastProps {
  visible: boolean;
  type: "success" | "error" | "info";
  title: string;
  message?: string;
  onClose: () => void;
  autoHideDuration?: number; // ms
}

const { width } = Dimensions.get("window");

export const ActionToast: React.FC<ActionToastProps> = ({
  visible,
  type,
  title,
  message,
  onClose,
  autoHideDuration = 5000,
}) => {
  const panY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(panY, {
          toValue: 50, // slide down slightly from safe area top
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        closeToast();
      }, autoHideDuration);

      return () => clearTimeout(timer);
    } else {
      closeToast();
    }
  }, [visible]);

  const closeToast = () => {
    Animated.parallel([
      Animated.timing(panY, {
        toValue: -150,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose(); // Cleanup parent state after animation
    });
  };

  const getTheme = () => {
    switch (type) {
      case "success":
        return {
          icon: "checkmark-circle",
          color: "#10B981",
          bg: "#ECFDF5",
          border: "#D1FAE5",
        };
      case "error":
        return {
          icon: "alert-circle",
          color: "#EF4444",
          bg: "#FEF2F2",
          border: "#FEE2E2",
        };
      case "info":
      default:
        return {
          icon: "information-circle",
          color: "#3B82F6",
          bg: "#EFF6FF",
          border: "#DBEAFE",
        };
    }
  };

  const theme = getTheme();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: panY }],
          opacity,
          backgroundColor: theme.bg,
          borderColor: theme.border,
        },
      ]}
      pointerEvents={visible ? "auto" : "none"}
    >
      <View style={styles.content}>
        <Ionicons name={theme.icon as any} size={24} color={theme.color} />
        <View style={styles.textStack}>
          <Text style={[styles.title, { color: "#0F172A" }]}>{title}</Text>
          {!!message && (
            <Text style={styles.message}>{message}</Text>
          )}
        </View>
      </View>
      <TouchableOpacity style={styles.closeBtn} onPress={closeToast}>
        <Ionicons name="close" size={18} color="#64748B" />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 16,
    width: width - 32,
    zIndex: 9999,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  content: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    gap: 12,
  },
  textStack: {
    flex: 1,
    gap: 2,
    marginTop: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
  },
  message: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 18,
  },
  closeBtn: {
    marginLeft: 8,
    padding: 4,
  },
});
