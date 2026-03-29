import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";


const GOODS_TYPES = [
  // Anaaj & Fasal — Grain & Crops
  "Gehun / Wheat (गेहूं)",
  "Chawal / Rice (चावल)",
  "Makka / Maize (मक्का)",
  "Jowar / Sorghum (ज्वार)",
  "Bajra / Pearl Millet (बाजरा)",
  "Dal / Pulses (दाल)",
  "Soyabean / Soya (सोयाबीन)",
  "Sarson / Mustard (सरसों)",
  "Kapas / Cotton (कपास)",
  "Ganna / Sugarcane (गन्ना)",

  // Phal & Sabzi — Fruits & Vegetables
  "Nariyal / Coconut (नारियल)",
  "Kela / Banana (केला)",
  "Aalu / Potato (आलू)",
  "Pyaaz / Onion (प्याज)",
  "Tamatar / Tomato (टमाटर)",
  "Lahsun / Garlic (लहसुन)",
  "Adrak / Ginger (अदरक)",
  "Aam / Mango (आम)",
  "Santra / Orange (संतरा)",
  "Angoor / Grapes (अंगूर)",
  "Seb / Apple (सेब)",
  "Tarbooz / Watermelon (तरबूज)",
  "Mirchi / Chilli (मिर्च)",
  "Hari Sabzi / Green Vegetables (हरी सब्जी)",

  // Masale & Tel — Spices & Oil
  "Mirch Masala / Spices (मसाला)",
  "Tel / Edible Oil (खाद्य तेल)",
  "Haldi / Turmeric (हल्दी)",
  "Zeera / Cumin (जीरा)",

  // Machli & Maans — Fish & Meat
  "Taza Machli / Fresh Fish (ताजी मछली)",
  "Sookhi Machli / Dry Fish (सूखी मछली)",
  "Jhinga / Prawn (झींगा)",
  "Murgi / Poultry (मुर्गी)",

  // Doodh & Dairy
  "Doodh / Milk (दूध)",
  "Paneer / Cheese (पनीर)",
  "Ghee / Clarified Butter (घी)",
  "Makhan / Butter (मक्खन)",

  // Kapda & Textile
  "Kapda / Fabric & Textile (कपड़ा)",
  "Taiyar Kapde / Garments (तैयार कपड़े)",

  // Nirman Saman — Construction
  "Cement (सीमेंट)",
  "Ret / Sand (रेत)",
  "Bajri / Gravel (बजरी)",
  "Bricks / Eent (ईंट)",
  "Sariya / TMT Bar (सरिया)",
  "Lakkad / Timber (लकड़ी)",
  "Patthar / Stone (पत्थर)",
  "Tiles / Ceramic (टाइल्स)",

  // Electrical & Electronics
  "Electrical Saman / Electricals (इलेक्ट्रिकल)",
  "Mobile / Electronics (इलेक्ट्रॉनिक्स)",
  "Fridge / AC / Home Appliance (होम अप्लायंस)",

  // Ghar Ka Saman — Household
  "Furniture / Ghar Ka Saman (फर्नीचर)",
  "Bartan / Utensils (बर्तन)",

  // Pharmaceutical & Medical
  "Dawai / Medicine (दवाई)",
  "Medical Equipment (मेडिकल उपकरण)",

  // Auto & Industrial
  "Auto Parts / Spare Parts (ऑटो पार्ट्स)",
  "Machinery / Machine (मशीनरी)",
  "Chemical / Industrial (केमिकल)",
  "Plastic / Rubber (प्लास्टिक / रबर)",

  // Miscellaneous
  "Paper / Stationary (कागज)",
  "Glass / Sheeshe Ka Saman (शीशा)",
  "Koi Aur Maal / Other Goods (अन्य)",
];

const VEHICLE_TYPES = [
  "छोटा हाथी / Chhota Haathi (0.5 Ton)",
  "ईको वैन / Eco Van (0.75 Ton)",
  "Loading Rickshaw / थ्री-व्हीलर (1 Ton)",
  "Bike Delivery",
  "Bolero Pickup / Tata 207 (1.5 Ton)",
  "टाटा 407 / Tata 407 (2 Ton)",
  "आयशर 14ft / Eicher Canter (3 Ton)",
  "6 चक्का ट्रक / 6 Wheeler Truck (10 Ton)",
  "10 चक्का ट्रक / 10 Wheeler Truck (20 Ton)",
  "कंटेनर / Container (32 Ton)",
  "ट्रेलर / Trailer (40 Ton)",
];

type DropdownField = "goodsType" | "vehicleType" | null;

