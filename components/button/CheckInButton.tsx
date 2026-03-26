import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { TouchableOpacity, View, Text, StyleSheet, useColorScheme } from "react-native";

interface CheckInButtonProps {
  onPress: () => void;
  title?: string;
}

export const CheckInButton: React.FC<CheckInButtonProps> = ({
  onPress,
  title = "Check In",
}) => {
  const isDark = useColorScheme() === 'dark';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={[styles.button, isDark && styles.buttonDark]}
      >
        <Ionicons name="checkmark-circle" size={24} color="white" />
        <Text style={styles.text}>
          {title}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
  button: {
    width: '100%',
    paddingVertical: 16,
    backgroundColor: '#001F54',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  buttonDark: {
    backgroundColor: '#334155', // slate-700
  },
  text: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  }
});