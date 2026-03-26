import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { Trip, useApp } from "@/context/AppContext";

function formatCurrency(amount: number) {
  return "₹" + amount.toLocaleString("en-IN");
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const STATUS_CONFIG: Record<
  string,
  { color: string; bg: string; label: string; icon: string }
> = {
  pending: { color: Colors.warning, bg: "#2A1F00", label: "Pending", icon: "clock-outline" },
  accepted: { color: Colors.info, bg: "#001F40", label: "Confirmed", icon: "check-circle-outline" },
  in_transit: { color: Colors.primary, bg: "#1A0A00", label: "In Transit", icon: "truck-delivery" },
  delivered: { color: Colors.success, bg: "#002A1A", label: "Delivered", icon: "package-variant-closed-check" },
  cancelled: { color: Colors.error, bg: "#2A0000", label: "Cancelled", icon: "close-circle-outline" },
};

const FILTERS = ["All", "Pending", "In Transit", "Delivered"];

function CommissionModal({
  visible,
  trip,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  trip: Trip | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!trip) return null;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          <View style={modalStyles.handle} />

          <View style={modalStyles.iconRow}>
            <View style={modalStyles.iconCircle}>
              <MaterialCommunityIcons name="shield-check" size={32} color={Colors.primary} />
            </View>
          </View>

          <Text style={modalStyles.title}>Commission Pay Karo</Text>
          <Text style={modalStyles.subtitle}>
            Trip confirm karne ke liye LFI commission pay karein
          </Text>

          <View style={modalStyles.tripSummary}>
            <View style={modalStyles.summaryRow}>
              <MaterialCommunityIcons name="map-marker" size={16} color={Colors.primary} />
              <Text style={modalStyles.summaryText}>
                {trip.fromCity} → {trip.toCity}
              </Text>
            </View>
            <View style={modalStyles.summaryRow}>
              <MaterialCommunityIcons name="package-variant" size={16} color={Colors.textMuted} />
              <Text style={modalStyles.summaryMuted}>{trip.goodsType}</Text>
            </View>
            <View style={modalStyles.summaryRow}>
              <MaterialCommunityIcons name="truck" size={16} color={Colors.textMuted} />
              <Text style={modalStyles.summaryMuted}>{trip.vehicleType} • {trip.weightKg} kg</Text>
            </View>
          </View>

          <View style={modalStyles.amountBox}>
            <View style={modalStyles.amountRow}>
              <Text style={modalStyles.amountLabel}>Freight Amount (Rent)</Text>
              <Text style={modalStyles.amountValue}>{formatCurrency(trip.freightAmount)}</Text>
            </View>
            <View style={modalStyles.amountDivider} />
            <View style={modalStyles.amountRow}>
              <Text style={modalStyles.commissionLabel}>LFI Commission (5%)</Text>
              <Text style={modalStyles.commissionValue}>{formatCurrency(trip.lfiCommission)}</Text>
            </View>
            <View style={modalStyles.amountDivider} />
            <View style={modalStyles.amountRow}>
              <Text style={modalStyles.earningLabel}>Aapki Kamaai</Text>
              <Text style={modalStyles.earningValue}>{formatCurrency(trip.driverEarning)}</Text>
            </View>
          </View>

          <View style={modalStyles.lockNote}>
            <MaterialCommunityIcons name="lock" size={14} color={Colors.warning} />
            <Text style={modalStyles.lockNoteText}>
              Commission pay karne ke baad merchant ka phone number aur location milega
            </Text>
          </View>

          <Pressable style={modalStyles.payBtn} onPress={onConfirm}>
            <MaterialCommunityIcons name="cash-check" size={20} color="#fff" />
            <Text style={modalStyles.payBtnText}>
              Commission Pay Karo — {formatCurrency(trip.lfiCommission)}
            </Text>
          </Pressable>

          <Pressable style={modalStyles.cancelBtn} onPress={onClose}>
            <Text style={modalStyles.cancelBtnText}>Baad Mein</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function TripItem({
  trip,
  role,
  onPayCommission,
  onPress,
}: {
  trip: Trip;
  role: string;
  onPayCommission?: () => void;
  onPress: () => void;
}) {
  const status = STATUS_CONFIG[trip.status];
  const isPendingForDriver = role === "driver" && trip.status === "pending";

  return (
    <Pressable
      style={({ pressed }) => [styles.tripItem, pressed && { opacity: 0.85 }]}
      onPress={onPress}
    >
      <View style={styles.tripHeader}>
        <View style={styles.routeContainer}>
          <View style={styles.routeDot} />
          <Text style={styles.fromCity}>{trip.fromCity}</Text>
        </View>
        <View style={styles.routeLineContainer}>
          <View style={styles.routeLine} />
          <MaterialCommunityIcons
            name="truck-fast"
            size={16}
            color={Colors.primary}
          />
          <View style={styles.routeLine} />
        </View>
        <View style={styles.routeContainer}>
          <View style={[styles.routeDot, styles.routeDotEnd]} />
          <Text style={styles.toCity}>{trip.toCity}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <MaterialCommunityIcons
            name={status.icon as any}
            size={12}
            color={status.color}
          />
          <Text style={[styles.statusText, { color: status.color }]}>
            {status.label}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.tripBody}>
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Maal</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {trip.goodsType}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Vajan</Text>
            <Text style={styles.infoValue}>{trip.weightKg} kg</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Gaadi</Text>
            <Text style={styles.infoValue}>{trip.vehicleType}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Rent</Text>
            <Text style={[styles.infoValue, { color: Colors.primary }]}>
              {formatCurrency(trip.freightAmount)}
            </Text>
          </View>
        </View>

        {isPendingForDriver && (
          <View style={styles.commissionInfoBar}>
            <MaterialCommunityIcons name="shield-alert" size={14} color={Colors.warning} />
            <Text style={styles.commissionInfoText}>
              Commission: {formatCurrency(trip.lfiCommission)} • Aapki Kamaai: {formatCurrency(trip.driverEarning)}
            </Text>
          </View>
        )}

        <View style={styles.tripFooter}>
          <View>
            <Text style={styles.biltyNum}>{trip.biltyNumber}</Text>
            <Text style={styles.timeText}>{timeAgo(trip.createdAt)}</Text>
          </View>
          <View style={styles.tripActions}>
            {isPendingForDriver && (
              <Pressable
                style={styles.commissionBtn}
                onPress={(e) => {
                  e.stopPropagation?.();
                  onPayCommission?.();
                }}
              >
                <MaterialCommunityIcons name="cash" size={14} color="#fff" />
                <Text style={styles.commissionBtnText}>Commission Pay</Text>
              </Pressable>
            )}
            <Pressable style={styles.detailBtn} onPress={onPress}>
              <Ionicons name="eye-outline" size={16} color={Colors.textSecondary} />
            </Pressable>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function TripsScreen() {
  const insets = useSafeAreaInsets();
  const { user, trips, payCommissionAndAccept } = useApp();
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const topBarHeight = Platform.OS === "web" ? insets.top + 67 : insets.top;

  const filteredTrips = useMemo(() => {
    let list = trips;

    if (user?.role === "merchant") {
      list = trips.filter((t) => t.merchantId === user.id);
    } else if (user?.role === "driver") {
      if (activeFilter === "All") {
        list = trips.filter(
          (t) => t.status === "pending" || t.driverId === user.id
        );
      } else {
        list = trips.filter((t) => t.driverId === user.id);
      }
    }

    if (activeFilter !== "All") {
      const statusMap: Record<string, string> = {
        Pending: "pending",
        "In Transit": "in_transit",
        Delivered: "delivered",
      };
      const statusKey = statusMap[activeFilter];
      if (statusKey) list = list.filter((t) => t.status === statusKey);
    }

    return list.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [user, trips, activeFilter]);

  const openCommissionModal = (trip: Trip) => {
    setSelectedTrip(trip);
    setModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handlePayCommission = async () => {
    if (!selectedTrip) return;
    setModalVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await payCommissionAndAccept(selectedTrip.id);
    Alert.alert(
      "Trip Confirm Ho Gayi! ✅",
      "Commission pay ho gayi. Ab trip mein jaayein — merchant ka phone number aur location dikhega.",
      [{ text: "Theek Hai" }]
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topBarHeight + 16 }]}>
        <Text style={styles.headerTitle}>
          {user?.role === "driver" ? "Trips" : "Meri Trips"}
        </Text>
        {user?.role === "merchant" && (
          <Pressable
            style={styles.addBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/book-trip");
            }}
          >
            <Ionicons name="add" size={22} color={Colors.primary} />
          </Pressable>
        )}
      </View>

      {user?.role === "driver" && (
        <View style={styles.driverNotice}>
          <MaterialCommunityIcons name="information" size={14} color={Colors.info} />
          <Text style={styles.driverNoticeText}>
            Commission pay karne ke baad merchant ka contact milega
          </Text>
        </View>
      )}

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Pressable
            key={f}
            style={[
              styles.filterChip,
              activeFilter === f && styles.filterChipActive,
            ]}
            onPress={() => {
              setActiveFilter(f);
              Haptics.selectionAsync();
            }}
          >
            <Text
              style={[
                styles.filterText,
                activeFilter === f && styles.filterTextActive,
              ]}
            >
              {f}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filteredTrips}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TripItem
            trip={item}
            role={user?.role || "merchant"}
            onPayCommission={() => openCommissionModal(item)}
            onPress={() => {
              Haptics.selectionAsync();
              router.push(`/trip/${item.id}`);
            }}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          filteredTrips.length === 0 && styles.emptyContent,
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="truck-outline"
              size={64}
              color={Colors.textMuted}
            />
            <Text style={styles.emptyTitle}>Koi trip nahi mili</Text>
            <Text style={styles.emptyText}>
              {activeFilter !== "All"
                ? `Koi ${activeFilter.toLowerCase()} trip nahi hai`
                : user?.role === "merchant"
                ? "Pehli trip book karein"
                : "Abhi koi trip available nahi hai"}
            </Text>
          </View>
        }
        scrollEnabled={!!filteredTrips.length}
      />

      <CommissionModal
        visible={modalVisible}
        trip={selectedTrip}
        onConfirm={handlePayCommission}
        onClose={() => setModalVisible(false)}
      />
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#1A0A00",
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  driverNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: "#001F40",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#003366",
  },
  driverNoticeText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.info,
    flex: 1,
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: "#1A0A00",
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
  },
  filterTextActive: {
    color: Colors.primary,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  emptyContent: {
    flexGrow: 1,
  },
  tripItem: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  tripHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  routeContainer: {
    alignItems: "center",
    gap: 4,
  },
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  routeDotEnd: {
    backgroundColor: Colors.success,
  },
  fromCity: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  toCity: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  routeLineContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  routeLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  tripBody: {
    padding: 16,
    gap: 12,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  infoItem: {
    width: "45%",
    gap: 2,
  },
  infoLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  infoValue: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  commissionInfoBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2A1F00",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#4A3500",
  },
  commissionInfoText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.warning,
    flex: 1,
  },
  tripFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  biltyNum: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  timeText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginTop: 2,
  },
  tripActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  commissionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  commissionBtnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  detailBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 16,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 8,
  },
  iconRow: {
    alignItems: "center",
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#1A0A00",
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: -8,
  },
  tripSummary: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  summaryText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  summaryMuted: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  amountBox: {
    backgroundColor: "#0D0D1A",
    borderRadius: 12,
    padding: 16,
    gap: 0,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  amountDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 10,
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amountLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  amountValue: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  commissionLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.error,
  },
  commissionValue: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.error,
  },
  earningLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.success,
  },
  earningValue: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.success,
  },
  lockNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#2A1F00",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#4A3500",
  },
  lockNoteText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.warning,
    flex: 1,
    lineHeight: 18,
  },
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
  },
  payBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 10,
  },
  cancelBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
  },
});
