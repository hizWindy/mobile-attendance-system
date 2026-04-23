import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface SupervisorCreateSessionButtonProps {
  onPress: () => void;
  title?: string;
}

export const SupervisorCreateSessionButton: React.FC<
  SupervisorCreateSessionButtonProps
> = ({ onPress, title = "Create Session" }) => {
  return (
    <View className="items-center w-full">
      <TouchableOpacity
        onPress={onPress}
        className="w-full py-4 bg-[#001F54] dark:bg-slate-700 rounded-xl justify-center items-center flex-row"
        activeOpacity={0.8}
      >
        <Ionicons
          name="add-circle-outline"
          size={20}
          color="#fff"
          className="mr-2"
        />
        <Text className="text-white font-bold text-base ml-2">
          {title}
        </Text>
      </TouchableOpacity>
    </View>
  );
};
