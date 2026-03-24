import { CheckInButton } from "@/components/button/CheckInButton";
import { SearchSessions } from "@/components/search/SearchSessions";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";

export default function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <View style={styles.container}>
      <View style={styles.componentsContainer}>
        <SearchSessions
          value={searchQuery}
          onChangeText={setSearchQuery}
          width={300}
          height={60}
        />
        <CheckInButton
          onPress={() => alert("Checked In!")}
        width = {300}
          height={60}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fefefe",
  },
  componentsContainer: {
    flexDirection: "column",
    alignItems: "center",
    padding: 16,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 16,
  },
  reactLogo: {
    width: 200,
    height: 120,
    resizeMode: "contain",
    alignSelf: "center",
    marginVertical: 16,
  },
  infoContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
});
