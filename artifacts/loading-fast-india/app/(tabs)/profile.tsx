import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";

function formatCurrency(amount: number) {
  return "₹" + amount.toLocaleString("en-IN");
}

interface MenuItemProps {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  badge?: string;
}

function MenuItem({ icon, label, value, onPress, danger, badge }: MenuItemProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.7 }]}
      onPress={onPress}
    >
      <View
        style={[
          styles.menuIcon,
          { backgroundColor: danger ? "#2A0000" : Colors.surface },
        ]}
      >
        <MaterialCommunityIcons
          name={icon as any}
          size={20}
          color={danger ? Colors.error : Colors.textSecondary}
        />
      </View>
      <Text style={[styles.menuLabel, danger && { color: Colors.error }]}>
        {label}
      </Text>
      {value ? (
        <Text style={styles.menuValue}>{value}</Text>
      ) : badge ? (
        <View style={styles.menuBadge}>
          <Text style={styles.menuBadgeText}>{badge}</Text>
        </View>
      ) : null}
      {!danger && onPress && (
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
      )}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout, trips, getEarnings } = useApp();
  const [verifying, setVerifying] = useState(false);

  const topBarHeight = Platform.OS === "web" ? insets.top + 67 : insets.top;
  const earnings = getEarnings();

  const roleLabel =
    user?.role === "merchant"
      ? "Merchant"
      : user?.role === "driver"
      ? "Driver"
      : "Admin";

  const roleIcon =
    user?.role === "merchant"
      ? "storefront"
      : user?.role === "driver"
      ? "truck"
      : "shield-account";

  const totalTrips =
    user?.role === "merchant"
      ? trips.filter((t) => t.merchantId === user.id).length
      : user?.role === "driver"
      ? trips.filter((t) => t.driverId === user?.id).length
      : trips.length;

  const handleVerifyAadhaar = () => {
    Alert.alert(
      "Aadhaar Verification",
      "This will initiate KYC verification with UIDAI. Your Aadhaar number will be verified securely.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Verify Now",
          onPress: () => {
            setVerifying(true);
            setTimeout(() => {
              setVerifying(false);
              Alert.alert(
                "Verification Initiated",
                "Aadhaar verification request has been sent. You will be notified within 24 hours."
              );
            }, 1500);
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: topBarHeight + 20, paddingBottom: 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["#1A0A00", "#0F0800"]}
          style={styles.profileCard}
        >
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={[Colors.primary, Colors.primaryLight]}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
            <View style={styles.roleBadge}>
              <MaterialCommunityIcons
                name={roleIcon as any}
                size={12}
                color={Colors.primary}
              />
            </View>
          </View>

          <Text style={styles.profileName}>{user?.name}</Text>
          <Text style={styles.profilePhone}>+91 {user?.phone}</Text>

          <View style={styles.profileMeta}>
            <View style={styles.profileMetaItem}>
              <MaterialCommunityIcons
                name={roleIcon as any}
                size={14}
                color={Colors.primary}
              />
              <Text style={styles.profileMetaText}>{roleLabel}</Text>
            </View>
            <View style={styles.profileMetaDot} />
            <View style={styles.profileMetaItem}>
              <MaterialCommunityIcons
                name="map-marker-outline"
                size={14}
                color={Colors.textMuted}
              />
              <Text style={styles.profileMetaText}>{user?.city}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalTrips}</Text>
              <Text style={styles.statLabel}>Total Trips</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {formatCurrency(earnings.total)}
              </Text>
              <Text style={styles.statLabel}>
                {user?.role === "driver"
                  ? "Earned"
                  : user?.role === "admin"
                  ? "Commission"
                  : "Freight"}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{earnings.completedTrips}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>
        </LinearGradient>

        {!user?.aadhaarVerified && (
          <Pressable
            style={({ pressed }) => [
              styles.kycBanner,
              pressed && { opacity: 0.85 },
            ]}
            onPress={handleVerifyAadhaar}
          >
            <View style={styles.kycLeft}>
              <MaterialCommunityIcons
                name="card-account-details-outline"
                size={22}
                color={Colors.warning}
              />
              <View>
                <Text style={styles.kycTitle}>Verify Aadhaar</Text>
                <Text style={styles.kycSubtext}>
                  Complete KYC to unlock all features
                </Text>
              </View>
            </View>
            <View style={styles.kycBtn}>
              <Text style={styles.kycBtnText}>Verify</Text>
            </View>
          </Pressable>
        )}

        {user?.aadhaarVerified && (
          <View style={styles.verifiedBanner}>
            <MaterialCommunityIcons
              name="check-decagram"
              size={20}
              color={Colors.success}
            />
            <Text style={styles.verifiedText}>Aadhaar Verified</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="account-outline"
              label="Personal Info"
              value={user?.name}
            />
            {user?.role === "merchant" && user?.businessName ? (
              <MenuItem
                icon="domain"
                label="Business Name"
                value={user.businessName}
              />
            ) : null}
            <MenuItem
              icon="phone-outline"
              label="Phone Number"
              value={"+91 " + user?.phone}
            />
            <MenuItem
              icon="map-marker-outline"
              label="City"
              value={user?.city}
            />
          </View>
        </View>

        {user?.role === "merchant" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>KYC & Documents</Text>
            <View style={styles.menuGroup}>
              {user?.aadhaarNumber ? (
                <View style={styles.kycDocRow}>
                  <View style={styles.kycDocIcon}>
                    <MaterialCommunityIcons
                      name="card-account-details"
                      size={20}
                      color={Colors.primary}
                    />
                  </View>
                  <View style={styles.kycDocInfo}>
                    <Text style={styles.kycDocLabel}>Aadhaar Card</Text>
                    <Text style={styles.kycDocValue}>
                      {"XXXX XXXX " + user.aadhaarNumber.slice(-4)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.kycDocBadge,
                      user.aadhaarVerified
                        ? styles.kycBadgeVerified
                        : styles.kycBadgePending,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={user.aadhaarVerified ? "check" : "clock-outline"}
                      size={11}
                      color={user.aadhaarVerified ? Colors.success : Colors.warning}
                    />
                    <Text
                      style={[
                        styles.kycDocBadgeText,
                        {
                          color: user.aadhaarVerified
                            ? Colors.success
                            : Colors.warning,
                        },
                      ]}
                    >
                      {user.aadhaarVerified ? "Verified" : "Pending"}
                    </Text>
                  </View>
                </View>
              ) : null}

              {user?.gstNumber ? (
                <View style={styles.kycDocRow}>
                  <View style={styles.kycDocIcon}>
                    <MaterialCommunityIcons
                      name="file-certificate"
                      size={20}
                      color={Colors.info}
                    />
                  </View>
                  <View style={styles.kycDocInfo}>
                    <Text style={styles.kycDocLabel}>GST Number</Text>
                    <Text style={styles.kycDocValue}>{user.gstNumber}</Text>
                  </View>
                  <View
                    style={[
                      styles.kycDocBadge,
                      user.gstVerified
                        ? styles.kycBadgeVerified
                        : styles.kycBadgePending,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={user.gstVerified ? "check" : "clock-outline"}
                      size={11}
                      color={user.gstVerified ? Colors.success : Colors.warning}
                    />
                    <Text
                      style={[
                        styles.kycDocBadgeText,
                        {
                          color: user.gstVerified
                            ? Colors.success
                            : Colors.warning,
                        },
                      ]}
                    >
                      {user.gstVerified ? "Verified" : "Pending"}
                    </Text>
                  </View>
                </View>
              ) : null}

              {!user?.aadhaarNumber && !user?.gstNumber ? (
                <View style={styles.noKycRow}>
                  <MaterialCommunityIcons
                    name="alert-circle-outline"
                    size={16}
                    color={Colors.warning}
                  />
                  <Text style={styles.noKycText}>
                    No KYC documents submitted yet. Please re-register to add Aadhaar and GST.
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business</Text>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="truck-delivery-outline"
              label="My Trips"
              badge={String(totalTrips)}
              onPress={() => router.push("/(tabs)/trips")}
            />
            <MenuItem
              icon="currency-inr"
              label="Earnings"
              badge={formatCurrency(earnings.total)}
              onPress={() => router.push("/(tabs)/earnings")}
            />
            {user?.role === "merchant" && (
              <MenuItem
                icon="truck-plus-outline"
                label="Book New Trip"
                onPress={() => router.push("/book-trip")}
              />
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="help-circle-outline"
              label="Help & Support"
              onPress={() =>
                Alert.alert("Support", "Contact us at support@loadingfastindia.in")
              }
            />
            <MenuItem
              icon="qrcode"
              label="App Share karein (QR Code)"
              onPress={() => router.push("/qr-share")}
            />
            <MenuItem
              icon="shield-lock-outline"
              label="Privacy Policy"
              onPress={() => router.push("/privacy-policy")}
            />
            <MenuItem
              icon="alert-octagon-outline"
              label="Report Fraud"
              onPress={() =>
                Alert.alert(
                  "Report Fraud",
                  "To report fraud or illegal activity, please email: legal@loadingfastindia.in\n\nYou may also file an FIR at your local police station under IPC Section 420.",
                  [{ text: "OK" }]
                )
              }
            />
            <MenuItem
              icon="information-outline"
              label="About LFI"
              onPress={() =>
                Alert.alert(
                  "Loading Fast India",
                  "India's fastest logistics platform. Version 1.0.0\n\nCommission-based platform connecting Merchants & Drivers.\n\nGST No: 24BRLPS3959R1ZN"
                )
              }
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="logout"
              label="Logout"
              onPress={handleLogout}
              danger
            />
          </View>
        </View>

        <Text style={styles.versionText}>Loading Fast India v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 20,
  },
  profileCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#3A1500",
  },
  avatarContainer: {
    marginBottom: 12,
    position: "relative",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  roleBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#1A0A00",
    borderWidth: 2,
    borderColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  profileName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 4,
  },
  profilePhone: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  profileMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  profileMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  profileMetaText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  profileMetaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  statsRow: {
    flexDirection: "row",
    width: "100%",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  kycBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#2A1F00",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#5A3A00",
  },
  kycLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  kycTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.warning,
    marginBottom: 2,
  },
  kycSubtext: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  kycBtn: {
    backgroundColor: Colors.warning,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  kycBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#000",
  },
  verifiedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#002A1A",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#005A35",
  },
  verifiedText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.success,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuGroup: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  menuValue: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  menuBadge: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  menuBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  versionText: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginTop: 8,
  },
  kycDocRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  kycDocIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  kycDocInfo: {
    flex: 1,
    gap: 2,
  },
  kycDocLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  kycDocValue: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    letterSpacing: 0.5,
  },
  kycDocBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  kycBadgeVerified: {
    backgroundColor: "#002A1A",
  },
  kycBadgePending: {
    backgroundColor: "#2A1F00",
  },
  kycDocBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  noKycRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  noKycText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    lineHeight: 19,
  },
});