export default function BookTripScreen() {
  const insets = useSafeAreaInsets();
  const { createTrip } = useApp();

  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");
  const [goodsType, setGoodsType] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [freightAmount, setFreightAmount] = useState("");
  const [consigneeName, setConsigneeName] = useState("");
  const [consigneePhone, setConsigneePhone] = useState("");
  const [description, setDescription] = useState("");
  const [openDropdown, setOpenDropdown] = useState<DropdownField>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successBooked, setSuccessBooked] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const commission = freightAmount
    ? Math.round(parseFloat(freightAmount) * 0.02)
    : 0;
  const driverEarning = freightAmount
    ? parseFloat(freightAmount) - commission
    : 0;

  const getError = (): string => {
    if (!fromCity) return "Kahan se bhejna hai — From City chunein";
    if (!toCity) return "Kahan pahunchana hai — To City chunein";
    if (fromCity === toCity) return "From aur To sheher alag hone chahiye";
    if (!goodsType) return "Maal ka prakar chunein";
    if (!vehicleType) return "Gaadi ka prakar chunein";
    if (!weightKg || parseFloat(weightKg) <= 0) return "Maal ka vajan (kg) sahi likhen";
    if (!freightAmount || parseFloat(freightAmount) <= 0)
      return "Kiraya (₹) zaroori hai — aap jo kiraya dena chahte hain woh likhen";
    if (!consigneeName.trim()) return "Maal lene wale ka naam likhen";
    if (!consigneePhone.trim() || consigneePhone.length < 10)
      return "Maal lene wale ka 10 digit phone number likhein";
    return "";
  };

  const handleSubmit = async () => {
    const err = getError();
    if (err) {
      setErrorMsg(err);
      return;
    }
    setErrorMsg("");
    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await createTrip({
        fromCity,
        toCity,
        goodsType,
        weightKg: parseFloat(weightKg),
        freightAmount: parseFloat(freightAmount),
        consigneeName: consigneeName.trim(),
        consigneePhone: consigneePhone.trim(),
        vehicleType,
        vehicleNumber: vehicleNumber.trim().toUpperCase() || undefined,
        description: description.trim(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccessBooked(true);
      setTimeout(() => {
        router.back();
      }, 1800);
    } catch {
      setErrorMsg("Kuch galat hua — dobara koshish karein");
    } finally {
      setSubmitting(false);
    }
  };

  function renderDropdown(
    field: Exclude<DropdownField, null>,
    options: string[],
    current: string,
    onSelect: (v: string) => void
  ) {
    if (openDropdown !== field) return null;
    return (
      <View style={styles.dropdown}>
        <ScrollView
          style={{ maxHeight: 220 }}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          {options.map((opt) => (
            <Pressable
              key={opt}
              style={[
                styles.dropdownItem,
                current === opt && styles.dropdownItemActive,
              ]}
              onPress={() => {
                onSelect(opt);
                setOpenDropdown(null);
                setErrorMsg("");
                Haptics.selectionAsync();
              }}
            >
              <Text
                style={[
                  styles.dropdownItemText,
                  current === opt && styles.dropdownItemTextActive,
                ]}
              >
                {opt}
              </Text>
              {current === opt && (
                <Ionicons name="checkmark" size={16} color={Colors.primary} />
              )}
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  }

  if (successBooked) {
    return (
      <View style={styles.successScreen}>
        <View style={styles.successIcon}>
          <MaterialCommunityIcons name="truck-check" size={56} color="#fff" />
        </View>
        <Text style={styles.successTitle}>Trip Book Ho Gayi! ✅</Text>
        <Text style={styles.successSub}>
          Aapki trip book ho gayi aur bilty taiyar ho gayi.{"\n"}
          Driver jaldi aapki trip accept karega.
        </Text>
        <Text style={styles.successBack}>Wapas ja rahe hain...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* STEP 1 — ROUTE */}
        <View style={styles.stepHeader}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepNum}>1</Text>
          </View>
          <Text style={styles.stepTitle}>Kahan Se — Kahan Tak</Text>
        </View>

        <View style={styles.routeCard}>
          <View style={styles.routeIndicator}>
            <View style={styles.dotOrigin} />
            <View style={styles.routeConnector} />
            <View style={styles.dotDest} />
          </View>
          <View style={styles.routeFields}>
            <View style={styles.cityInputRow}>
              <Text style={styles.routeFieldLabel}>📍 Kahan Se (From City)</Text>
              <TextInput
                style={styles.cityTextInput}
                placeholder="Sheher ya jagah likhein..."
                placeholderTextColor={Colors.textMuted}
                value={fromCity}
                onChangeText={(v) => { setFromCity(v); setErrorMsg(""); }}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>

            <View style={styles.routeDivider} />

            <View style={styles.cityInputRow}>
              <Text style={styles.routeFieldLabel}>🏁 Kahan Tak (To City)</Text>
              <TextInput
                style={styles.cityTextInput}
                placeholder="Sheher ya jagah likhein..."
                placeholderTextColor={Colors.textMuted}
                value={toCity}
                onChangeText={(v) => { setToCity(v); setErrorMsg(""); }}
                autoCapitalize="words"
                returnKeyType="done"
              />
            </View>
          </View>
        </View>

        {/* STEP 2 — GOODS */}
        <View style={styles.stepHeader}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepNum}>2</Text>
          </View>
          <Text style={styles.stepTitle}>Maal Ki Jankari</Text>
        </View>

        <View style={styles.card}>
          <Pressable
            style={styles.selectRow}
            onPress={() => {
              setOpenDropdown(openDropdown === "goodsType" ? null : "goodsType");
              setErrorMsg("");
            }}
          >
            <MaterialCommunityIcons name="package-variant" size={20} color={Colors.textMuted} />
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Maal Ka Prakar</Text>
              <Text style={[styles.fieldValue, !goodsType && styles.placeholder]}>
                {goodsType || "Maal chunein..."}
              </Text>
            </View>
            <Ionicons
              name={openDropdown === "goodsType" ? "chevron-up" : "chevron-down"}
              size={16}
              color={Colors.textMuted}
            />
          </Pressable>
          {renderDropdown("goodsType", GOODS_TYPES, goodsType, setGoodsType)}

          <View style={styles.cardDivider} />

          <Pressable
            style={styles.selectRow}
            onPress={() => {
              setOpenDropdown(openDropdown === "vehicleType" ? null : "vehicleType");
              setErrorMsg("");
            }}
          >
            <MaterialCommunityIcons name="truck-outline" size={20} color={Colors.textMuted} />
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Gaadi Ka Prakar</Text>
              <Text style={[styles.fieldValue, !vehicleType && styles.placeholder]}>
                {vehicleType || "Gaadi chunein..."}
              </Text>
            </View>
            <Ionicons
              name={openDropdown === "vehicleType" ? "chevron-up" : "chevron-down"}
              size={16}
              color={Colors.textMuted}
            />
          </Pressable>
          {renderDropdown("vehicleType", VEHICLE_TYPES, vehicleType, setVehicleType)}

          <View style={styles.cardDivider} />

          <View style={styles.inputRow}>
            <Text style={styles.fieldLabel}>🚛 Gaadi Number (Optional)</Text>
            <TextInput
              style={[styles.inlineInput, { textTransform: "uppercase", letterSpacing: 1 }]}
              placeholder="Jaise: GJ-11-XX-0000"
              placeholderTextColor={Colors.textMuted}
              value={vehicleNumber}
              onChangeText={(v) => setVehicleNumber(v.replace(/[^a-zA-Z0-9-]/g, ""))}
              autoCapitalize="characters"
              maxLength={13}
            />
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.inputRow}>
            <Text style={styles.fieldLabel}>⚖️ Vajan (Kg mein)</Text>
            <TextInput
              style={styles.inlineInput}
              placeholder="Jaise: 5000 kg"
              placeholderTextColor={Colors.textMuted}
              value={weightKg}
              onChangeText={(v) => { setWeightKg(v.replace(/[^0-9.]/g, "")); setErrorMsg(""); }}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.inputRow}>
            <Text style={styles.fieldLabel}>📝 Maal Ka Vivaran (Optional)</Text>
            <TextInput
              style={[styles.inlineInput, { minHeight: 60, textAlignVertical: "top" }]}
              placeholder="Maal ke baare mein kuch aur..."
              placeholderTextColor={Colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
            />
          </View>
        </View>

        {/* STEP 3 — KIRAYA */}
        <View style={styles.stepHeader}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepNum}>3</Text>
          </View>
          <Text style={styles.stepTitle}>Kiraya Tay Karein</Text>
        </View>

        <View style={styles.kirayadCard}>
          <View style={styles.kiraayaHeader}>
            <MaterialCommunityIcons name="currency-inr" size={22} color={Colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.kiraayaTitle}>Aapka Kiraya (₹)</Text>
              <Text style={styles.kiraayaHint}>
                Jo kiraya aap driver ko dena chahte hain woh yahan likhen — yeh aap tay karenge
              </Text>
            </View>
          </View>
          <TextInput
            style={styles.kiraayaInput}
            placeholder="₹ 0"
            placeholderTextColor={Colors.textMuted}
            value={freightAmount}
            onChangeText={(v) => { setFreightAmount(v.replace(/[^0-9]/g, "")); setErrorMsg(""); }}
            keyboardType="numeric"
            accessibilityLabel="Kiraya Amount"
          />
          {freightAmount ? (
            <View style={styles.kiraayaBreakdown}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Aapka Kiraya</Text>
                <Text style={styles.breakdownValue}>
                  ₹{parseFloat(freightAmount).toLocaleString("en-IN")}
                </Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabelRed}>LFI Commission (2%)</Text>
                <Text style={styles.breakdownValueRed}>
                  -₹{commission.toLocaleString("en-IN")}
                </Text>
              </View>
              <View style={[styles.breakdownRow, styles.breakdownTotal]}>
                <Text style={styles.breakdownLabelGreen}>Driver Ko Milega</Text>
                <Text style={styles.breakdownValueGreen}>
                  ₹{driverEarning.toLocaleString("en-IN")}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* STEP 4 — CONSIGNEE */}
        <View style={styles.stepHeader}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepNum}>4</Text>
          </View>
          <Text style={styles.stepTitle}>Maal Lene Wale Ki Jankari</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.inputRow}>
            <Text style={styles.fieldLabel}>👤 Naam (Consignee)</Text>
            <TextInput
              style={styles.inlineInput}
              placeholder="Maal lene wale ka poora naam"
              placeholderTextColor={Colors.textMuted}
              value={consigneeName}
              onChangeText={(v) => { setConsigneeName(v); setErrorMsg(""); }}
            />
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.inputRow}>
            <Text style={styles.fieldLabel}>📞 Phone Number</Text>
            <View style={styles.phoneRow}>
              <Text style={styles.phoneCode}>+91</Text>
              <TextInput
                style={[styles.inlineInput, { flex: 1, borderWidth: 0, padding: 0 }]}
                placeholder="10 digit number"
                placeholderTextColor={Colors.textMuted}
                value={consigneePhone}
                onChangeText={(v) => {
                  setConsigneePhone(v.replace(/[^0-9]/g, "").slice(0, 10));
                  setErrorMsg("");
                }}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>
          </View>
        </View>

        {/* ERROR MESSAGE */}
        {errorMsg ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={Colors.error} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* SUBMIT */}
        <Pressable
          style={({ pressed }) => [
            styles.submitBtn,
            pressed && { opacity: 0.88 },
            submitting && { opacity: 0.7 },
          ]}
          onPress={handleSubmit}
          disabled={submitting}
          accessibilityLabel="Trip Book Karo & Bilty Banao"
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons name="truck-plus" size={22} color="#fff" />
              <View>
                <Text style={styles.submitBtnText}>Trip Book Karo & Bilty Banao</Text>
                <Text style={styles.submitBtnSub}>Driver ko trip ki notification milegi</Text>
              </View>
            </>
          )}
        </Pressable>
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
    padding: 20,
    gap: 12,
  },
  successScreen: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 20,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.success,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    textAlign: "center",
  },
  successSub: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  successBack: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginTop: 8,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
    marginBottom: 4,
  },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNum: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  stepTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  routeCard: {
    flexDirection: "row",
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
    marginBottom: 4,
  },
  routeIndicator: {
    width: 28,
    alignItems: "center",
    paddingVertical: 20,
  },
  dotOrigin: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    marginTop: 20,
  },
  routeConnector: {
    flex: 1,
    width: 2,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  dotDest: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.success,
    marginBottom: 20,
  },
  routeFields: {
    flex: 1,
  },
  cityInputRow: {
    padding: 16,
    paddingBottom: 12,
  },
  cityTextInput: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    paddingVertical: 6,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  routeFieldLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginBottom: 4,
  },
  routeFieldValue: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  routeDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  placeholder: {
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
    marginBottom: 4,
  },
  cardDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  selectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  inputRow: {
    padding: 14,
    gap: 8,
  },
  fieldLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
  },
  fieldValue: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  inlineInput: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  phoneCode: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  dropdown: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: 8,
    marginBottom: 8,
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownItemActive: {
    backgroundColor: "#1A0A00",
  },
  dropdownItemText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  dropdownItemTextActive: {
    color: Colors.primary,
    fontFamily: "Inter_600SemiBold",
  },
  kirayadCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.primary,
    padding: 16,
    gap: 12,
    marginBottom: 4,
  },
  kiraayaHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  kiraayaTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
  kiraayaHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginTop: 2,
    lineHeight: 17,
  },
  kiraayaInput: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    textAlign: "center",
  },
  kiraayaBreakdown: {
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  breakdownTotal: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 8,
    marginTop: 2,
  },
  breakdownLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  breakdownValue: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  breakdownLabelRed: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.error,
  },
  breakdownValueRed: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.error,
  },
  breakdownLabelGreen: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.success,
  },
  breakdownValueGreen: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.success,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#2A0000",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.error,
    padding: 12,
    marginTop: 4,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.error,
    lineHeight: 18,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    marginTop: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  submitBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  submitBtnSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
});
