import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const ProfileScreen = () => {
  const [user] = useState({
    name: "Al-khair Pama",
    email: "gregon34@gmail.com",
    role: "Administrator",
    avatar: "👤",
  });

  const MenuItem = ({ icon, label, onPress, showArrow = true }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemLeft}>
        <MaterialCommunityIcons name={icon} size={24} color="#007AFF" />
        <Text style={styles.menuLabel}>{label}</Text>
      </View>
      {showArrow && (
        <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      {/* ProfileScreen Header */}
      <View style={styles.ProfileScreenHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user.avatar}</Text>
        </View>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user.role}</Text>
        </View>
      </View>

      {/* Statistics */}
      <View style={styles.statsSection}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>92.5%</Text>
          <Text style={styles.statLabel}>Attendance</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>145</Text>
          <Text style={styles.statLabel}>Sessions</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>24</Text>
          <Text style={styles.statLabel}>Points</Text>
        </View>
      </View>

      {/* Menu Items */}
      <Text style={styles.sectionTitle}>Settings</Text>
      <View style={styles.menuSection}>
        <MenuItem
          icon="account-edit"
          label="Edit ProfileScreen"
          onPress={() => alert("Edit ProfileScreen")}
        />
        <MenuItem
          icon="lock"
          label="Change Password"
          onPress={() => alert("Change Password")}
        />
        <MenuItem
          icon="bell"
          label="Notifications"
          onPress={() => alert("Notifications")}
        />
        <MenuItem
          icon="palette"
          label="Appearance"
          onPress={() => alert("Appearance")}
        />
      </View>

      <Text style={styles.sectionTitle}>More</Text>
      <View style={styles.menuSection}>
        <MenuItem
          icon="help-circle"
          label="Help & Support"
          onPress={() => alert("Help & Support")}
        />
        <MenuItem
          icon="information"
          label="About"
          onPress={() => alert("About")}
        />
        <MenuItem
          icon="file-document"
          label="Privacy Policy"
          onPress={() => alert("Privacy Policy")}
        />
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton}>
        <MaterialCommunityIcons name="logout" size={20} color="#fff" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <View style={styles.spacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  ProfileScreenHeader: {
    alignItems: "center",
    paddingVertical: 30,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#E8F4FD",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 48,
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: "#E8F4FD",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleText: {
    color: "#007AFF",
    fontSize: 12,
    fontWeight: "600",
  },
  statsSection: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginVertical: 10,
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#007AFF",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#999",
  },
  divider: {
    width: 1,
    backgroundColor: "#eee",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginLeft: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  menuSection: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#eee",
    marginBottom: 10,
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  menuLabel: {
    fontSize: 16,
    color: "#333",
    marginLeft: 16,
  },
  logoutButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FF3B30",
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 10,
  },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  spacer: {
    height: 20,
  },
});

export default ProfileScreen;
