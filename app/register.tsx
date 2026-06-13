/**
 * app/register.tsx
 *
 * Registration screen — iOS/Android native-feeling design.
 * ─ Tooltip-style animated error callouts (not plain inline text)
 * ─ Optional middle name field
 * ─ Simple password strength bar (not overcomplicated)
 * ─ Confirm password with match indicator
 * ─ Keyboard-next ref chaining through all fields
 * ─ Server error banner
 * ─ Design matches login screen tokens exactly
 */

import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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

// ─── Design tokens (matches login.tsx) ───────────────────────────────────────
const C = {
  primary: "#1e4d7a",
  bg: "#FFFFFF",
  muted: "#94A3B8",
  text: "#0F172A",
  inputBorder: "#F1F5F9",
  danger: "#EF4444",
  dangerBg: "#FEF2F2",
  success: "#22C55E",
};

// ─── Password strength (simple — 3 levels) ───────────────────────────────────
function getStrength(pw: string): { pct: number; label: string; color: string } {
  if (!pw) return { pct: 0, label: "", color: "transparent" };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 2) return { pct: 0.33, label: "Weak", color: "#EF4444" };
  if (score <= 3) return { pct: 0.66, label: "Fair", color: "#F59E0B" };
  return { pct: 1, label: "Strong", color: "#22C55E" };
}

// ─── Animated tooltip error ──────────────────────────────────────────────────
function Tooltip({ message }: { message?: string }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-4)).current;

  useEffect(() => {
    if (message) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, tension: 300, friction: 15, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }).start();
    }
  }, [message]);

  if (!message) return null;

  return (
    <Animated.View style={[st.tooltip, { opacity, transform: [{ translateY }] }]}>
      <View style={st.tooltipArrow} />
      <View style={st.tooltipBody}>
        <Ionicons name="warning-outline" size={12} color={C.danger} />
        <Text style={st.tooltipText}>{message}</Text>
      </View>
    </Animated.View>
  );
}

