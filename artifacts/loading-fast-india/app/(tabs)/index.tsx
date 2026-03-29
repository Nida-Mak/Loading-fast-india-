import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
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
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return "Just now";
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const STATUS_CONFIG: Record<
  string,
  { color: string; bg: string; label: string }
> = {
  pending: { color: Colors.warning, bg: "#2A1F00", label: "Pending" },
  accepted: { color: Colors.info, bg: "#001F40", label: "Accepted" },
  in_transit: { color: Colors.primary, bg: "#1A0A00", label: "In Transit" },
  delivered: { color: Colors.success, bg: "#002A1A", label: "Delivered" },
  cancelled: { color: Colors.error, bg: "#2A0000", label: "Cancelled" },
};

function TripCard({
  trip,
  onPress,
  onDelete,
}: {
  trip: Trip;
  onPress: () => void;
  onDelete?: () => void;
}) {
  const status = STATUS_CONFIG[trip.status] ?? STATUS_CONFIG["pending"];
  return (
    <Pressable
      style={({ pressed }) => [styles.tripCard, pressed && { opacity: 0.8 }]}
      onPress={onPress}
    >
      <View style={styles.tripCardHeader}>
        <View style={styles.routeRow}>
          <Text style={styles.cityText}>{trip.fromCity}</Text>
          <MaterialCommunityIcons
            name="arrow-right"
            size={16}
            color={Colors.primary}
          />
          <Text style={styles.cityText}>{trip.toCity}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
          {onDelete && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                onDelete();
              }}
              hitSlop={8}
              style={styles.deleteBtn}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={18} color="#FF4444" />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.tripCardMeta}>
        <View style={styles.metaItem}>
          <MaterialCommunityIcons
            name="package-variant"
            size={14}
            color={Colors.textMuted}
          />
          <Text style={styles.metaText} numberOfLines={1}>
            {trip.goodsType}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <MaterialCommunityIcons
            name="weight"
            size={14}
            color={Colors.textMuted}
          />
          <Text style={styles.metaText}>{trip.weightKg}kg</Text>
        </View>
      </View>

      <View style={styles.tripCardFooter}>
        <Text style={styles.biltyNum}>{trip.biltyNumber}</Text>
        <Text style={styles.freightAmount}>
          {formatCurrency(trip.freightAmount)}
        </Text>
      </View>
    </Pressable>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <MaterialCommunityIcons name={icon as any} size={22} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user, trips, getEarnings, getAvailableTrips, deleteTrip } = useApp();
  const earnings = useMemo(() => getEarnings(), [getEarnings]);
  const availableTrips = useMemo(() => getAvailableTrips(), [getAvailableTrips]);

  const myTrips = useMemo(() => {
    if (!user) return [];
    if (user.role === "merchant") {
      return trips
        .filter((t) => t.merchantId === user.id)
        .slice(0, 5);
    }
    if (user.role === "driver") {
      return trips.filter((t) => t.driverId === user.id).slice(0, 5);
    }
    return trips.slice(0, 5);
  }, [user, trips]);

  const topBarHeight = Platform.OS === "web" ? insets.top + 67 : insets.top;

  const stats =
    user?.role === "merchant"
      ? [
          {
            icon: "truck-delivery",
            label: "Total Trips",
            value: String(
              trips.filter((t) => t.merchantId === user?.id).length
            ),
            color: Colors.primary,
          },
          {
            icon: "clock-outline",
            label: "Active",
            value: String(
              trips.filter(
                (t) =>
                  t.merchantId === user?.id &&
                  (t.status === "accepted" || t.status === "in_transit")
              ).length
            ),
            color: Colors.warning,
          },
          {
            icon: "check-circle-outline",
            label: "Delivered",
            value: String(
              trips.filter(
                (t) => t.merchantId === user?.id && t.status === "delivered"
              ).length
            ),
            color: Colors.success,
          },
        ]
      : user?.role === "driver"
      ? [
          {
            icon: "truck",
            label: "Available",
            value: String(availableTrips.length),
            color: Colors.primary,
          },
          {
            icon: "currency-inr",
            label: "Earned",
            value: formatCurrency(earnings.total),
            color: Colors.success,
          },
          {
            icon: "package-variant-closed",
            label: "Completed",
            value: String(earnings.completedTrips),
            color: Colors.info,
          },
        ]
      : [
          {
            icon: "truck-delivery",
            label: "Total Trips",
            value: String(trips.length),
            color: Colors.primary,
          },
          {
            icon: "currency-inr",
            label: "Commission",
            value: formatCurrency(earnings.commission),
            color: Colors.success,
          },
          {
            icon: "clock-outline",
            label: "Pending",
            value: String(trips.filter((t) => t.status === "pending").length),
            color: Colors.warning,
          },
        ];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: topBarHeight + 20, paddingBottom: 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topSection}>
          <View>
            <Text style={styles.greeting}>
              Namaste, {user?.name?.split(" ")[0]} 🙏
            </Text>
            <View style={styles.roleChip}>
              <MaterialCommunityIcons
                name={
                  user?.role === "merchant"
                    ? "storefront"
                    : user?.role === "driver"
                    ? "truck"
                    : "shield-account"
                }
                size={14}
                color={Colors.primary}
              />
              <Text style={styles.roleChipText}>
                {user?.role === "merchant"
                  ? "Merchant"
                  : user?.role === "driver"
                  ? "Driver"
                  : "Admin"}{" "}
                • {user?.city}
              </Text>
            </View>
          </View>
          <View style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={22} color={Colors.textSecondary} />
          </View>
        </View>

        {user?.role === "merchant" && (
          <Pressable
            style={({ pressed }) => [
              styles.bookTripBtn,
              pressed && { opacity: 0.88 },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/book-trip");
            }}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryLight]}
              style={styles.bookTripGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.bookTripContent}>
                <MaterialCommunityIcons
                  name="truck-plus"
                  size={28}
                  color="#fff"
                />
                <View style={styles.bookTripText}>
                  <Text style={styles.bookTripTitle}>Book a New Trip</Text>
                  <Text style={styles.bookTripSub}>
                    Fast & reliable logistics
                  </Text>
                </View>
              </View>
              <Ionicons name="arrow-forward-circle" size={28} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
          </Pressable>
        )}

        {user?.role === "driver" && availableTrips.length > 0 && (
          <LinearGradient
            colors={["#1A0A00", "#0F0800"]}
            style={styles.availableCard}
          >
            <View style={styles.availableHeader}>
              <MaterialCommunityIcons
                name="truck-delivery"
                size={20}
                color={Colors.primary}
              />
              <Text style={styles.availableTitle}>
                {availableTrips.length} Trips Available
              </Text>
            </View>
            <Text style={styles.availableSubtext}>
              Accept trips and start earning today
            </Text>
            <Pressable
              style={styles.viewTripsBtn}
              onPress={() => router.push("/(tabs)/trips")}
            >
              <Text style={styles.viewTripsBtnText}>View All Trips</Text>
              <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
            </Pressable>
          </LinearGradient>
        )}

        <View style={styles.statsRow}>
          {stats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {user?.role === "merchant"
              ? "Recent Bookings"
              : user?.role === "driver"
              ? "My Trips"
              : "All Recent Trips"}
          </Text>
          <Pressable onPress={() => router.push("/(tabs)/trips")}>
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        </View>

        {myTrips.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="truck-outline"
              size={48}
              color={Colors.textMuted}
            />
            <Text style={styles.emptyTitle}>No trips yet</Text>
            <Text style={styles.emptyText}>
              {user?.role === "merchant"
                ? "Book your first trip to get started"
                : "Accept a trip to start earning"}
            </Text>
          </View>
        ) : (
          myTrips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              onPress={() => {
                Haptics.selectionAsync();
                router.push(`/trip/${trip.id}`);
              }}
              onDelete={
                user?.role === "admin"
                  ? () => deleteTrip(trip.id)
                  : undefined
              }
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  topSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  greeting: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 6,
  },
  roleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#1A0A00",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#3A1500",
  },
  roleChipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bookTripBtn: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  bookTripGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
  },
  bookTripContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  bookTripText: {
    gap: 2,
  },
  bookTripTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  bookTripSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
  },
  availableCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#3A1500",
  },
  availableHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  availableTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  availableSubtext: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginBottom: 14,
  },
  viewTripsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  viewTripsBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    alignItems: "flex-start",
    gap: 6,
    borderTopWidth: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  seeAll: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
  tripCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  tripCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  cityText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  deleteBtn: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: "rgba(255,68,68,0.12)",
  },
  tripCardMeta: {
    flexDirection: "row",
    gap: 14,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flex: 1,
  },
  metaText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    flex: 1,
  },
  tripCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  biltyNum: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  freightAmount: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
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
