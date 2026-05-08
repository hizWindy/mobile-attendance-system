import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";

interface LocationMapModalProps {
  visible: boolean;
  onClose: () => void;
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
}

export function LocationMapModal({ 
  visible, 
  onClose, 
  latitude, 
  longitude, 
  title = "Current Location", 
  description = "Your exact GPS coordinates" 
}: LocationMapModalProps) {
  if (!visible) return null;

  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'} 
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white dark:bg-slate-900">
        <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm z-10">
          <View className="flex-1">
            <Text className="text-lg font-bold text-slate-900 dark:text-white" numberOfLines={1}>
              {title}
            </Text>
            {description ? (
              <Text className="text-xs text-slate-500 dark:text-slate-400 mt-1" numberOfLines={1}>
                {description}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity 
            onPress={onClose} 
            className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center ml-4"
          >
            <Ionicons name="close" size={24} color="#64748B" />
          </TouchableOpacity>
        </View>

        <View className="flex-1 overflow-hidden relative">
          <MapView
            style={styles.map}
            // Use standard provider
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            initialRegion={{
              latitude,
              longitude,
              latitudeDelta: 0.003,
              longitudeDelta: 0.003, // Tighter zoom
            }}
            showsUserLocation={true}
            showsMyLocationButton={true}
          >
            <Marker
              coordinate={{ latitude, longitude }}
              title={title}
              description={description}
            >
              <View className="items-center justify-center">
                <View className="w-12 h-12 bg-blue-500/20 rounded-full items-center justify-center">
                  <View className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-sm" />
                </View>
              </View>
            </Marker>
          </MapView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  map: {
    width: "100%",
    height: "100%",
  }
});
