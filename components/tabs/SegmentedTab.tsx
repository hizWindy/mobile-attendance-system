import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface SegmentedTabProps {
  options: { key: string; label: string }[];
  activeKey: string;
  onChange: (key: string) => void;
}

export const SegmentedTab: React.FC<SegmentedTabProps> = ({
  options,
  activeKey,
  onChange,
}) => {
  return (
    <View className="flex-row w-full bg-blue-50 dark:bg-slate-800 rounded-full p-1 border border-blue-100 dark:border-slate-700 mb-3">
      {options.map((option) => {
        const active = option.key === activeKey;
        return (
          <TouchableOpacity
            key={option.key}
            className={`flex-1 items-center py-2.5 rounded-full ${
              active
                ? "bg-white dark:bg-slate-700 border border-blue-200 dark:border-slate-600"
                : "bg-transparent border border-transparent"
            }`}
            onPress={() => onChange(option.key)}
            activeOpacity={0.8}
          >
            <Text
              className={`font-semibold ${
                active
                  ? "text-[#1f4d7a] dark:text-blue-100 font-extrabold"
                  : "text-blue-500 dark:text-slate-400"
              }`}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
