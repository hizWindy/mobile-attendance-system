import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import React, { useState } from "react";
import {
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
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Alert } from "react-native";
import { AuthContext } from "../context/AuthContext";

const COLORS = {
  primary: "#1e4d7a",
  bg: "#FFFFFF",
  muted: "#94A3B8",
  text: "#0F172A",
  inputBorder: "#F1F5F9",
};

export default function RegisterScreen() {
  const router = useRouter();
  const { signup } = React.useContext(AuthContext);
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!firstName || !lastName || !userName || !email || !password) {
        Alert.alert("Error", "Please fill in all required fields.");
        return;
    }

    Keyboard.dismiss();
    setIsLoading(true);
    try {
        await signup({
            first_name: firstName,
            last_name: lastName,
            user_name: userName,
            email: email,
            password: password
        });
        router.replace({ pathname: "/(tabs)", params: { registerSuccess: "true" } });
    } catch (error: any) {
        console.log("Registration failed", error?.message);
        const detail = error.response?.data?.detail || "Registration failed. Please try again.";
        Alert.alert("Registration Failed", detail);
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
          {/* 🔙 Tiny Back Nav */}
          <TouchableOpacity 
            style={styles.simpleBack}
            onPress={() => router.back()}
          >
             <Ionicons name="chevron-back" size={20} color={COLORS.primary} />
             <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          {/* 🌟 Minimal Header */}
          <View style={styles.minimalHeader}>
             <Image
               source={require("@/assets/images/logo.png")}
               style={styles.tinyLogo}
             />
             <Text style={styles.brandTitle}>ClockWise</Text>
          </View>

          {/* 📄 Elegant Form Section */}
          <View style={styles.content}>
             <View style={styles.headerTextSection}>
                <Text style={styles.welcomeText}>Create Account</Text>
                <Text style={styles.subText}>Join the professional network.</Text>
             </View>

             <View style={styles.form}>
                
                {/* First Name & Last Name */}
                <View style={{ flexDirection: "row", gap: 12 }}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.label}>FIRST NAME</Text>
                        <TextInput
                            style={[styles.input, focusedField === "first_name" && styles.inputFocused]}
                            placeholder="John"
                            placeholderTextColor="#CBD5E1"
                            value={firstName}
                            onChangeText={setFirstName}
                            onFocus={() => setFocusedField("first_name")}
                            onBlur={() => setFocusedField(null)}
                            selectionColor={COLORS.primary}
                        />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.label}>LAST NAME</Text>
                        <TextInput
                            style={[styles.input, focusedField === "last_name" && styles.inputFocused]}
                            placeholder="Wick"
                            placeholderTextColor="#CBD5E1"
                            value={lastName}
                            onChangeText={setLastName}
                            onFocus={() => setFocusedField("last_name")}
                            onBlur={() => setFocusedField(null)}
                            selectionColor={COLORS.primary}
                        />
                    </View>
                </View>

                {/* Username */}
                <View style={styles.inputGroup}>
                   <Text style={styles.label}>USERNAME</Text>
                   <TextInput
                      style={[styles.input, focusedField === "user_name" && styles.inputFocused]}
                      placeholder="jwick"
                      placeholderTextColor="#CBD5E1"
                      value={userName}
                      onChangeText={setUserName}
                      onFocus={() => setFocusedField("user_name")}
                      onBlur={() => setFocusedField(null)}
                      selectionColor={COLORS.primary}
                   />
                </View>

                {/* Email */}
                <View style={styles.inputGroup}>
                   <Text style={styles.label}>EMAIL ADDRESS</Text>
                   <TextInput
                      style={[styles.input, focusedField === "email" && styles.inputFocused]}
                      placeholder="work@example.com"
                      placeholderTextColor="#CBD5E1"
                      value={email}
                      onChangeText={setEmail}
                      onFocus={() => setFocusedField("email")}
                      onBlur={() => setFocusedField(null)}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      selectionColor={COLORS.primary}
                   />
                </View>

                {/* Password Grid */}
                <View style={styles.inputGroup}>
                   <Text style={styles.label}>PASSWORD</Text>
                   <View style={styles.passRow}>
                      <TextInput
                        style={[styles.input, styles.flex1, focusedField === "pass" && styles.inputFocused]}
                        placeholder="••••••"
                        placeholderTextColor="#CBD5E1"
                        secureTextEntry={!showPassword}
                        value={password}
                        onChangeText={setPassword}
                        onFocus={() => setFocusedField("pass")}
                        onBlur={() => setFocusedField(null)}
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

                {/* Primary Button */}
                <View style={styles.btnRow}>
                   <TouchableOpacity 
                     style={[styles.primaryBtn, isLoading && { opacity: 0.7 }]} 
                     onPress={handleRegister}
                     disabled={isLoading}
                     activeOpacity={0.8}
                   >
                      <Text style={styles.btnText}>{isLoading ? "Registering..." : "Register Now"}</Text>
                      {!isLoading && <Ionicons name="rocket-outline" size={18} color="white" />}
                   </TouchableOpacity>
                </View>
             </View>

             <View style={styles.footer}>
                <Text style={styles.footerText}>Existing member? </Text>
                <Link href="/login" asChild>
                   <TouchableOpacity>
                      <Text style={styles.registerLink}>Log In</Text>
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
    paddingTop: 10,
    paddingBottom: 40,
    flexGrow: 1,
  },
  simpleBack: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 40,
    marginLeft: -4,
  },
  backText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: "700",
    marginLeft: 4,
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
