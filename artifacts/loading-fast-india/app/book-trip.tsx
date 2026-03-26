import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";

const CITIES = [
  "Mumbai", "Delhi", "Bangalore", "Chennai", "Kolkata",
  "Hyderabad", "Pune", "Ahmedabad", "Jaipur", "Surat",
  "Lucknow", "Kanpur", "Nagpur", "Visakhapatnam", "Indore",
  "Thane", "Bhopal", "Patna", "Vadodara", "Ludhiana",
];

const GOODS_TYPES = [
  "Heavy goods, long distance",
  "Household goods, luggage",
  "Electronics",
  "Perishables (Food & Agriculture)",
  "Automobiles & Auto parts",
  "Textiles & Garments",
  "Construction Material",
  "Industrial Equipment",
  "Chemical & Hazardous",
  "Medical Supplies",
];

const VEHICLE_TYPES = [
  "Mini Truck (1-3 ton)",
  "Tempo (3-5 ton)",
  "Single Axle (5-8 ton)",
  "Multi Axle (8-15 ton)",
  "22-Wheeler (15-25 ton)",
  "Flatbed Trailer",
  "Refrigerated Truck",
  "Container Truck",
];

type DropdownField = "fromCity" | "toCity" | "goodsType" | "vehicleType" | null;

export default function BookTripScreen() {
  const insets = useSafeAreaInsets();
  const { createTrip } = useApp();

  const [fromCity, setFromCity] = useState("Mumbai");
  const [toCity, setToCity] = useState("Delhi");
  const [goodsType, setGoodsType] = useState(GOODS_TYPES[0]);
  const [vehicleType, setVehicleType] = useState(VEHICLE_TYPES[0]);
  const [weightKg, setWeightKg] = useState("");
  const [freightAmount, setFreightAmount] = useState("");
  const [consigneeName, setConsigneeName] = useState("");
  const [consigneePhone, setConsigneePhone] = useState("");
  const [description, setDescription] = useState("");
  const [openDropdown, setOpenDropdown] = useState<DropdownField>(null);
  const [submitting, setSubmitting] = useState(false);

  const commission = freightAmount
    ? Math.round(parseFloat(freightAmount) * 0.05)
    : 0;
  const driverEarning = freightAmount
    ? Math.round(parseFloat(freightAmount) * 0.95)
    : 0;

  const validate = () => {
    if (!weightKg || parseFloat(weightKg) <= 0) {
      Alert.alert("Error", "Please enter valid weight in kg");
      return false;
    }
    if (!freightAmount || parseFloat(freightAmount) <= 0) {
      Alert.alert("Error", "Please enter valid freight amount");
      return false;
    }
    if (!consigneeName.trim()) {
      Alert.alert("Error", "Please enter consignee name");
      return false;
    }
    if (!consigneePhone.trim() || consigneePhone.length < 10) {
      Alert.alert("Error", "Please enter valid consignee phone number");
      return false;
    }
    if (fromCity === toCity) {
      Alert.alert("Error", "From and To city cannot be the same");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
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
        description: description.trim(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Trip Booked!",
        "Your trip has been booked successfully. A bilty has been generated.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.");
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
          style={{ maxHeight: 200 }}
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

  return (
    <View style={styles.container}>
      <KeyboardAwareScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bottomOffset={20}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Route Details</Text>

          <View style={styles.routeCard}>
            <View style={styles.routeIndicator}>
              <View style={styles.dotOrigin} />
              <View style={styles.routeConnector} />
              <View style={styles.dotDest} />
            </View>
            <View style={styles.routeFields}>
              <Pressable
                style={styles.citySelector}
                onPress={() =>
                  setOpenDropdown(openDropdown === "fromCity" ? null : "fromCity")
                }
              >
                <View>
                  <Text style={styles.routeFieldLabel}>From</Text>
                  <Text style={styles.routeFieldValue}>{fromCity}</Text>
                </View>
                <Ionicons
                  name={openDropdown === "fromCity" ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={Colors.textMuted}
                />
              </Pressable>
              {renderDropdown("fromCity", CITIES, fromCity, setFromCity)}

              <View style={styles.routeDivider} />

              <Pressable
                style={styles.citySelector}
                onPress={() =>
                  setOpenDropdown(openDropdown === "toCity" ? null : "toCity")
                }
              >
                <View>
                  <Text style={styles.routeFieldLabel}>To</Text>
                  <Text style={styles.routeFieldValue}>{toCity}</Text>
                </View>
                <Ionicons
                  name={openDropdown === "toCity" ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={Colors.textMuted}
                />
              </Pressable>
              {renderDropdown("toCity", CITIES, toCity, setToCity)}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Goods Details</Text>

          <Pressable
            style={styles.selectField}
            onPress={() =>
              setOpenDropdown(openDropdown === "goodsType" ? null : "goodsType")
            }
          >
            <MaterialCommunityIcons
              name="package-variant"
              size={18}
              color={Colors.textMuted}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.selectFieldLabel}>Goods Type</Text>
              <Text style={styles.selectFieldValue} numberOfLines={1}>
                {goodsType}
              </Text>
            </View>
            <Ionicons
              name={openDropdown === "goodsType" ? "chevron-up" : "chevron-down"}
              size={16}
              color={Colors.textMuted}
            />
          </Pressable>
          {renderDropdown("goodsType", GOODS_TYPES, goodsType, setGoodsType)}

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Weight (kg)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 5000"
                placeholderTextColor={Colors.textMuted}
                value={weightKg}
                onChangeText={(v) => setWeightKg(v.replace(/[^0-9.]/g, ""))}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Freight Amount (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 45000"
                placeholderTextColor={Colors.textMuted}
                value={freightAmount}
                onChangeText={(v) => setFreightAmount(v.replace(/[^0-9]/g, ""))}
                keyboardType="numeric"
              />
            </View>
          </View>

          <Pressable
            style={styles.selectField}
            onPress={() =>
              setOpenDropdown(
                openDropdown === "vehicleType" ? null : "vehicleType"
              )
            }
          >
            <MaterialCommunityIcons
              name="truck-outline"
              size={18}
              color={Colors.textMuted}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.selectFieldLabel}>Vehicle Type</Text>
              <Text style={styles.selectFieldValue}>{vehicleType}</Text>
            </View>
            <Ionicons
              name={openDropdown === "vehicleType" ? "chevron-up" : "chevron-down"}
              size={16}
              color={Colors.textMuted}
            />
          </Pressable>
          {renderDropdown("vehicleType", VEHICLE_TYPES, vehicleType, setVehicleType)}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe the goods..."
              placeholderTextColor={Colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Consignee Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Consignee Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Receiver's full name"
              placeholderTextColor={Colors.textMuted}
              value={consigneeName}
              onChangeText={setConsigneeName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Consignee Phone</Text>
            <View style={styles.phoneRow}>
              <Text style={styles.phoneCode}>+91</Text>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="10-digit phone number"
                placeholderTextColor={Colors.textMuted}
                value={consigneePhone}
                onChangeText={(v) =>
                  setConsigneePhone(v.replace(/[^0-9]/g, "").slice(0, 10))
                }
                keyboardType="numeric"
                maxLength={10}
              />
            </View>
          </View>
        </View>

        {freightAmount ? (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Billing Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Freight Amount</Text>
              <Text style={styles.summaryValue}>
                ₹{parseFloat(freightAmount || "0").toLocaleString("en-IN")}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>LFI Commission (5%)</Text>
              <Text style={[styles.summaryValue, { color: Colors.error }]}>
                -₹{commission.toLocaleString("en-IN")}
              </Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text style={styles.summaryTotalLabel}>Driver Earning</Text>
              <Text style={styles.summaryTotalValue}>
                ₹{driverEarning.toLocaleString("en-IN")}
              </Text>
            </View>
          </View>
        ) : null}

        <Pressable
          style={({ pressed }) => [
            styles.submitBtn,
            pressed && { opacity: 0.88 },
            submitting && { opacity: 0.7 },
          ]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons name="truck-plus" size={20} color="#fff" />
              <Text style={styles.submitBtnText}>Book Trip & Generate Bilty</Text>
            </>
          )}
        </Pressable>
      </KeyboardAwareScrollView>
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
    gap: 0,
  },
  section: {
    marginBottom: 24,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  routeCard: {
    flexDirection: "row",
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  routeIndicator: {
    width: 24,
    alignItems: "center",
    paddingVertical: 24,
    gap: 0,
  },
  dotOrigin: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
    marginTop: 18,
  },
  routeConnector: {
    flex: 1,
    width: 2,
    backgroundColor: Colors.border,
    marginVertical: 6,
    marginLeft: -1,
  },
  dotDest: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.success,
    marginBottom: 18,
  },
  routeFields: {
    flex: 1,
  },
  citySelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  routeFieldLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginBottom: 2,
  },
  routeFieldValue: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  routeDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },
  dropdown: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: 4,
    marginBottom: 4,
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
    fontFamily: "Inter_500Medium",
  },
  selectField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectFieldLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginBottom: 2,
  },
  selectFieldValue: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
    marginLeft: 2,
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  phoneCode: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  summaryCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  summaryTotal: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  summaryTotalLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  summaryTotalValue: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.success,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  submitBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