// ─── Validation ──────────────────────────────────────────────────────────────
interface Errs {
  firstName?: string;
  lastName?: string;
  userName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

function isEmail(v: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

// ═════════════════════════════════════════════════════════════════════════════
// SCREEN
// ═════════════════════════════════════════════════════════════════════════════
export default function RegisterScreen() {
  const router = useRouter();
  const { signup } = React.useContext(AuthContext);

  // Fields
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  // UI
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Errs>({});
  const [serverErr, setServerErr] = useState<string | null>(null);

  // Refs for keyboard chaining
  const middleRef = useRef<TextInput>(null);
  const lastRef = useRef<TextInput>(null);
  const userRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const pwRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const btnScale = useRef(new Animated.Value(1)).current;
  const strength = getStrength(password);

  // ── Validate ────────────────────────────────────────────────────────
  const validate = useCallback((): boolean => {
    const e: Errs = {};
    if (!firstName.trim()) e.firstName = "Required";
    if (!lastName.trim()) e.lastName = "Required";
    if (!userName.trim()) e.userName = "Required";
    else if (userName.length < 3) e.userName = "At least 3 characters";
    else if (!/^[a-zA-Z0-9_]+$/.test(userName)) e.userName = "Letters, numbers, _ only";
    if (!email.trim()) e.email = "Required";
    else if (!isEmail(email)) e.email = "Invalid email format";
    if (!password) e.password = "Required";
    else if (password.length < 6) e.password = "At least 6 characters";
    if (!confirmPw) e.confirmPassword = "Required";
    else if (password !== confirmPw) e.confirmPassword = "Passwords don't match";
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [firstName, lastName, userName, email, password, confirmPw]);

  // ── Submit ──────────────────────────────────────────────────────────
  const handleRegister = async () => {
    setServerErr(null);
    if (!validate()) return;
    Keyboard.dismiss();
    setLoading(true);

    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.timing(btnScale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();

    try {
      await signup({
        first_name: firstName.trim(),
        ...(middleName.trim() ? { middle_name: middleName.trim() } : {}),
        last_name: lastName.trim(),
        user_name: userName.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      router.replace({ pathname: "/(tabs)", params: { registerSuccess: "true" } });
    } catch (error: any) {
      const detail =
        error.response?.data?.detail ??
        error.response?.data?.message ??
        "Registration failed. Please try again.";
      setServerErr(detail);
    } finally {
      setLoading(false);
    }
  };

  const clear = (f: keyof Errs) => {
    if (errors[f]) setErrors(p => ({ ...p, [f]: undefined }));
    if (serverErr) setServerErr(null);
  };

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={st.container}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={st.flex1}
      >
        <ScrollView
          contentContainerStyle={st.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ← Back */}
          <TouchableOpacity
            style={st.backBtn}
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={20} color={C.primary} />
            <Text style={st.backLabel}>Back</Text>
          </TouchableOpacity>

          {/* Brand */}
          <View style={st.brand}>
            <Image source={require("@/assets/images/logo.png")} style={st.logo} />
            <Text style={st.brandName}>ClockWise</Text>
          </View>

          {/* Header */}
          <View style={st.headerSection}>
            <Text style={st.title}>Create Account</Text>
            <Text style={st.subtitle}>
              Fill in your details to get started.
            </Text>
          </View>

          {/* Server error */}
          {serverErr && (
            <View style={st.serverBanner}>
              <Ionicons name="alert-circle" size={16} color={C.danger} />
              <Text style={st.serverBannerText}>{serverErr}</Text>
            </View>
          )}

          {/* ── Form ── */}
          <View style={st.form}>

            {/* Row 1: First name + Middle name */}
            <View style={st.row}>
              <View style={[st.fieldWrap, { flex: 1 }]}>
                <Text style={st.label}>FIRST NAME</Text>
                <TextInput
                  style={[
                    st.input,
                    focused === "first" && st.inputFocused,
                    errors.firstName && st.inputErr,
                  ]}
                  placeholder="John"
                  placeholderTextColor="#CBD5E1"
                  value={firstName}
                  onChangeText={t => { setFirstName(t); clear("firstName"); }}
                  onFocus={() => setFocused("first")}
                  onBlur={() => setFocused(null)}
                  selectionColor={C.primary}
                  returnKeyType="next"
                  onSubmitEditing={() => middleRef.current?.focus()}
                  autoCapitalize="words"
                />
                <Tooltip message={errors.firstName} />
              </View>

              <View style={[st.fieldWrap, { flex: 0.7 }]}>
                <View style={st.labelRow}>
                  <Text style={st.label}>MIDDLE</Text>
                  <Text style={st.optionalTag}>Optional</Text>
                </View>
                <TextInput
                  ref={middleRef}
                  style={[
                    st.input,
                    focused === "middle" && st.inputFocused,
                  ]}
                  placeholder="M."
                  placeholderTextColor="#CBD5E1"
                  value={middleName}
                  onChangeText={setMiddleName}
                  onFocus={() => setFocused("middle")}
                  onBlur={() => setFocused(null)}
                  selectionColor={C.primary}
                  returnKeyType="next"
                  onSubmitEditing={() => lastRef.current?.focus()}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Row 2: Last name (full width) */}
            <View style={st.fieldWrap}>
              <Text style={st.label}>LAST NAME</Text>
              <TextInput
                ref={lastRef}
                style={[
                  st.input,
                  focused === "last" && st.inputFocused,
                  errors.lastName && st.inputErr,
                ]}
                placeholder="Doe"
                placeholderTextColor="#CBD5E1"
                value={lastName}
                onChangeText={t => { setLastName(t); clear("lastName"); }}
                onFocus={() => setFocused("last")}
                onBlur={() => setFocused(null)}
                selectionColor={C.primary}
                returnKeyType="next"
                onSubmitEditing={() => userRef.current?.focus()}
                autoCapitalize="words"
              />
              <Tooltip message={errors.lastName} />
            </View>

            {/* Username */}
            <View style={st.fieldWrap}>
              <Text style={st.label}>USERNAME</Text>
              <TextInput
                ref={userRef}
                style={[
                  st.input,
                  focused === "user" && st.inputFocused,
                  errors.userName && st.inputErr,
                ]}
                placeholder="johndoe"
                placeholderTextColor="#CBD5E1"
                value={userName}
                onChangeText={t => { setUserName(t); clear("userName"); }}
                onFocus={() => setFocused("user")}
                onBlur={() => setFocused(null)}
                selectionColor={C.primary}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
              />
              <Tooltip message={errors.userName} />
            </View>

            {/* Email */}
            <View style={st.fieldWrap}>
              <Text style={st.label}>EMAIL ADDRESS</Text>
              <TextInput
                ref={emailRef}
                style={[
                  st.input,
                  focused === "email" && st.inputFocused,
                  errors.email && st.inputErr,
                ]}
                placeholder="john@example.com"
                placeholderTextColor="#CBD5E1"
                value={email}
                onChangeText={t => { setEmail(t); clear("email"); }}
                onFocus={() => setFocused("email")}
                onBlur={() => setFocused(null)}
                autoCapitalize="none"
                keyboardType="email-address"
                selectionColor={C.primary}
                returnKeyType="next"
                onSubmitEditing={() => pwRef.current?.focus()}
              />
              <Tooltip message={errors.email} />
            </View>

            {/* Password */}
            <View style={st.fieldWrap}>
              <Text style={st.label}>PASSWORD</Text>
              <View style={st.passRow}>
                <TextInput
                  ref={pwRef}
                  style={[
                    st.input,
                    st.flex1,
                    focused === "pw" && st.inputFocused,
                    errors.password && st.inputErr,
                  ]}
                  placeholder="Min. 6 characters"
                  placeholderTextColor="#CBD5E1"
                  secureTextEntry={!showPw}
                  value={password}
                  onChangeText={t => { setPassword(t); clear("password"); }}
                  onFocus={() => setFocused("pw")}
                  onBlur={() => setFocused(null)}
                  selectionColor={C.primary}
                  returnKeyType="next"
                  onSubmitEditing={() => confirmRef.current?.focus()}
                />
                <TouchableOpacity
                  style={st.eyeBtn}
                  onPress={() => setShowPw(!showPw)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name={showPw ? "eye-off" : "eye"} size={20} color={C.muted} />
                </TouchableOpacity>
              </View>
              <Tooltip message={errors.password} />

              {/* Strength bar — simple single bar, not segments */}
              {password.length > 0 && (
                <View style={st.strengthRow}>
                  <View style={st.strengthTrack}>
                    <View
                      style={[
                        st.strengthFill,
                        { width: `${strength.pct * 100}%`, backgroundColor: strength.color },
                      ]}
                    />
                  </View>
                  <Text style={[st.strengthLabel, { color: strength.color }]}>
                    {strength.label}
                  </Text>
                </View>
              )}
            </View>

            {/* Confirm password */}
            <View style={st.fieldWrap}>
              <Text style={st.label}>CONFIRM PASSWORD</Text>
              <View style={st.passRow}>
                <TextInput
                  ref={confirmRef}
                  style={[
                    st.input,
                    st.flex1,
                    focused === "confirm" && st.inputFocused,
                    errors.confirmPassword && st.inputErr,
                  ]}
                  placeholder="Re-enter password"
                  placeholderTextColor="#CBD5E1"
                  secureTextEntry={!showConfirm}
                  value={confirmPw}
                  onChangeText={t => { setConfirmPw(t); clear("confirmPassword"); }}
                  onFocus={() => setFocused("confirm")}
                  onBlur={() => setFocused(null)}
                  selectionColor={C.primary}
                  returnKeyType="go"
                  onSubmitEditing={handleRegister}
                />
                <TouchableOpacity
                  style={st.eyeBtn}
                  onPress={() => setShowConfirm(!showConfirm)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name={showConfirm ? "eye-off" : "eye"} size={20} color={C.muted} />
                </TouchableOpacity>
              </View>
              <Tooltip message={errors.confirmPassword} />

              {/* Match ✓ */}
              {confirmPw.length > 0 && !errors.confirmPassword && password === confirmPw && (
                <View style={st.matchRow}>
                  <Ionicons name="checkmark-circle" size={14} color={C.success} />
                  <Text style={st.matchText}>Passwords match</Text>
                </View>
              )}
            </View>

            {/* Register button */}
            <View style={st.btnWrap}>
              <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                <TouchableOpacity
                  style={[st.btn, loading && { opacity: 0.7 }]}
                  onPress={handleRegister}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <>
                      <ActivityIndicator size="small" color="#fff" />
                      <Text style={st.btnText}>Creating Account…</Text>
                    </>
                  ) : (
                    <>
                      <Text style={st.btnText}>Create Account</Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" />
                    </>
                  )}
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>

          {/* Footer */}
          <View style={st.footer}>
            <Text style={st.footerText}>Already have an account? </Text>
            <Link href="/login" asChild>
              <TouchableOpacity>
                <Text style={st.footerLink}>Log In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STYLES
// ═════════════════════════════════════════════════════════════════════════════
const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  flex1: { flex: 1 },
  scroll: {
    paddingHorizontal: 28,
    paddingTop: 10,
    paddingBottom: 40,
    flexGrow: 1,
  },

  // Back
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
    marginLeft: -4,
  },
  backLabel: {
    fontSize: 16,
    color: C.primary,
    fontWeight: "700",
    marginLeft: 4,
  },

  // Brand
  brand: { alignItems: "center", marginBottom: 36 },
  logo: { width: 32, height: 32, resizeMode: "contain", marginBottom: 8 },
  brandName: {
    fontSize: 20,
    fontWeight: "900",
    color: C.text,
    letterSpacing: -0.5,
  },

  // Header
  headerSection: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: "800", color: C.text },
  subtitle: { fontSize: 14, color: C.muted, marginTop: 6, fontWeight: "500" },

  // Server error
  serverBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.dangerBg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  serverBannerText: { fontSize: 13, color: C.danger, fontWeight: "600", flex: 1 },

  // Form
  form: { gap: 20 },
  row: { flexDirection: "row", gap: 10 },
  fieldWrap: { gap: 6 },

  // Label
  label: {
    fontSize: 10,
    fontWeight: "800",
    color: C.muted,
    letterSpacing: 1.5,
    marginLeft: 2,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  optionalTag: {
    fontSize: 9,
    fontWeight: "600",
    color: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: "hidden",
  },

  // Input
  input: {
    height: 50,
    borderBottomWidth: 2,
    borderColor: C.inputBorder,
    fontSize: 16,
    color: C.text,
    fontWeight: "600",
    paddingHorizontal: 4,
  },
  inputFocused: { borderColor: C.primary },
  inputErr: { borderColor: C.danger },

  // Password
  passRow: { flexDirection: "row", alignItems: "center" },
  eyeBtn: { position: "absolute", right: 0, bottom: 12 },

  // Tooltip error
  tooltip: { marginTop: 2 },
  tooltipArrow: {
    width: 0,
    height: 0,
    marginLeft: 12,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 5,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: C.dangerBg,
  },
  tooltipBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.dangerBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tooltipText: {
    fontSize: 11,
    color: C.danger,
    fontWeight: "600",
  },

  // Strength
  strengthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 2,
  },
  strengthTrack: {
    flex: 1,
    height: 3,
    backgroundColor: "#E2E8F0",
    borderRadius: 2,
    overflow: "hidden",
  },
  strengthFill: {
    height: 3,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },

  // Match
  matchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 0,
  },
  matchText: { fontSize: 11, color: C.success, fontWeight: "600" },

  // Button
  btnWrap: { marginTop: 8 },
  btn: {
    backgroundColor: C.primary,
    height: 56,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: { elevation: 4 },
    }),
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "800" },

  // Footer
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 36,
  },
  footerText: { fontSize: 14, color: C.muted, fontWeight: "500" },
  footerLink: { fontSize: 14, color: C.primary, fontWeight: "900" },
});
