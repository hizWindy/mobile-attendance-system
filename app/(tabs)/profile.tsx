import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const COLORS = {
  primary: "#1e4d7a",
  bg: "#FFFFFF",
  muted: "#94A3B8",
  text: "#0F172A",
  danger: "#EF4444",
  border: "#F1F5F9",
};

import { AuthContext } from "@/context/AuthContext";

export default function ProfileScreen() {
  const router = useRouter();
  const { user: authUser, logout } = React.useContext(AuthContext);
  
  const user = {
    name: authUser?.full_name || "Guest User",
    email: authUser?.email || "No Email",
    initials: authUser?.full_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase() || "GU",
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to log out? This will flush all session tokens.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Logout", 
          style: "destructive", 
          onPress: async () => {
            await logout();
            // Redirection happens automatically in _layout.tsx
          } 
        }
      ]
    );
  };


  const ProfileMetric = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.metricItem}>
       <Text style={styles.metricVal}>{value}</Text>
       <Text style={styles.metricLab}>{label}</Text>
    </View>
  );

  const ListItem = ({ 
    icon, 
    label, 
    sub = "", 
    variant = "default", 
    isLast = false, 
    onPress 
  }: { 
    icon: any; 
    label: string; 
    sub?: string; 
    variant?: "default" | "danger"; 
    isLast?: boolean; 
    onPress: () => void;
  }) => (
    <TouchableOpacity 
      style={[styles.listItem, isLast && { borderBottomWidth: 0 }]} 
      onPress={onPress}
      activeOpacity={0.6}
    >
       <View style={styles.listIconWrap}>
          <MaterialCommunityIcons 
             name={icon} 
             size={20} 
             color={variant === "danger" ? COLORS.danger : COLORS.primary} 
          />
       </View>
       <View style={styles.listTextWrap}>
          <Text style={[styles.listLabel, variant === "danger" && { color: COLORS.danger, fontWeight: "800" }]}>{label}</Text>
          {sub ? <Text style={styles.listSub}>{sub}</Text> : null}
       </View>
       <Ionicons name="chevron-forward" size={14} color="#CBD5E1" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* 🌟 Minimal Header - Fixed size */}
        <View style={styles.header}>
           <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user.initials}</Text>
           </View>
           <Text style={styles.userName}>{user.name}</Text>
           <Text style={styles.userEmail}>{user.email}</Text>
        </View>

        {/* 📊 Simple Metrics Bar */}
        <View style={styles.metricsBar}>
           <ProfileMetric label="Attended" value="98%" />
           <View style={styles.hDivider} />
           <ProfileMetric label="Sessions" value="145" />
           <View style={styles.hDivider} />
           <ProfileMetric label="Points" value="2k" />
        </View>

        {/* ⚙ Settings List */}
        <View style={styles.section}>
           <Text style={styles.sectionHeader}>WORKSPACE</Text>
           <View style={styles.listCard}>
              <ListItem 
                icon="account-outline" 
                label="Profile Information" 
                sub="Manage your professional data"
                onPress={() => {}}
              />
              <ListItem 
                icon="shield-lock-outline" 
                label="Login & Security" 
                sub="Biometric access settings"
                onPress={() => {}}
              />
              <ListItem 
                icon="bell-ring-outline" 
                label="Notifications" 
                onPress={() => {}}
              />
              <ListItem 
                icon="palette" 
                label="Appearance" 
                isLast
                onPress={() => {}}
              />
           </View>
        </View>

        <View style={styles.section}>
           <Text style={styles.sectionHeader}>SESSION</Text>
           <View style={styles.listCard}>
              <ListItem 
                icon="lifebuoy" 
                label="Help Center" 
                onPress={() => {}}
              />
              <ListItem 
                icon="logout-variant" 
                label="Logout" 
                variant="danger"
                isLast
                onPress={handleLogout}
              />
           </View>
        </View>

        <View style={styles.footer}>
           <Text style={styles.versionInfo}>ClockWise Mobile v2.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    paddingVertical: 32,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "900",
    color: "white",
  },
  userName: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.text,
  },
  userEmail: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 2,
    fontWeight: "500",
  },
  metricsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 32,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  metricItem: {
    flex: 1,
    alignItems: "center",
  },
  metricVal: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.primary,
  },
  metricLab: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.muted,
    textTransform: "uppercase",
    marginTop: 2,
  },
  hDivider: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.border,
  },
  section: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: "900",
    color: COLORS.muted,
    letterSpacing: 1.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  listCard: {
    backgroundColor: "white",
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  listIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  listTextWrap: {
    flex: 1,
  },
  listLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },
  listSub: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 1,
  },
  footer: {
    marginTop: 48,
    alignItems: "center",
  },
  versionInfo: {
    fontSize: 10,
    fontWeight: "800",
    color: "#CBD5E1",
    letterSpacing: 1,
  },
});
