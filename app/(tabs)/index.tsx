import { CheckInButton } from "@/components/button/CheckInButton";
import { CheckInModal } from "@/components/modal/CheckInModal";
import { SearchSessions } from "@/components/search/SearchSessions";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";

export default function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [modalVisible, setModalVisible] = useState(false);

  const sessions = ["ABC123", "DEF456", "GHI789"];

  const handleCheckIn = () => {
    const trimmedQuery = searchQuery.trim();
    const exists = sessions.some(
      (session) => session.toLowerCase() === trimmedQuery.toLowerCase(),
    );
    if (!exists) {
      alert("Session doesn't exist");
    } else {
      setModalVisible(true);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.componentsContainer}>
        <SearchSessions
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Enter Session Code"
          width={300}
          height={60}
        />
        <CheckInButton onPress={handleCheckIn} width={300} height={60} />

        <CheckInModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSelectType={(type) => alert(`You selected: ${type}`)}
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
