import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { ThemedText } from "../themed-text";

interface CheckInButtonProps {
  onPress: () => void;
  title?: string;
  width?: number; // fixed width
  height?: number;
}

export const CheckInButton: React.FC<CheckInButtonProps> = ({
  onPress,
  title = "Check In",
  width = 200, // default width
  height = 60, // default height
}) => {
  const [pressed, setPressed] = useState(false);

  return (
    <View style={{ alignItems: "center" /* no background color */ }}>
      {/* Bottom dark layer for 3D effect */}
      <View
        style={{
          width,
          height,
          backgroundColor: "#00103A",
          borderRadius: 12,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 6,
        }}
      >
        <TouchableOpacity
          onPress={onPress}
          onPressIn={() => setPressed(true)}
          onPressOut={() => setPressed(false)}
          activeOpacity={1}
          style={{
            width,
            height,
            backgroundColor: pressed ? "#002A7A" : "#001F54",
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            transform: [{ translateY: pressed ? 3 : 0 }],
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="checkmark-circle" size={24} color="white" />
            <ThemedText
              style={{ color: "white", fontWeight: "bold", fontSize: 16, marginLeft: 8 }}
            >
              {title}
            </ThemedText>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};