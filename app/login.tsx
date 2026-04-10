import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthContext } from "../context/AuthContext";

const COLORS = {
  primary: "#1e4d7a",
  bg: "#FFFFFF",
  muted: "#94A3B8",
  text: "#0F172A",
  inputBorder: "#F1F5F9",
};

export default function LoginScreen() {
  const router = useRouter();
  const { login } = React.useContext(AuthContext);
  const [user_name, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!user_name || !password) {
      Alert.alert("Error", "Please enter both username and password.");
      return;
    }

    Keyboard.dismiss();
    setIsLoading(true);
    try {
      await login(user_name, password);
      router.replace({ pathname: "/(tabs)", params: { loginSuccess: "true" } });
    } catch (error: any) {
      // Use console.log for handled errors to keep the UI clean
      console.log("Login failed as expected for wrong credentials");
      const detail = error.response?.data?.detail || "Invalid username or password";
      Alert.alert("Login Failed", detail);
    } finally {

      setIsLoading(false);
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex1}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 🌟 Minimal Header (Clean & Pure) */}
          <View style={styles.minimalHeader}>
             <Image
               source={require("@/assets/images/logo.png")}
               style={styles.tinyLogo}
             />
             <Text style={styles.brandTitle}>ClockWise</Text>
             <Text style={styles.brandTag}>Precision Attendance</Text>
          </View>

          {/* 📝 Elegant Form Section */}
          <View style={styles.content}>
             <View style={styles.headerTextSection}>
                <Text style={styles.welcomeText}>Login</Text>
                <Text style={styles.subText}>Please enter your professional credentials.</Text>
             </View>

             <View style={styles.form}>
                {/* Email / User */}
                <View style={styles.inputGroup}>
                   <Text style={styles.label}>CREDENTIAL</Text>
                   <TextInput
                      style={[styles.input, focusedField === "user_name" && styles.inputFocused]}
                      placeholder="Username"
                      placeholderTextColor="#CBD5E1"
                      value={user_name}
                      onChangeText={setUserName}
                      onFocus={() => setFocusedField("user_name")}
                      onBlur={() => setFocusedField(null)}
                      autoCapitalize="none"
                      selectionColor={COLORS.primary}
                   />
                </View>

                {/* Password */}
                <View style={styles.inputGroup}>
                   <View style={styles.rowBetween}>
                      <Text style={styles.label}>PASSWORD</Text>
                      <TouchableOpacity>
                         <Text style={styles.linkSmall}>Forgot?</Text>
                      </TouchableOpacity>
                   </View>
                   <View style={styles.passRow}>
                      <TextInput
                        style={[styles.input, styles.flex1, focusedField === "pass" && styles.inputFocused]}
                        placeholder="Secret Pin"
                        placeholderTextColor="#CBD5E1"
                        value={password}
                        onChangeText={setPassword}
                        onFocus={() => setFocusedField("pass")}
                        onBlur={() => setFocusedField(null)}
                        secureTextEntry={!showPassword}
                        selectionColor={COLORS.primary}
                      />
                      <TouchableOpacity 
                        style={styles.eyeBtn}
                        onPress={() => setShowPassword(!showPassword)}
                      >
                         <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={COLORS.muted} />
                      </TouchableOpacity>
                   </View>
                </View>

                {/* Biometric Link (Elegant Icon instead of large button) */}
                <View style={styles.biometricRow}>
                    <TouchableOpacity style={styles.bioIconBtn}>
                       <MaterialCommunityIcons name="face-recognition" size={24} color={COLORS.primary} />
                       <Text style={styles.bioText}>Use FaceID</Text>
                    </TouchableOpacity>
                </View>

                {/* Primary Button */}
                <View style={styles.btnRow}>
                   <TouchableOpacity 
                     style={[styles.primaryBtn, isLoading && { opacity: 0.7 }]} 
                     onPress={handleLogin}
                     disabled={isLoading}
                     activeOpacity={0.8}
                   >
                      <Text style={styles.btnText}>{isLoading ? "Authenticating..." : "Login"}</Text>
                      {!isLoading && <Ionicons name="arrow-forward" size={18} color="white" />}
                   </TouchableOpacity>
                </View>
             </View>

             <View style={styles.footer}>
                <Text style={styles.footerText}>Need an account? </Text>
                <Link href="/register" asChild>
                   <TouchableOpacity>
                      <Text style={styles.registerLink}>Register</Text>
                   </TouchableOpacity>
                </Link>
             </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  flex1: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 32,
    paddingTop: 40,
    paddingBottom: 40,
    flexGrow: 1,
  },
  minimalHeader: {
    alignItems: "center",
    marginBottom: 48,
  },
  tinyLogo: {
    width: 32,
    height: 32,
    resizeMode: "contain",
    marginBottom: 8,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  brandTag: {
    fontSize: 8,
    fontWeight: "800",
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  headerTextSection: {
    marginBottom: 32,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.text,
  },
  subText: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 6,
    fontWeight: "500",
  },
  form: {
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.muted,
    letterSpacing: 1.5,
    marginLeft: 2,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  linkSmall: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: "700",
  },
  input: {
    height: 52,
    borderBottomWidth: 2,
    borderColor: COLORS.inputBorder,
    fontSize: 16,
    color: COLORS.text,
    fontWeight: "700",
    paddingHorizontal: 4,
  },
  inputFocused: {
    borderColor: COLORS.primary,
  },
  passRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  eyeBtn: {
    position: "absolute",
    right: 0,
    bottom: 12,
  },
  biometricRow: {
    marginTop: 8,
  },
  bioIconBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bioText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  btnRow: {
    marginTop: 16,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  btnText: {
    color: "white",
    fontSize: 16,
    fontWeight: "800",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 48,
  },
  footerText: {
    fontSize: 14,
    color: COLORS.muted,
    fontWeight: "500",
  },
  registerLink: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "900",
  },
});
