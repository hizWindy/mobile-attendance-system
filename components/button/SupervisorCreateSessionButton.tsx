import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { ThemedText } from "../themed-text";

interface SupervisorCreateSessionButtonProps {
  onPress: () => void;
  title?: string;
  width?: number;
  height?: number;
}

export const SupervisorCreateSessionButton: React.FC<
  SupervisorCreateSessionButtonProps
> = ({ onPress, title = "Create Session", width = 260, height = 48 }) => {
  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        onPress={onPress}
        style={[styles.button, { width, height }]}
        activeOpacity={0.8}
      >
        <Ionicons
          name="add-circle-outline"
          size={20}
          color="#fff"
          style={styles.icon}
        />
        <ThemedText style={styles.text}>{title}</ThemedText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    width: "100%",
  },
  button: {
    backgroundColor: "#001F54",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },
});
