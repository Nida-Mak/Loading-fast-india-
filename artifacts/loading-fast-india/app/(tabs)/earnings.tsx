import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo } from "react";
import {
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

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function EarningRow({ trip, role }: { trip: Trip; role: string }) {
  const earning =
    role === "driver"
      ? trip.driverEarning
      : role === "admin"
      ? trip.lfiCommission
      : trip.freightAmount;

  return (
    <View style={styles.earningRow}>
      <View style={styles.earningIcon}>
        <MaterialCommunityIcons
          name="truck-check"
          size={20}
          color={Colors.success}
        />
      </View>
      <View style={styles.earningInfo}>
        <Text style={styles.earningRoute}>
          {trip.fromCity} → {trip.toCity}
        </Text>
        <Text style={styles.earningDate}>
          {trip.biltyNumber} •{" "}
          {formatDate(trip.deliveredAt || trip.createdAt)}
        </Text>
        {role === "driver" && (
          <Text style={styles.commissionNote}>
            LFI Commission: {formatCurrency(trip.lfiCommission)}
          </Text>
        )}
      </View>
      <Text style={styles.earningAmount}>{formatCurrency(earning)}</Text>
    </View>
  );
}

export default function EarningsScreen() {
  const insets = useSafeAreaInsets();
  const { user, trips, getEarnings } = useApp();
  const earnings = useMemo(() => getEarnings(), [getEarnings]);

  const topBarHeight = Platform.OS === "web" ? insets.top + 67 : insets.top;

  const completedTrips = useMemo(() => {
    if (!user) return [];
    if (user.role === "driver") {
      return trips.filter(
        (t) => t.driverId === user.id && t.status === "delivered"
      );
    }
    if (user.role === "admin") {
      return trips.filter((t) => t.status === "delivered");
    }
    return trips.filter(
      (t) => t.merchantId === user.id && t.status === "delivered"
    );
  }, [user, trips]);

  const earningLabel =
    user?.role === "driver"
      ? "Driver Earnings"
      : user?.role === "admin"
      ? "LFI Commission"
      : "Total Freight";

  const monthlyData = useMemo(() => {
    const now = new Date();
    const months: { month: string; amount: number }[] = [];
    for (let i = 2; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const monthTrips = completedTrips.filter((t) => {
        const date = new Date(t.deliveredAt || t.createdAt);
        return date >= start && date <= end;
      });
      const amount = monthTrips.reduce(
        (sum, t) =>
          user?.role === "driver"
            ? sum + t.driverEarning
            : user?.role === "admin"
            ? sum + t.lfiCommission
            : sum + t.freightAmount,
        0
      );
      months.push({ month: monthName, amount });
    }
    return months;
  }, [completedTrips, user]);

  const maxMonthly = Math.max(...monthlyData.map((m) => m.amount), 1);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: topBarHeight + 20, paddingBottom: 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Earnings</Text>

        <LinearGradient
          colors={["#1A0A00", "#0F0800"]}
          style={styles.totalCard}
        >
          <View style={styles.totalHeader}>
            <MaterialCommunityIcons
              name="currency-inr"
              size={22}
              color={Colors.primary}
            />
            <Text style={styles.totalLabel}>{earningLabel}</Text>
          </View>
          <Text style={styles.totalAmount}>
            {formatCurrency(earnings.total)}
          </Text>
          <View style={styles.totalMeta}>
            <View style={styles.totalMetaItem}>
              <Text style={styles.totalMetaValue}>
                {formatCurrency(earnings.thisMonth)}
              </Text>
              <Text style={styles.totalMetaLabel}>This Month</Text>
            </View>
            <View style={styles.totalMetaDivider} />
            <View style={styles.totalMetaItem}>
              <Text style={styles.totalMetaValue}>
                {earnings.completedTrips}
              </Text>
              <Text style={styles.totalMetaLabel}>Completed Trips</Text>
            </View>
            {user?.role !== "merchant" && (
              <>
                <View style={styles.totalMetaDivider} />
                <View style={styles.totalMetaItem}>
                  <Text style={styles.totalMetaValue}>2%</Text>
                  <Text style={styles.totalMetaLabel}>LFI Commission</Text>
                </View>
              </>
            )}
          </View>
        </LinearGradient>

        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Monthly Overview</Text>
          <View style={styles.barChart}>
            {monthlyData.map((item, i) => (
              <View key={i} style={styles.barContainer}>
                <Text style={styles.barAmount}>
                  {item.amount > 0
                    ? "₹" + (item.amount / 1000).toFixed(0) + "k"
                    : "-"}
                </Text>
                <View style={styles.barTrack}>
                  <LinearGradient
                    colors={[Colors.primary, Colors.primaryLight]}
                    style={[
                      styles.bar,
                      {
                        height:
                          item.amount > 0
                            ? Math.max(
                                (item.amount / maxMonthly) * 100,
                                8
                              )
                            : 4,
                        opacity: item.amount > 0 ? 1 : 0.3,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barMonth}>{item.month}</Text>
              </View>
            ))}
          </View>
        </View>

        {user?.role === "driver" && (
          <View style={styles.infoCard}>
            <MaterialCommunityIcons
              name="information-outline"
              size={16}
              color={Colors.info}
            />
            <Text style={styles.infoText}>
              LFI charges{" "}
              <Text style={{ color: Colors.primary, fontFamily: "Inter_600SemiBold" }}>
                2% service commission
              </Text>{" "}
              on every freight amount. Your earning = Freight - 2% Commission.
            </Text>
          </View>
        )}

        {user?.role === "admin" && (
          <View style={styles.infoCard}>
            <MaterialCommunityIcons
              name="shield-check-outline"
              size={16}
              color={Colors.success}
            />
            <Text style={styles.infoText}>
              LFI earns{" "}
              <Text style={{ color: Colors.primary, fontFamily: "Inter_600SemiBold" }}>
                2% of each freight amount
              </Text>{" "}
              as service commission. Total platform earnings shown above.
            </Text>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Transaction History</Text>
          <Text style={styles.sectionCount}>
            {completedTrips.length} trips
          </Text>
        </View>

        {completedTrips.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="cash-remove"
              size={56}
              color={Colors.textMuted}
            />
            <Text style={styles.emptyTitle}>No earnings yet</Text>
            <Text style={styles.emptyText}>
              Complete trips to see your earnings here
            </Text>
          </View>
        ) : (
          <View style={styles.earningsList}>
            {completedTrips.map((trip) => (
              <EarningRow key={trip.id} trip={trip} role={user?.role || "driver"} />
            ))}
          </View>
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
  content: {
    paddingHorizontal: 20,
  },
  pageTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 20,
  },
  totalCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#3A1500",
  },
  totalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  totalAmount: {
    fontSize: 40,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 20,
  },
  totalMeta: {
    flexDirection: "row",
    gap: 16,
  },
  totalMetaItem: {
    flex: 1,
    gap: 2,
  },
  totalMetaValue: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  totalMetaLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  totalMetaDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  chartSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 16,
  },
  barChart: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  barContainer: {
    alignItems: "center",
    flex: 1,
    gap: 6,
  },
  barAmount: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  barTrack: {
    width: 32,
    height: 100,
    backgroundColor: Colors.surface,
    borderRadius: 6,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  bar: {
    width: "100%",
    borderRadius: 6,
  },
  barMonth: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
  },
  infoCard: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionCount: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  earningsList: {
    gap: 2,
  },
  earningRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  earningIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#002A1A",
    alignItems: "center",
    justifyContent: "center",
  },
  earningInfo: {
    flex: 1,
    gap: 2,
  },
  earningRoute: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  earningDate: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  commissionNote: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.warning,
  },
  earningAmount: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.success,
  },
  emptyState: {
    alignItems: "center",
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
