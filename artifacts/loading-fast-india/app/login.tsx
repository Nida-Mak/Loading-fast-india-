import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
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
import { ADMIN_PIN, useApp, UserRole, DriverVehicle, MerchantBusiness } from "@/context/AppContext";

type SavedLogin = { name: string; phone: string; role: UserRole; city: string };

const { width } = Dimensions.get("window");

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

const ROLE_ICONS: Record<UserRole, string> = {
  merchant: "storefront-outline",
  driver: "truck-delivery-outline",
  admin: "shield-check-outline",
};
const ROLE_LABELS: Record<UserRole, string> = {
  merchant: "Merchant",
  driver: "Driver",
  admin: "Admin",
};

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useApp();

  const [savedLogins, setSavedLogins] = useState<SavedLogin[]>([]);
  const [quickLoading, setQuickLoading] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("merchant");
  const [selectedCity, setSelectedCity] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("lfi_saved_logins")
      .then((raw) => {
        try { if (raw) setSavedLogins(JSON.parse(raw)); } catch {}
      })
      .catch(() => {});
  }, []);

  // Merchant-specific fields
  const [businessName, setBusinessName] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [aadhaarHidden, setAadhaarHidden] = useState(true);

  const [adminPin, setAdminPin] = useState("");
  const [showAdminPin, setShowAdminPin] = useState(false);

  const [termsAccepted, setTermsAccepted] = useState(false);

  // Multi-Entity: Driver Vehicles
  const [driverVehicles, setDriverVehicles] = useState<
    { vehicleNumber: string; aadhaarNumber: string; aadhaarHidden: boolean }[]
  >([]);

  // Multi-Entity: Merchant Businesses
  const [merchantEntities, setMerchantEntities] = useState<
    { businessName: string; aadhaarNumber: string; address: string; gstNumber: string; aadhaarHidden: boolean }[]
  >([]);

  const addDriverVehicle = () => {
    if (driverVehicles.length >= 2) return;
    setDriverVehicles((v) => [...v, { vehicleNumber: "", aadhaarNumber: "", aadhaarHidden: true }]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const removeDriverVehicle = (i: number) => {
    setDriverVehicles((v) => v.filter((_, idx) => idx !== i));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const addMerchantEntity = () => {
    if (merchantEntities.length >= 2) return;
    setMerchantEntities((v) => [...v, { businessName: "", aadhaarNumber: "", address: "", gstNumber: "", aadhaarHidden: true }]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const removeMerchantEntity = (i: number) => {
    setMerchantEntities((v) => v.filter((_, idx) => idx !== i));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const formatAadhaarRaw = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, "").slice(0, 12);
    return digits.replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3").trim();
  };

  const [errors, setErrors] = useState<{
    name?: string;
    phone?: string;
    city?: string;
    businessName?: string;
    aadhaar?: string;
    gst?: string;
    adminPin?: string;
    terms?: string;
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
    if (!selectedCity.trim()) {
      errs.city = "Apna sheher / location zaroor likhein";
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
    if (selectedRole !== "admin" && !termsAccepted) {
      errs.terms = "Terms & Conditions se agree karna zaroori hai / शर्तें स्वीकार करना ज़रूरी है";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const saveLoginToMemory = async (s: SavedLogin) => {
    const existing: SavedLogin[] = savedLogins.filter(
      (l) => !(l.phone === s.phone && l.role === s.role)
    );
    const updated = [s, ...existing].slice(0, 5);
    setSavedLogins(updated);
    await AsyncStorage.setItem("lfi_saved_logins", JSON.stringify(updated));
  };

  const handleQuickLogin = async (saved: SavedLogin) => {
    setQuickLoading(saved.phone + saved.role);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await login(saved.name, saved.phone, saved.role, saved.city);
      // Navigation handled by _layout.tsx useEffect (avoids double navigation crash)
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
      setQuickLoading(null);
    }
  };

  const handleRemoveSaved = async (s: SavedLogin) => {
    const updated = savedLogins.filter(
      (l) => !(l.phone === s.phone && l.role === s.role)
    );
    setSavedLogins(updated);
    await AsyncStorage.setItem("lfi_saved_logins", JSON.stringify(updated));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
      const builtDriverVehicles: DriverVehicle[] = driverVehicles
        .filter((v) => v.vehicleNumber.trim() && v.aadhaarNumber.replace(/\s/g, "").length === 12)
        .map((v) => ({
          id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
          vehicleNumber: v.vehicleNumber.trim().toUpperCase(),
          aadhaarNumber: v.aadhaarNumber.replace(/\s/g, ""),
          addedAt: new Date().toISOString(),
        }));

      const builtMerchantEntities: MerchantBusiness[] = merchantEntities
        .filter((e) => e.businessName.trim() && e.aadhaarNumber.replace(/\s/g, "").length === 12 && e.address.trim())
        .map((e) => ({
          id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
          businessName: e.businessName.trim(),
          aadhaarNumber: e.aadhaarNumber.replace(/\s/g, ""),
          address: e.address.trim(),
          gstNumber: e.gstNumber.trim() || undefined,
          addedAt: new Date().toISOString(),
        }));

      const extras =
        selectedRole === "merchant"
          ? {
              businessName: businessName.trim(),
              aadhaarNumber: aadhaarNumber.replace(/\s/g, ""),
              gstNumber: gstNumber.trim() || undefined,
              merchantEntities: builtMerchantEntities.length > 0 ? builtMerchantEntities : undefined,
            }
          : selectedRole === "driver"
          ? {
              driverVehicles: builtDriverVehicles.length > 0 ? builtDriverVehicles : undefined,
            }
          : undefined;
      await login(name.trim(), phone.trim(), selectedRole, selectedCity, extras);
      if (selectedRole !== "admin") {
        saveLoginToMemory({
          name: name.trim(),
          phone: phone.trim(),
          role: selectedRole,
          city: selectedCity.trim(),
        }).catch(() => {});
      }
      // Navigation handled by _layout.tsx useEffect (avoids double navigation crash)
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

          {savedLogins.length > 0 && (
            <View style={styles.savedSection}>
              <Text style={styles.savedTitle}>
                <Ionicons name="bookmark" size={14} color={Colors.primary} /> Yaad Kiye Hue Accounts
              </Text>
              {savedLogins.map((s) => (
                <View key={s.phone + s.role} style={styles.savedCard}>
                  <View style={styles.savedAvatar}>
                    <Ionicons name={ROLE_ICONS[s.role] as any} size={22} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.savedName}>{s.name}</Text>
                    <Text style={styles.savedSub}>
                      {ROLE_LABELS[s.role]} • {s.phone}
                    </Text>
                    <Text style={styles.savedCity}>{s.city}</Text>
                  </View>
                  <Pressable
                    style={styles.savedRemoveBtn}
                    onPress={() => handleRemoveSaved(s)}
                  >
                    <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                  </Pressable>
                  <Pressable
                    style={styles.savedLoginBtn}
                    onPress={() => handleQuickLogin(s)}
                    disabled={!!quickLoading}
                  >
                    {quickLoading === s.phone + s.role ? (
                      <ActivityIndicator size={14} color="#fff" />
                    ) : (
                      <Text style={styles.savedLoginText}>Login ▶</Text>
                    )}
                  </Pressable>
                </View>
              ))}
              <View style={styles.savedDivider}>
                <View style={styles.savedLine} />
                <Text style={styles.savedOr}>ya naya account</Text>
                <View style={styles.savedLine} />
              </View>
            </View>
          )}

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

            <View style={[styles.inputGroup, errors.city ? { borderColor: Colors.error } : {}]}>
              <Ionicons name="location-outline" size={18} color={errors.city ? Colors.error : Colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Aapka sheher / location likhein"
                placeholderTextColor={Colors.textMuted}
                value={selectedCity}
                onChangeText={(v) => { setSelectedCity(v); setErrors((e) => ({ ...e, city: undefined })); }}
                returnKeyType="done"
                autoCapitalize="words"
              />
            </View>
            {errors.city ? (
              <Text style={styles.errorText}>{errors.city}</Text>
            ) : null}

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

                {/* ===== MERCHANT MULTI-ENTITY ===== */}
                <View style={styles.entitySectionHeader}>
                  <MaterialCommunityIcons name="domain-plus" size={15} color={Colors.primary} />
                  <Text style={styles.entitySectionTitle}>Additional Business Profiles (Max 2)</Text>
                </View>
                {merchantEntities.map((ent, i) => (
                  <View key={i} style={styles.entityCard}>
                    <View style={styles.entityCardHead}>
                      <Text style={styles.entityCardLabel}>Business #{i + 2}</Text>
                      <Pressable onPress={() => removeMerchantEntity(i)}>
                        <Ionicons name="close-circle" size={18} color={Colors.error} />
                      </Pressable>
                    </View>
                    <View style={styles.inputGroup}>
                      <MaterialCommunityIcons name="domain" size={16} color={Colors.textMuted} />
                      <TextInput
                        style={styles.input}
                        placeholder="Business / Firm Name *"
                        placeholderTextColor={Colors.textMuted}
                        value={ent.businessName}
                        onChangeText={(v) => setMerchantEntities((prev) => prev.map((e, idx) => idx === i ? { ...e, businessName: v } : e))}
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <Ionicons name="location-outline" size={16} color={Colors.textMuted} />
                      <TextInput
                        style={styles.input}
                        placeholder="Business Address *"
                        placeholderTextColor={Colors.textMuted}
                        value={ent.address}
                        onChangeText={(v) => setMerchantEntities((prev) => prev.map((e, idx) => idx === i ? { ...e, address: v } : e))}
                        autoCapitalize="words"
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <MaterialCommunityIcons name="card-account-details-outline" size={16} color={Colors.textMuted} />
                      <TextInput
                        style={styles.input}
                        placeholder="Aadhaar Number *"
                        placeholderTextColor={Colors.textMuted}
                        value={ent.aadhaarHidden ? ent.aadhaarNumber.replace(/\d(?=\d{4})/g, "•") : ent.aadhaarNumber}
                        onChangeText={(v) => {
                          const raw = v.replace(/[^0-9]/g, "");
                          setMerchantEntities((prev) => prev.map((e, idx) => idx === i ? { ...e, aadhaarNumber: formatAadhaarRaw(raw) } : e));
                        }}
                        keyboardType="numeric"
                        maxLength={14}
                        secureTextEntry={ent.aadhaarHidden}
                      />
                      <Pressable onPress={() => setMerchantEntities((prev) => prev.map((e, idx) => idx === i ? { ...e, aadhaarHidden: !e.aadhaarHidden } : e))}>
                        <Ionicons name={ent.aadhaarHidden ? "eye-outline" : "eye-off-outline"} size={16} color={Colors.textMuted} />
                      </Pressable>
                    </View>
                    <View style={[styles.inputGroup, { borderStyle: "dashed", borderColor: Colors.border }]}>
                      <MaterialCommunityIcons name="file-certificate-outline" size={16} color={Colors.textMuted} />
                      <TextInput
                        style={styles.input}
                        placeholder="GST Number (Optional)"
                        placeholderTextColor={Colors.textMuted}
                        value={ent.gstNumber}
                        onChangeText={(v) => setMerchantEntities((prev) => prev.map((e, idx) => idx === i ? { ...e, gstNumber: formatGst(v) } : e))}
                        autoCapitalize="characters"
                        maxLength={15}
                      />
                    </View>
                  </View>
                ))}
                {merchantEntities.length < 2 && (
                  <Pressable style={styles.addEntityBtn} onPress={addMerchantEntity}>
                    <Ionicons name="add-circle-outline" size={16} color={Colors.primary} />
                    <Text style={styles.addEntityBtnText}>+ Doosra Business Add Karein</Text>
                  </Pressable>
                )}
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

            {/* ===== DRIVER MULTI-VEHICLE ===== */}
            {selectedRole === "driver" && (
              <View style={{ marginBottom: 4 }}>
                <View style={styles.entitySectionHeader}>
                  <MaterialCommunityIcons name="truck-plus-outline" size={15} color={Colors.primary} />
                  <Text style={styles.entitySectionTitle}>Additional Vehicles / Gaadiyaan (Max 2)</Text>
                </View>
                {driverVehicles.map((veh, i) => (
                  <View key={i} style={styles.entityCard}>
                    <View style={styles.entityCardHead}>
                      <Text style={styles.entityCardLabel}>Vehicle #{i + 2}</Text>
                      <Pressable onPress={() => removeDriverVehicle(i)}>
                        <Ionicons name="close-circle" size={18} color={Colors.error} />
                      </Pressable>
                    </View>
                    <View style={styles.inputGroup}>
                      <MaterialCommunityIcons name="card-text-outline" size={16} color={Colors.textMuted} />
                      <TextInput
                        style={[styles.input, { textTransform: "uppercase" }]}
                        placeholder="Vehicle / RC Number * (e.g. GJ01AB1234)"
                        placeholderTextColor={Colors.textMuted}
                        value={veh.vehicleNumber}
                        onChangeText={(v) => setDriverVehicles((prev) => prev.map((x, idx) => idx === i ? { ...x, vehicleNumber: v.toUpperCase() } : x))}
                        autoCapitalize="characters"
                        maxLength={12}
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <MaterialCommunityIcons name="card-account-details-outline" size={16} color={Colors.textMuted} />
                      <TextInput
                        style={styles.input}
                        placeholder="Aadhaar Number * (Is gaadi ke liye)"
                        placeholderTextColor={Colors.textMuted}
                        value={veh.aadhaarHidden ? veh.aadhaarNumber.replace(/\d(?=\d{4})/g, "•") : veh.aadhaarNumber}
                        onChangeText={(v) => {
                          const raw = v.replace(/[^0-9]/g, "");
                          setDriverVehicles((prev) => prev.map((x, idx) => idx === i ? { ...x, aadhaarNumber: formatAadhaarRaw(raw) } : x));
                        }}
                        keyboardType="numeric"
                        maxLength={14}
                        secureTextEntry={veh.aadhaarHidden}
                      />
                      <Pressable onPress={() => setDriverVehicles((prev) => prev.map((x, idx) => idx === i ? { ...x, aadhaarHidden: !x.aadhaarHidden } : x))}>
                        <Ionicons name={veh.aadhaarHidden ? "eye-outline" : "eye-off-outline"} size={16} color={Colors.textMuted} />
                      </Pressable>
                    </View>
                  </View>
                ))}
                {driverVehicles.length < 2 && (
                  <Pressable style={styles.addEntityBtn} onPress={addDriverVehicle}>
                    <Ionicons name="add-circle-outline" size={16} color={Colors.primary} />
                    <Text style={styles.addEntityBtnText}>+ Doosri Gaadi Add Karein</Text>
                  </Pressable>
                )}
              </View>
            )}

            {/* T&C Checkbox — mandatory for merchant and driver */}
            {selectedRole !== "admin" && (
              <View style={styles.termsCheckboxContainer}>
                <Pressable
                  style={[
                    styles.checkbox,
                    termsAccepted && styles.checkboxChecked,
                    errors.terms ? styles.checkboxError : null,
                  ]}
                  onPress={() => {
                    setTermsAccepted((v) => !v);
                    Haptics.selectionAsync();
                    if (errors.terms) setErrors((e) => ({ ...e, terms: undefined }));
                  }}
                  hitSlop={8}
                >
                  {termsAccepted && (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  )}
                </Pressable>
                <Pressable
                  style={{ flex: 1 }}
                  onPress={() => {
                    setTermsAccepted((v) => !v);
                    Haptics.selectionAsync();
                    if (errors.terms) setErrors((e) => ({ ...e, terms: undefined }));
                  }}
                >
                  <Text style={styles.termsCheckboxText}>
                    <Text style={styles.termsCheckboxBold}>Main samjhta/samajhti hun ki </Text>
                    kisi bhi fraud (IPC 420/406) ki sthiti mein{" "}
                    <Text style={styles.termsCheckboxBold}>'Loading Fast India'</Text>{" "}
                    ko mera Aadhaar block karne aur Police ko gaadi/account zabt (seize) karne ke liye report karne ka adhikar hai.{"\n"}
                    <Text style={{ color: "#aaa" }}>
                      I agree that in case of any fraud (IPC 420/406), 'Loading Fast India' has the right to block my Aadhaar and report to police for vehicle/account seizure.
                    </Text>
                  </Text>
                </Pressable>
              </View>
            )}
            {errors.terms ? (
              <Text style={[styles.errorText, { marginBottom: 8 }]}>{errors.terms}</Text>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                styles.loginBtn,
                pressed && { opacity: 0.85 },
                selectedRole !== "admin" && !termsAccepted && styles.loginBtnDisabled,
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
  termsCheckboxContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#1A0800",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.primary + "40",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxError: {
    borderColor: Colors.error,
  },
  termsCheckboxText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    flex: 1,
  },
  termsCheckboxBold: {
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  loginBtnDisabled: {
    opacity: 0.45,
  },
  entitySectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
    marginBottom: 8,
  },
  entitySectionTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  entityCard: {
    backgroundColor: "#0F0F1A",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  entityCardHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  entityCardLabel: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
  addEntityBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary + "50",
    borderStyle: "dashed",
    justifyContent: "center",
    marginBottom: 8,
  },
  addEntityBtnText: {
    fontSize: 13,
    color: Colors.primary,
    fontFamily: "Inter_600SemiBold",
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
  savedSection: {
    marginBottom: 16,
  },
  savedTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
    marginBottom: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  savedCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1C1C2E",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.primary + "33",
    gap: 10,
  },
  savedAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primary + "22",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.primary + "44",
  },
  savedName: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  savedSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 1,
  },
  savedCity: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  savedRemoveBtn: {
    padding: 4,
  },
  savedLoginBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 72,
  },
  savedLoginText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  savedDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  savedLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  savedOr: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
});
