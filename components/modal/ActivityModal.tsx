import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View, ScrollView, TouchableWithoutFeedback } from "react-native";
import { Activity } from "../activity/ActivityItem";

interface ActivityModalProps {
  visible: boolean;
  activity: Activity | null;
  onClose: () => void;
}

export const ActivityModal: React.FC<ActivityModalProps> = ({
  visible,
  activity,
  onClose,
}) => {
  if (!activity || !visible) return null;

  const getMeta = () => {
    switch (activity.type) {
      case "attendance":
        return {
          icon: <Ionicons name="checkmark-circle" size={30} color="#2563eb" />,
          label: "Attendance Action",
          description: "User checked into a session.",
          bgClass: "bg-blue-100 dark:bg-blue-900/30",
        };
      case "management":
        return {
          icon: <MaterialCommunityIcons name="shield-account" size={30} color="#7c3aed" />,
          label: "Management Action",
          description: "Administrative action performed.",
          bgClass: "bg-purple-100 dark:bg-purple-900/40",
        };
      default:
        return {
          icon: <Ionicons name="information-circle" size={30} color="#64748b" />,
          label: "System Event",
          description: "Background system activity.",
          bgClass: "bg-gray-100 dark:bg-slate-700",
        };
    }
  };

  const meta = getMeta();

  return (
    <View 
      className="absolute top-0 left-0 right-0 bottom-0 z-50 flex-1 justify-center items-center" 
      style={{ backgroundColor: "rgba(0,0,0,0.5)", elevation: 100 }}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="absolute inset-0 w-full h-full" />
      </TouchableWithoutFeedback>

      <View 
        className="w-[90%] max-w-sm max-h-[85%] bg-white dark:bg-slate-800 rounded-3xl overflow-hidden"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 15 },
          shadowOpacity: 0.15,
          shadowRadius: 20,
          elevation: 15,
        }}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24, paddingBottom: 32 }}>
          {/* Header */}
          <View className="flex-row justify-end mb-2">
            <TouchableOpacity onPress={onClose} className="p-1.5 rounded-full bg-gray-100 dark:bg-slate-700">
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>
          
          <View className="items-center mb-5">
            <View className={`w-16 h-16 rounded-2xl items-center justify-center mb-4 ${meta.bgClass}`}>
              {meta.icon}
            </View>
            <Text className="text-xl font-extrabold text-[#0f172a] dark:text-white text-center">{activity.title}</Text>
            <Text className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">{meta.label}</Text>
          </View>

          <Text className="text-center text-sm text-gray-500 dark:text-gray-300 mb-6 px-4 leading-5">{meta.description}</Text>

          <View className="bg-gray-50 dark:bg-slate-700 rounded-2xl p-4 border border-gray-100 dark:border-slate-600">
            <View className="flex-row items-center justify-between py-2 border-b border-gray-200 dark:border-slate-600">
              <View className="flex-row items-center">
                <Ionicons name="finger-print-outline" size={18} color="#9ca3af" />
                <Text className="ml-2 text-sm text-gray-500 dark:text-gray-300">Type</Text>
              </View>
              <Text className="text-sm font-bold text-[#0f172a] dark:text-blue-100 capitalize">{activity.type}</Text>
            </View>

            <View className="flex-row items-center justify-between py-2 mt-2">
              <View className="flex-row items-center">
                <Ionicons name="time-outline" size={18} color="#9ca3af" />
                <Text className="ml-2 text-sm text-gray-500 dark:text-gray-300">Logged At</Text>
              </View>
              <Text className="text-sm font-bold text-[#0f172a] dark:text-blue-100">{activity.timestamp}</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};
