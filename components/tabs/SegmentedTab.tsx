import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface SegmentedTabProps {
  options: { key: string; label: string }[];
  activeKey: string;
  onChange: (key: string) => void;
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    maxWidth: 340,
    flexDirection: "row",
    backgroundColor: "#f2f7ffcc",
    borderRadius: 999,
    padding: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#d8e1ef",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 999,
  },
  tabButtonActive: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#cacedc",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontWeight: "700",
  },
  tabTextActive: {
    color: "#1f4d7a",
    fontWeight: "800",
  },
  tabTextInactive: {
    color: "#769ed1",
  },
});

export const SegmentedTab: React.FC<SegmentedTabProps> = ({
  options,
  activeKey,
  onChange,
}) => {
  return (
    <View style={styles.container}>
      {options.map((option) => {
        const active = option.key === activeKey;
        return (
          <TouchableOpacity
            key={option.key}
            style={[styles.tabButton, active && styles.tabButtonActive]}
            onPress={() => onChange(option.key)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabText,
                active ? styles.tabTextActive : styles.tabTextInactive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
