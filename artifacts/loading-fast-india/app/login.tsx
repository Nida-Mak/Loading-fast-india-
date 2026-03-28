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
import { ADMIN_PIN, useApp, UserRole } from "@/context/AppContext";

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

  // Merchant-specific fields
  const [businessName, setBusinessName] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [aadhaarHidden, setAadhaarHidden] = useState(true);

  const [adminPin, setAdminPin] = useState("");
  const [showAdminPin, setShowAdminPin] = useState(false);

  const [errors, setErrors] = useState<{
    name?: string;
    phone?: string;
    businessName?: string;
    aadhaar?: string;
    gst?: string;
    adminPin?: string;
  }>({});

  const [suspendedMsg, setSuspendedMsg] = useState("");
  const [blacklistedMsg, setBlacklistedMsg] = useState("");

  const formatAadhaar = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, "").slice(0, 12);
    return digits.replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3").trim();
  };

  const formatGst = (raw: string) =>
    raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15);

  const validate = () => {
    const errs: typeof errors = {};
    if (!name.trim() || name.trim().length < 2) {
      errs.name = "Enter your full name";
    }
    if (!phone.trim() || phone.trim().length < 10) {
      errs.phone = "Enter valid 10-digit phone number";
    }
    if (selectedRole === "merchant") {
      if (!businessName.trim()) {
        errs.businessName = "Enter your business / firm name";
      }
      const rawAadhaar = aadhaarNumber.replace(/\s/g, "");
      if (!rawAadhaar || rawAadhaar.length !== 12) {
        errs.aadhaar = "Enter valid 12-digit Aadhaar number";
      }
      const rawGst = gstNumber.replace(/\s/g, "");
      if (rawGst && rawGst.length !== 15) {
        errs.gst = "GST number must be 15 characters (e.g. 22AAAAA0000A1Z5)";
      }
    }
    if (selectedRole === "admin") {
      if (!adminPin.trim()) {
        errs.adminPin = "Admin PIN required";
      } else if (adminPin.trim() !== ADMIN_PIN) {
        errs.adminPin = "Galat PIN — Access denied";
      }
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
    setSuspendedMsg("");
    setBlacklistedMsg("");
    try {
      const extras =
        selectedRole === "merchant"
          ? {
              businessName: businessName.trim(),
              aadhaarNumber: aadhaarNumber.replace(/\s/g, ""),
              gstNumber: gstNumber.trim() || undefined,
            }
          : undefined;
      await login(name.trim(), phone.trim(), selectedRole, selectedCity, extras);
      router.replace("/(tabs)");
    } catch (err: any) {
      const msg: string = err?.message ?? "";
      if (msg.startsWith("BLACKLISTED:")) {
        setBlacklistedMsg(msg.replace("BLACKLISTED:", "").trim());
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else if (msg.startsWith("SUSPENDED:")) {
        setSuspendedMsg(msg.replace("SUSPENDED:", "").trim());
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
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

          {blacklistedMsg ? (
            <View style={[styles.suspendedBanner, { borderColor: "#7f1d1d", backgroundColor: "#1a0000" }]}>
              <MaterialCommunityIcons name="skull-crossbones" size={32} color="#ef4444" />
              <Text style={[styles.suspendedTitle, { color: "#ef4444", fontSize: 16 }]}>
                ⛔ BLACKLISTED — Account BLOCK Ho Gaya!
              </Text>
              <Text style={[styles.suspendedMsg, { color: "#fca5a5", lineHeight: 18 }]}>
                {blacklistedMsg}
              </Text>
              <View style={{ backgroundColor: "#7f1d1d33", borderRadius: 8, padding: 8, marginTop: 6, borderWidth: 1, borderColor: "#7f1d1d" }}>
                <Text style={{ fontSize: 11, color: "#fca5a5", textAlign: "center", fontWeight: "600" }}>
                  BNS 316 (Theft) & 318 (Cheating){"\n"}
                  Mangrol, Junagadh Jurisdiction
                </Text>
              </View>
              <Text style={[styles.suspendedContact, { color: "#9ca3af" }]}>
                Cyber Helpline: 1930  |  Police: 100 / 112
              </Text>
            </View>
          ) : suspendedMsg ? (
            <View style={styles.suspendedBanner}>
              <MaterialCommunityIcons name="account-cancel" size={28} color={Colors.error} />
              <Text style={styles.suspendedTitle}>Account Suspend Hai!</Text>
              <Text style={styles.suspendedMsg}>{suspendedMsg}</Text>
              <Text style={styles.suspendedContact}>
                Shikayat ke liye: admin@loadingfastindia.com ya helpline par sampark karein.
              </Text>
            </View>
          ) : null}

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

            {selectedRole === "merchant" && (
              <>
                <View style={styles.merchantBanner}>
                  <MaterialCommunityIcons
                    name="store-check-outline"
                    size={16}
                    color={Colors.primary}
                  />
                  <Text style={styles.merchantBannerText}>
                    Merchant KYC — Aadhaar aur GST se verify karein
                  </Text>
                </View>

                <Text style={styles.sectionLabel}>Business Details</Text>

                <View
                  style={[
                    styles.inputGroup,
                    errors.businessName ? styles.inputError : null,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="domain"
                    size={18}
                    color={Colors.textMuted}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Business / Firm name"
                    placeholderTextColor={Colors.textMuted}
                    value={businessName}
                    onChangeText={(v) => {
                      setBusinessName(v);
                      if (errors.businessName)
                        setErrors((e) => ({ ...e, businessName: undefined }));
                    }}
                    returnKeyType="next"
                  />
                </View>
                {errors.businessName ? (
                  <Text style={styles.errorText}>{errors.businessName}</Text>
                ) : null}

                <View style={styles.gstLabelRow}>
                  <Text style={styles.sectionLabel}>Aadhaar Card</Text>
                  <View style={[styles.optionalBadge, { backgroundColor: Colors.error + "18", borderColor: Colors.error + "33" }]}>
                    <Ionicons name="alert-circle" size={11} color={Colors.error} />
                    <Text style={[styles.optionalBadgeText, { color: Colors.error }]}>MANDATORY — Zaroori</Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.inputGroup,
                    errors.aadhaar ? styles.inputError : null,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="card-account-details-outline"
                    size={18}
                    color={Colors.textMuted}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="XXXX XXXX XXXX"
                    placeholderTextColor={Colors.textMuted}
                    value={aadhaarHidden ? aadhaarNumber.replace(/\d(?=\d{4})/g, "•") : aadhaarNumber}
                    onChangeText={(v) => {
                      const raw = v.replace(/[^0-9]/g, "");
                      setAadhaarNumber(formatAadhaar(raw));
                      if (errors.aadhaar)
                        setErrors((e) => ({ ...e, aadhaar: undefined }));
                    }}
                    keyboardType="numeric"
                    maxLength={14}
                    secureTextEntry={aadhaarHidden}
                  />
                  <Pressable onPress={() => setAadhaarHidden((h) => !h)}>
                    <Ionicons
                      name={aadhaarHidden ? "eye-outline" : "eye-off-outline"}
                      size={18}
                      color={Colors.textMuted}
                    />
                  </Pressable>
                </View>
                {errors.aadhaar ? (
                  <Text style={styles.errorText}>{errors.aadhaar}</Text>
                ) : null}
                <View style={styles.aadhaarNote}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={12}
                    color={Colors.textMuted}
                  />
                  <Text style={styles.aadhaarNoteText}>
                    12-digit number (aapka Aadhaar card). Securely encrypted.
                  </Text>
                </View>

                <View style={styles.gstLabelRow}>
                  <Text style={styles.sectionLabel}>GST Number</Text>
                  <View style={styles.optionalBadge}>
                    <Ionicons name="checkmark-circle" size={11} color={Colors.success} />
                    <Text style={styles.optionalBadgeText}>OPTIONAL — Zaroori Nahi</Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.inputGroup,
                    { borderColor: Colors.border, borderWidth: 1, borderStyle: "dashed" },
                    errors.gst ? styles.inputError : null,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="file-certificate-outline"
                    size={18}
                    color={Colors.textMuted}
                  />
                  <TextInput
                    style={[styles.input, { textTransform: "uppercase" }]}
                    placeholder="GST hai to daalen, nahi to khali chhodein"
                    placeholderTextColor={Colors.textMuted}
                    value={gstNumber}
                    onChangeText={(v) => {
                      setGstNumber(formatGst(v));
                      if (errors.gst)
                        setErrors((e) => ({ ...e, gst: undefined }));
                    }}
                    autoCapitalize="characters"
                    maxLength={15}
                    returnKeyType="done"
                  />
                  {gstNumber.length === 15 && (
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={18}
                      color={Colors.success}
                    />
                  )}
                </View>
                {errors.gst ? (
                  <Text style={styles.errorText}>{errors.gst}</Text>
                ) : null}
                <View style={styles.aadhaarNote}>
                  <Ionicons
                    name="information-circle-outline"
                    size={12}
                    color={Colors.success}
                  />
                  <Text style={[styles.aadhaarNoteText, { color: Colors.success }]}>
                    GST optional hai — sirf Aadhaar zaroori hai. GST nahi hai to yeh khali chhodein.
                  </Text>
                </View>
              </>
            )}

            {selectedRole === "admin" && (
              <>
                <View style={[styles.merchantBanner, { backgroundColor: "#1A0A2E", borderColor: "#6A0DAD44" }]}>
                  <MaterialCommunityIcons
                    name="shield-crown-outline"
                    size={16}
                    color="#A855F7"
                  />
                  <Text style={[styles.merchantBannerText, { color: "#A855F7" }]}>
                    Admin Access — Sirf authorized person ke liye
                  </Text>
                </View>

                <Text style={styles.sectionLabel}>Admin Secret PIN</Text>

                <View
                  style={[
                    styles.inputGroup,
                    errors.adminPin ? styles.inputError : null,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="shield-lock-outline"
                    size={18}
                    color={Colors.textMuted}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Secret PIN daalen"
                    placeholderTextColor={Colors.textMuted}
                    value={adminPin}
                    onChangeText={(v) => {
                      setAdminPin(v);
                      if (errors.adminPin)
                        setErrors((e) => ({ ...e, adminPin: undefined }));
                    }}
                    secureTextEntry={!showAdminPin}
                    autoCapitalize="none"
                    returnKeyType="done"
                  />
                  <Pressable onPress={() => setShowAdminPin((s) => !s)}>
                    <Ionicons
                      name={showAdminPin ? "eye-off-outline" : "eye-outline"}
                      size={18}
                      color={Colors.textMuted}
                    />
                  </Pressable>
                </View>
                {errors.adminPin ? (
                  <Text style={styles.errorText}>{errors.adminPin}</Text>
                ) : null}
                <View style={styles.aadhaarNote}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={12}
                    color={Colors.textMuted}
                  />
                  <Text style={styles.aadhaarNoteText}>
                    Yeh PIN sirf Loading Fast India ke owner ko pata hai.
                  </Text>
                </View>
              </>
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
                Aadhaar verified platform. Secured by LFI.{" "}
                <Text
                  style={styles.privacyLink}
                  onPress={() => router.push("/privacy-policy")}
                >
                  Privacy Policy
                </Text>
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
  merchantBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1A0A00",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#3A1500",
    marginTop: 4,
  },
  merchantBannerText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
  aadhaarNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: -4,
    paddingHorizontal: 4,
  },
  aadhaarNoteText: {
    flex: 1,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    lineHeight: 16,
  },
  optionalLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textTransform: "none",
  },
  gstLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  optionalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.success + "18",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.success + "33",
  },
  optionalBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    color: Colors.success,
    letterSpacing: 0.5,
  },
  privacyLink: {
    color: Colors.primary,
    fontFamily: "Inter_500Medium",
    textDecorationLine: "underline",
  },
  suspendedBanner: {
    marginHorizontal: 0,
    marginBottom: 16,
    backgroundColor: "#140000",
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: Colors.error,
    alignItems: "center",
    gap: 10,
  },
  suspendedTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.error,
    textAlign: "center",
  },
  suspendedMsg: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  suspendedContact: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 17,
    fontStyle: "italic",
  },
});
