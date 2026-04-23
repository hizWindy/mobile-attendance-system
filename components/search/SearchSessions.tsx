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

  const [showLimitWarning, setShowLimitWarning] = useState(false);

  const handleTextChange = (text: string) => {
    // Allow alphanumeric input and auto-capitalize
    const alphanumericValue = text.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    
    if (alphanumericValue.length > 6) {
      // Trigger warning tooltip if attempting to exceed 6 characters
      setShowLimitWarning(true);
      setTimeout(() => setShowLimitWarning(false), 2500);
    }
    
    // Trim and sync
    if (alphanumericValue.length <= 6) {
      onChangeText(alphanumericValue);
    }
  };

  return (
    <View className="w-full relative">
      {/* Warning Tooltip (Only visible when user tries to exceed 6 digits) */}
      {showLimitWarning && focused && (
        <View className="absolute -bottom-11 left-0 right-0 items-center z-50">
          <View 
            className="w-2.5 h-2.5 bg-red-500 -mb-1 border-t border-l border-white/20" 
            style={{ transform: [{ rotate: "45deg" }] }}
          />
          <View className="flex-row items-center bg-red-500 px-3 py-1.5 rounded-xl shadow-lg border border-white/20">
            <MaterialCommunityIcons name="alert-circle" size={12} color="white" />
            <ThemedText className="text-white text-[10px] font-medium ml-1">
              Session code must be exactly 6 characters
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
