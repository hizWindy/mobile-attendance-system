import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { TextInput, View } from "react-native";
import { ThemedText } from "../themed-text";

interface SearchSessionsProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  hasError?: boolean;
  errorMessage?: string;
}

export const SearchSessions: React.FC<SearchSessionsProps> = ({
  value,
  onChangeText,
  placeholder = "Search Sessions...",
  hasError = false,
  errorMessage = "",
}) => {
  const [focused, setFocused] = useState(false);

  const handleTextChange = (text: string) => {
    if (text.length <= 6) {
      onChangeText(text);
    }
  };

  return (
    <View className="w-full relative">
      {/* Vibrantly Pill (Noticeable & Branded) */}
      {value.length === 6 && focused && !hasError && (
        <View className="absolute -bottom-11 left-0 right-0 items-center z-50">
          <View 
            className="w-2.5 h-2.5 bg-indigo-600 -mb-1" 
            style={{ transform: [{ rotate: "45deg" }] }}
          />
          <View className="flex-row items-center bg-indigo-600 px-3 py-1.5 rounded-xl shadow-lg border border-white/20">
            <MaterialCommunityIcons name="information-variant" size={12} color="white" />
            <ThemedText className="text-white text-[10px] font-medium ml-1">
              Maximum 6 digits
            </ThemedText>
          </View>
        </View>
      )}

      <View
        className={`flex-row items-center w-full h-12 px-4 rounded-xl border transition-colors ${
          hasError
            ? "bg-white dark:bg-slate-800 border-red-500"
            : focused
            ? "bg-white dark:bg-slate-800 border-blue-500 dark:border-blue-400"
            : "bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700"
        }`}
      >
        <MaterialCommunityIcons
          name="magnify"
          size={24}
          color={hasError ? "#ef4444" : focused ? "#3b82f6" : "#9ca3af"}
          style={{ marginRight: 8 }}
        />
        <TextInput
          value={value}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          keyboardType="default"
          autoCapitalize="characters"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="flex-1 text-base text-[#001F54] dark:text-white font-semibold"
        />
        
        {hasError && (
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={20}
            color="#ef4444"
            className="ml-2"
          />
        )}
      </View>

      {hasError && errorMessage && (
        <ThemedText className="text-red-500 text-[11px] font-medium mt-1 ml-1">
          {errorMessage}
        </ThemedText>
      )}
    </View>
  );
};
