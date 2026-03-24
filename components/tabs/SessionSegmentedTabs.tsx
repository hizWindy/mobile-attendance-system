// components/tabs/SessionSegmentedTabs.tsx
import React from "react";
import { View, StyleSheet } from "react-native";
import { SegmentedTab } from "./SegmentedTab";

interface SessionSegmentedTabsProps {
  activeKey: "all" | "active" | "past" | "upcoming";
  onChange: (key: "all" | "active" | "past" | "upcoming") => void;
}

export const SessionSegmentedTabs: React.FC<SessionSegmentedTabsProps> = ({
  activeKey,
  onChange,
}) => {
  const options = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "past", label: "Past" },
    { key: "upcoming", label: "Upcoming" },
  ];

  return (
    <View style={styles.container}>
      <SegmentedTab
        options={options}
        activeKey={activeKey}
        onChange={(key) => onChange(key as "all" | "active" | "past" | "upcoming")}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    marginVertical: 12,
  },
});