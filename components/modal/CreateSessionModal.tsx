import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useState } from "react";
import { Platform, ScrollView, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";

interface CreateSessionModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (sessionCode: string) => void;
}

export const CreateSessionModal: React.FC<CreateSessionModalProps> = ({
  visible,
  onClose,
  onCreate,
}) => {
  const [sessionName, setSessionName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [sessionType, setSessionType] = useState<"On-site" | "Remote">("On-site");
  const [location, setLocation] = useState("");
  const [radius, setRadius] = useState("");

  const [dateObj, setDateObj] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDateObj(selectedDate);
      setDate(selectedDate.toLocaleDateString());
    }
  };

  const onTimeChange = (event: any, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDateObj(selectedDate);
      setTime(selectedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }
  };

  const handleGenerate = () => {
    const code = Math.random().toString(36).substr(2, 6).toUpperCase();
    onCreate(code);
    setSessionName("");
    setDate("");
    setTime("");
    setLocation("");
    setRadius("");
    setSessionType("On-site");
    onClose();
  };

  if (!visible) return null;

  return (
    <View 
      className="absolute top-0 left-0 right-0 bottom-0 z-50 flex-1 justify-center items-center" 
      style={{ backgroundColor: "rgba(0,0,0,0.5)", elevation: 100 }}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="absolute inset-0 w-full h-full" />
      </TouchableWithoutFeedback>

      <View 
        className="w-[90%] max-w-sm max-h-[85%] bg-white dark:bg-slate-800 rounded-2xl overflow-hidden flex-col"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.1,
          shadowRadius: 15,
          elevation: 10,
        }}
      >
        {/* Sticky Header */}
        <View className="flex-row justify-between items-center px-5 py-4 border-b border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800">
          <Text className="text-xl font-bold text-black dark:text-white">Create Session</Text>
          <TouchableOpacity onPress={onClose} className="p-1 rounded-full bg-gray-100 dark:bg-slate-700">
            <Ionicons name="close" size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
          <Text className="mb-1 text-sm text-gray-600 dark:text-gray-300 font-semibold">Session Name</Text>
          <TextInput
            className="w-full h-12 border border-gray-300 dark:border-slate-600 rounded-xl px-4 bg-gray-50 dark:bg-slate-700 text-black dark:text-white mb-4"
            placeholder="e.g. Advanced Mathematics Q1"
            placeholderTextColor="#9ca3af"
            value={sessionName}
            onChangeText={setSessionName}
          />

          <View className="flex-row justify-between mb-4 gap-3">
            <View className="flex-1">
              <Text className="mb-1 text-sm text-gray-600 dark:text-gray-300 font-semibold">Date</Text>
              <TouchableOpacity
                className="w-full h-12 border border-gray-300 dark:border-slate-600 rounded-xl px-4 bg-gray-50 dark:bg-slate-700 justify-center"
                activeOpacity={0.8}
                onPress={() => setShowDatePicker(true)}
              >
                <Text className={`text-base ${date ? "text-black dark:text-white" : "text-[#9ca3af]"}`}>
                  {date || "mm/dd/yyyy"}
                </Text>
              </TouchableOpacity>
            </View>
            <View className="flex-1">
              <Text className="mb-1 text-sm text-gray-600 dark:text-gray-300 font-semibold">Time</Text>
              <TouchableOpacity
                className="w-full h-12 border border-gray-300 dark:border-slate-600 rounded-xl px-4 bg-gray-50 dark:bg-slate-700 justify-center"
                activeOpacity={0.8}
                onPress={() => setShowTimePicker(true)}
              >
                <Text className={`text-base ${time ? "text-black dark:text-white" : "text-[#9ca3af]"}`}>
                  {time || "--:-- --"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={dateObj}
              mode="date"
              display="default"
              onChange={onDateChange}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={dateObj}
              mode="time"
              display="default"
              onChange={onTimeChange}
            />
          )}

          <Text className="mb-1 text-sm text-gray-600 dark:text-gray-300 font-semibold">Session Type</Text>
          <View className="flex-row rounded-xl border border-gray-300 dark:border-slate-600 overflow-hidden mb-4 bg-gray-50 dark:bg-slate-700 p-1">
            {(["On-site", "Remote"] as const).map((type) => (
              <TouchableOpacity
                key={type}
                activeOpacity={0.8}
                className={`flex-1 items-center justify-center py-2.5 rounded-lg ${
                  sessionType === type ? "bg-white dark:bg-slate-600" : "bg-transparent"
                }`}
                style={
                  sessionType === type
                    ? {
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.1,
                        shadowRadius: 2,
                        elevation: 2,
                      }
                    : undefined
                }
                onPress={() => setSessionType(type)}
              >
                <Text
                  className={`font-semibold ${
                    sessionType === type ? "text-blue-600 dark:text-blue-300 font-bold" : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View className="flex-row gap-3 mb-4">
            <View className="flex-[2]">
              <Text className="mb-1 text-sm text-gray-600 dark:text-gray-300 font-semibold">Location</Text>
              <TextInput
                className="w-full h-12 border border-gray-300 dark:border-slate-600 rounded-xl px-4 bg-gray-50 dark:bg-slate-700 text-black dark:text-white"
                placeholder="Room / Building"
                placeholderTextColor="#9ca3af"
                value={location}
                onChangeText={setLocation}
              />
            </View>
            <View className="flex-[1]">
              <Text className="mb-1 text-sm text-gray-600 dark:text-gray-300 font-semibold">Radius (m)</Text>
              <TextInput
                className="w-full h-12 border border-gray-300 dark:border-slate-600 rounded-xl px-4 bg-gray-50 dark:bg-slate-700 text-black dark:text-white"
                placeholder="20"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                value={radius}
                onChangeText={setRadius}
              />
            </View>
          </View>

            <Text className="mb-2 text-sm text-gray-600 dark:text-gray-300 font-semibold">Authentication Methods</Text>
            <View className="flex-row flex-wrap gap-2 mb-2">
              {[
                "Manual Check-In",
                "QR Based",
                "Geolocation",
                "Facial Recognition", 
              
            ].map((method) => (
              <View key={method} className="rounded-full px-3 py-1.5 bg-blue-50 dark:bg-slate-700 border border-blue-100 dark:border-slate-600">
                <Text className="text-blue-700 dark:text-blue-200 text-xs font-semibold">{method}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
        
        {/* Sticky Footer */}
        <View className="p-4 border-t border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800">
          <TouchableOpacity
            className="w-full bg-blue-600 dark:bg-blue-500 rounded-xl py-3.5 items-center"
            style={{
              shadowColor: "#2563eb",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 4,
            }}
            onPress={handleGenerate}
            activeOpacity={0.8}
          >
            <Text className="text-white font-bold text-base">Generate Session</Text>
          </TouchableOpacity>
        </View>

      </View>
    </View>
  );
};
