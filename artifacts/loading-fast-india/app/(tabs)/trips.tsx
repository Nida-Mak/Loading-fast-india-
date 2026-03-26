import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
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
  accepted: { color: Colors.info, bg: "#001F40", label: "Accepted", icon: "check-circle-outline" },
  in_transit: { color: Colors.primary, bg: "#1A0A00", label: "In Transit", icon: "truck-delivery" },
  delivered: { color: Colors.success, bg: "#002A1A", label: "Delivered", icon: "package-variant-closed-check" },
  cancelled: { color: Colors.error, bg: "#2A0000", label: "Cancelled", icon: "close-circle-outline" },
};

const FILTERS = ["All", "Pending", "In Transit", "Delivered"];

function TripItem({
  trip,
  role,
  onAccept,
  onPress,
}: {
  trip: Trip;
  role: string;
  onAccept?: () => void;
  onPress: () => void;
}) {
  const status = STATUS_CONFIG[trip.status];

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
            <Text style={styles.infoLabel}>Goods</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {trip.goodsType}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Weight</Text>
            <Text style={styles.infoValue}>{trip.weightKg} kg</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Vehicle</Text>
            <Text style={styles.infoValue}>{trip.vehicleType}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Freight</Text>
            <Text style={[styles.infoValue, { color: Colors.primary }]}>
              {formatCurrency(trip.freightAmount)}
            </Text>
          </View>
        </View>

        <View style={styles.tripFooter}>
          <View>
            <Text style={styles.biltyNum}>{trip.biltyNumber}</Text>
            <Text style={styles.timeText}>{timeAgo(trip.createdAt)}</Text>
          </View>
          <View style={styles.tripActions}>
            {role === "driver" && trip.status === "pending" && (
              <Pressable
                style={styles.acceptBtn}
                onPress={(e) => {
                  e.stopPropagation?.();
                  onAccept?.();
                }}
              >
                <Text style={styles.acceptBtnText}>Accept</Text>
                <Ionicons name="checkmark" size={14} color="#fff" />
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
  const { user, trips, acceptTrip } = useApp();
  const [activeFilter, setActiveFilter] = useState("All");

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

  const handleAccept = (tripId: string) => {
    Alert.alert("Accept Trip", "Do you want to accept this trip?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Accept",
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          await acceptTrip(tripId);
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topBarHeight + 16 }]}>
        <Text style={styles.headerTitle}>
          {user?.role === "driver" ? "Available & My Trips" : "My Trips"}
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
            onAccept={() => handleAccept(item.id)}
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
            <Text style={styles.emptyTitle}>No trips found</Text>
            <Text style={styles.emptyText}>
              {activeFilter !== "All"
                ? `No ${activeFilter.toLowerCase()} trips`
                : user?.role === "merchant"
                ? "Book your first trip"
                : "No trips available right now"}
            </Text>
          </View>
        }
        scrollEnabled={!!filteredTrips.length}
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
  acceptBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  acceptBtnText: {
    fontSize: 13,
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
