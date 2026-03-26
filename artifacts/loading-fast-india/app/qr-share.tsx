import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import React, { useRef } from "react";
import {
  Alert,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";

const APP_LINK = "https://loadingfastindia.in";
const APP_NAME = "Loading Fast India (LFI)";

export default function QRShareScreen() {
  const insets = useSafeAreaInsets();
  const svgRef = useRef(null);

  const handleShare = async () => {
    try {
      await Share.share({
        title: APP_NAME,
        message: `🚛 Loading Fast India — India ka sabse tez logistics platform!\n\nMerchant, Driver ya Transporter hain? Humse jodein:\n${APP_LINK}\n\nGST No: 24BRLPS3959R1ZN`,
        url: APP_LINK,
      });
    } catch {
      Alert.alert("Share", `App link: ${APP_LINK}`);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={["#1A0A00", "#0A0A0F", "#0A0A0F"]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>App Share karein</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.body}>
        <View style={styles.brandRow}>
          <MaterialCommunityIcons
            name="truck-fast"
            size={28}
            color={Colors.primary}
          />
          <Text style={styles.brandName}>Loading Fast India</Text>
        </View>
        <Text style={styles.subtitle}>
          Apne customers, drivers aur merchants ko yeh QR code scan karaein
        </Text>

        <View style={styles.qrWrapper}>
          <LinearGradient
            colors={[Colors.primary + "33", Colors.primary + "11"]}
            style={styles.qrGlow}
          />
          <View style={styles.qrCard}>
            <QRCode
              value={APP_LINK}
              size={220}
              color="#1C1C2E"
              backgroundColor="#FFFFFF"
              logo={require("../assets/images/icon.png")}
              logoSize={52}
              logoBackgroundColor="#FFFFFF"
              logoMargin={4}
              logoBorderRadius={10}
              quietZone={10}
              ecl="H"
              getRef={svgRef}
            />
          </View>

          <View style={styles.cornerTL} />
          <View style={styles.cornerTR} />
          <View style={styles.cornerBL} />
          <View style={styles.cornerBR} />
        </View>

        <Text style={styles.scanText}>
          📲 Camera se scan karein — koi app zaroori nahi
        </Text>

        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons
              name="truck-delivery-outline"
              size={16}
              color={Colors.primary}
            />
            <Text style={styles.infoText}>Freight booking & bilty generation</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons
              name="shield-check-outline"
              size={16}
              color={Colors.success}
            />
            <Text style={styles.infoText}>Aadhaar KYC verified merchants</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons
              name="currency-inr"
              size={16}
              color={Colors.warning}
            />
            <Text style={styles.infoText}>GST No: 24BRLPS3959R1ZN</Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.shareBtn,
            pressed && { opacity: 0.85 },
          ]}
          onPress={handleShare}
        >
          <LinearGradient
            colors={[Colors.primary, Colors.primaryLight || "#FF7324"]}
            style={styles.shareBtnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="share-social-outline" size={20} color="#fff" />
            <Text style={styles.shareBtnText}>App Link Share karein</Text>
          </LinearGradient>
        </Pressable>

        <Text style={styles.urlText}>{APP_LINK}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  body: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  brandName: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 20,
  },
  qrWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  qrGlow: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 24,
  },
  qrCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  cornerTL: {
    position: "absolute",
    top: -4,
    left: -4,
    width: 24,
    height: 24,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: Colors.primary,
    borderTopLeftRadius: 6,
  },
  cornerTR: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: Colors.primary,
    borderTopRightRadius: 6,
  },
  cornerBL: {
    position: "absolute",
    bottom: -4,
    left: -4,
    width: 24,
    height: 24,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: Colors.primary,
    borderBottomLeftRadius: 6,
  },
  cornerBR: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: Colors.primary,
    borderBottomRightRadius: 6,
  },
  scanText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginBottom: 20,
    textAlign: "center",
  },
  infoBox: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    width: "100%",
    gap: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    flex: 1,
  },
  shareBtn: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 12,
  },
  shareBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
  },
  shareBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  urlText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textDecorationLine: "underline",
  },
});
