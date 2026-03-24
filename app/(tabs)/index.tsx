import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { HelloWave } from "@/components/hello-wave";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

export default function HomeScreen() {

  return (
    <View style={styles.container}>
      

      {/* Welcome Section */}
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome!</ThemedText>
        <HelloWave />
      </ThemedView>

      {/* Logo */}
      <Image
        source={require("@/assets/images/partial-react-logo.png")}
        style={styles.reactLogo}
      />

      {/* Some Info / Description */}
      <ThemedView style={styles.infoContainer}>
        <ThemedText>
          This is your main Home screen. You can put any content here, like cards, lists, or features.
        </ThemedText>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fefefe",
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