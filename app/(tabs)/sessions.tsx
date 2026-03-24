import { IconSymbol } from "@/components/ui/icon-symbol";
import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

const SessionScreen = () => {
  const sessions = [
    { id: "1", title: "Jehan Session", date: "2023-10-01" },
    { id: "2", title: "Alfred Session", date: "2023-10-01" },
    { id: "3", title: "Evening Session", date: "2023-10-02" },
  ];

  const renderItem = ({ item }) => (
    <View style={styles.sessionItem}>
      <View style={styles.itemHeader}>
        <IconSymbol name="calendar" size={20} color="#000" />
        <Text style={styles.title}>{item.title}</Text>
      </View>
      <Text style={styles.date}>{item.date}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <IconSymbol name="calendar" size={24} color="#000" />
        <Text style={styles.header}>Sessions</Text>
      </View>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginLeft: 10,
  },
  sessionItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  title: {
    fontSize: 18,
    marginLeft: 10,
  },
  date: {
    fontSize: 14,
    color: "#666",
  },
});

export default SessionScreen;
