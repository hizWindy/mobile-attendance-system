import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { TextInput, View } from "react-native";

interface SearchSessionsProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export const SearchSessions: React.FC<SearchSessionsProps> = ({
  value,
  onChangeText,
  placeholder = "Search Sessions...",
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <View
      className={`flex-row items-center w-full h-12 px-4 rounded-xl border ${
        focused
          ? "bg-white dark:bg-slate-800 border-blue-500 dark:border-blue-400"
          : "bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700"
      }`}
    >
      <MaterialCommunityIcons
        name="magnify"
        size={24}
        color={focused ? "#3b82f6" : "#9ca3af"}
        style={{ marginRight: 8 }}
      />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="flex-1 text-base text-[#001F54] dark:text-white"
      />
    </View>
  );
};
