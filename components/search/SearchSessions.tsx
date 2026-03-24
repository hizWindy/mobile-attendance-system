// components/SearchSessions.tsx
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { TextInput, View } from "react-native";

interface SearchSessionsProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  width?: number;
  height?: number;
}

export const SearchSessions: React.FC<SearchSessionsProps> = ({
  value,
  onChangeText,
  placeholder = "Search Sessions...",
  width,
  height,
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <View
      className="flex-row items-center bg-white rounded-xl shadow-lg px-4 py-2 mx-4 my-2"
      style={{
        width,
        height,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 6, // Android shadow
      }}
    >
      <MaterialCommunityIcons
        name="magnify"
        size={24}
        color={focused ? "#001F54" : "#999999"}
        className="mr-2"
      />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#999999"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="flex-1 text-base text-[#001F54]"
      />
    </View>
  );
};
