import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import {
  Image,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Type definition for the user prop
type User = {
  name?: string;
  photoURL?: string;
};

type CustomHeaderProps = {
  user?: User;
};

// Default user with valid image URL
export const DEFAULT_USER: User = {
  name: "Al-khair Pama",
  photoURL: "https://api.dicebear.com/7.x/adventurer/png?seed=alkhair",
};

const CustomHeader: React.FC<CustomHeaderProps> = ({ user = DEFAULT_USER }) => {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: Colors[colorScheme ?? "light"].tint },
      ]}
    >
      <View style={styles.container}>
        {/* Left: Profile Picture + Name */}
        <View style={styles.leftContainer}>
          {user.photoURL && (
            <Image
              source={{ uri: user.photoURL }}
              style={styles.profileImage}
            />
          )}
          <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
            {user.name ?? "User"}
          </Text>
        </View>

        {/* Right: Notification Icon */}
        <TouchableOpacity>
          <MaterialCommunityIcons name="bell-outline" size={28} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  container: {
    height: 60,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1, // ensures name truncates if needed
  },
  profileImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  userName: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    flexShrink: 1, // prevents overflow
  },
});

export default CustomHeader;
