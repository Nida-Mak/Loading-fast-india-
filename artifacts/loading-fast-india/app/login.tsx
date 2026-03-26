import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useApp, UserRole } from "@/context/AppContext";

const { width } = Dimensions.get("window");

const CITIES = [
  "Mumbai",
  "Delhi",
  "Bangalore",
  "Chennai",
  "Kolkata",
  "Hyderabad",
  "Pune",
  "Ahmedabad",
  "Jaipur",
  "Surat",
  "Lucknow",
  "Kanpur",
];

const ROLES: { key: UserRole; label: string; icon: string; desc: string }[] = [
  {
    key: "merchant",
    label: "Merchant",
    icon: "storefront-outline",
    desc: "Book trips & manage shipments",
  },
  {
    key: "driver",
    label: "Driver",
    icon: "truck-delivery-outline",
    desc: "Accept trips & earn commissions",
  },
  {
    key: "admin",
    label: "Admin",
    icon: "shield-check-outline",
    desc: "Manage platform & view reports",
  },
];

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useApp();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("merchant");
  const [selectedCity, setSelectedCity] = useState("Mumbai");
  const [showCities, setShowCities] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  const validate = () => {
    const errs: { name?: string; phone?: string } = {};
    if (!name.trim() || name.trim().length < 2) {
      errs.name = "Enter your full name";
    }
    if (!phone.trim() || phone.trim().length < 10) {
      errs.phone = "Enter valid 10-digit phone number";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await login(name.trim(), phone.trim(), selectedRole, selectedCity);
      router.replace("/(tabs)");
    } catch {
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={["#1A0A00", "#0A0A0F"]}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: insets.bottom + 32 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={[Colors.primary, Colors.primaryLight]}
                style={styles.logoGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name="truck-fast" size={36} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={styles.brandName}>Loading Fast India</Text>
            <Text style={styles.tagline}>India ka sabse tez logistics platform</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.sectionLabel}>Select your role</Text>
            <View style={styles.rolesContainer}>
              {ROLES.map((role) => (
                <Pressable
                  key={role.key}
                  onPress={() => {
                    setSelectedRole(role.key);
                    Haptics.selectionAsync();
                  }}
                  style={[
                    styles.roleCard,
                    selectedRole === role.key && styles.roleCardActive,
                  ]}
                >
                  <MaterialCommunityIcons
                    name={role.icon as any}
                    size={22}
                    color={
                      selectedRole === role.key ? Colors.primary : Colors.textMuted
                    }
                  />
                  <Text
                    style={[
                      styles.roleLabel,
                      selectedRole === role.key && styles.roleLabelActive,
                    ]}
                  >
                    {role.label}
                  </Text>
                  <Text style={styles.roleDesc}>{role.desc}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Your details</Text>

            <View style={[styles.inputGroup, errors.name ? styles.inputError : null]}>
              <Ionicons name="person-outline" size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Full name"
                placeholderTextColor={Colors.textMuted}
                value={name}
                onChangeText={(v) => {
                  setName(v);
                  if (errors.name) setErrors((e) => ({ ...e, name: undefined }));
                }}
                returnKeyType="next"
              />
            </View>
            {errors.name ? (
              <Text style={styles.errorText}>{errors.name}</Text>
            ) : null}

            <View
              style={[styles.inputGroup, errors.phone ? styles.inputError : null]}
            >
              <Ionicons name="call-outline" size={18} color={Colors.textMuted} />
              <Text style={styles.phoneCode}>+91</Text>
              <TextInput
                style={styles.input}
                placeholder="Phone number"
                placeholderTextColor={Colors.textMuted}
                value={phone}
                onChangeText={(v) => {
                  setPhone(v.replace(/[^0-9]/g, "").slice(0, 10));
                  if (errors.phone) setErrors((e) => ({ ...e, phone: undefined }));
                }}
                keyboardType="numeric"
                returnKeyType="done"
                maxLength={10}
              />
            </View>
            {errors.phone ? (
              <Text style={styles.errorText}>{errors.phone}</Text>
            ) : null}

            <Pressable
              style={styles.inputGroup}
              onPress={() => {
                setShowCities((v) => !v);
                Haptics.selectionAsync();
              }}
            >
              <Ionicons name="location-outline" size={18} color={Colors.textMuted} />
              <Text style={[styles.input, { paddingTop: 0 }]}>{selectedCity}</Text>
              <Ionicons
                name={showCities ? "chevron-up" : "chevron-down"}
                size={16}
                color={Colors.textMuted}
              />
            </Pressable>

            {showCities && (
              <View style={styles.cityDropdown}>
                <ScrollView
                  style={{ maxHeight: 200 }}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={false}
                >
                  {CITIES.map((city) => (
                    <Pressable
                      key={city}
                      style={[
                        styles.cityOption,
                        selectedCity === city && styles.cityOptionActive,
                      ]}
                      onPress={() => {
                        setSelectedCity(city);
                        setShowCities(false);
                        Haptics.selectionAsync();
                      }}
                    >
                      <Text
                        style={[
                          styles.cityOptionText,
                          selectedCity === city && styles.cityOptionTextActive,
                        ]}
                      >
                        {city}
                      </Text>
                      {selectedCity === city && (
                        <Ionicons
                          name="checkmark"
                          size={16}
                          color={Colors.primary}
                        />
                      )}
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.loginBtn,
                pressed && { opacity: 0.85 },
              ]}
              onPress={handleLogin}
              disabled={loading}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryLight]}
                style={styles.loginBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.loginBtnText}>Continue</Text>
                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </Pressable>

            <View style={styles.termsRow}>
              <Ionicons
                name="shield-checkmark-outline"
                size={14}
                color={Colors.textMuted}
              />
              <Text style={styles.termsText}>
                Aadhaar verified platform. Secured by LFI.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 32,
  },
  logoContainer: {
    marginBottom: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    textAlign: "center",
    marginBottom: 6,
  },
  tagline: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  form: {
    flex: 1,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: 4,
  },
  rolesContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  roleCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  roleCardActive: {
    borderColor: Colors.primary,
    backgroundColor: "#1A0A00",
  },
  roleLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  roleLabelActive: {
    color: Colors.primary,
  },
  roleDesc: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 14,
  },
  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputError: {
    borderColor: Colors.error,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  phoneCode: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  errorText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.error,
    marginTop: -6,
    marginLeft: 4,
  },
  cityDropdown: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: -4,
    overflow: "hidden",
  },
  cityOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  cityOptionActive: {
    backgroundColor: "#1A0A00",
  },
  cityOptionText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  cityOptionTextActive: {
    color: Colors.primary,
    fontFamily: "Inter_500Medium",
  },
  loginBtn: {
    marginTop: 16,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  loginBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  loginBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
  },
  termsText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
});
