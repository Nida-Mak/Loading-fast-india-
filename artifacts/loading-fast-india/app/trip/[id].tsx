import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useApp, TripStatus } from "@/context/AppContext";

function formatCurrency(amount: number) {
  return "₹" + amount.toLocaleString("en-IN");
}

function formatDateTime(dateStr?: string) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_CONFIG: Record<
  string,
  { color: string; bg: string; label: string; icon: string }
> = {
  pending: {
    color: Colors.warning,
    bg: "#2A1F00",
    label: "Pending",
    icon: "clock-outline",
  },
  accepted: {
    color: Colors.info,
    bg: "#001F40",
    label: "Accepted",
    icon: "check-circle-outline",
  },
  in_transit: {
    color: Colors.primary,
    bg: "#1A0A00",
    label: "In Transit",
    icon: "truck-delivery",
  },
  delivered: {
    color: Colors.success,
    bg: "#002A1A",
    label: "Delivered",
    icon: "package-variant-closed-check",
  },
  cancelled: {
    color: Colors.error,
    bg: "#2A0000",
    label: "Cancelled",
    icon: "close-circle-outline",
  },
};

const STEPS: { key: TripStatus; label: string }[] = [
  { key: "pending", label: "Booked" },
  { key: "accepted", label: "Driver Assigned" },
  { key: "in_transit", label: "In Transit" },
  { key: "delivered", label: "Delivered" },
];

function StepProgress({ status }: { status: TripStatus }) {
  if (status === "cancelled") {
    return (
      <View style={styles.cancelledBanner}>
        <MaterialCommunityIcons
          name="close-circle"
          size={16}
          color={Colors.error}
        />
        <Text style={styles.cancelledText}>This trip has been cancelled</Text>
      </View>
    );
  }

  const currentStep = STEPS.findIndex((s) => s.key === status);

  return (
    <View style={styles.progressContainer}>
      {STEPS.map((step, i) => {
        const done = i <= currentStep;
        const active = i === currentStep;
        return (
          <React.Fragment key={step.key}>
            <View style={styles.stepItem}>
              <View
                style={[
                  styles.stepDot,
                  done && styles.stepDotDone,
                  active && styles.stepDotActive,
                ]}
              >
                {done && !active && (
                  <Ionicons name="checkmark" size={10} color="#fff" />
                )}
                {active && (
                  <View style={styles.stepDotInner} />
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  done && styles.stepLabelDone,
                  active && styles.stepLabelActive,
                ]}
              >
                {step.label}
              </Text>
            </View>
            {i < STEPS.length - 1 && (
              <View
                style={[styles.stepLine, i < currentStep && styles.stepLineDone]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon: string;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.infoRow}>
      <MaterialCommunityIcons
        name={icon as any}
        size={16}
        color={Colors.textMuted}
      />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text
        style={[styles.infoValue, highlight && { color: Colors.primary }]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trips, user, acceptTrip, startTrip, deliverTrip, cancelTrip } =
    useApp();
  const insets = useSafeAreaInsets();

  const trip = useMemo(() => trips.find((t) => t.id === id), [trips, id]);
  const [loading, setLoading] = useState(false);

  if (!trip) {
    return (
      <View style={styles.notFound}>
        <MaterialCommunityIcons
          name="truck-remove"
          size={64}
          color={Colors.textMuted}
        />
        <Text style={styles.notFoundText}>Trip not found</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backLink}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const status = STATUS_CONFIG[trip.status];

  const canAccept =
    user?.role === "driver" && trip.status === "pending" && !trip.driverId;
  const canStart =
    user?.role === "driver" &&
    trip.driverId === user.id &&
    trip.status === "accepted";
  const canDeliver =
    user?.role === "driver" &&
    trip.driverId === user.id &&
    trip.status === "in_transit";
  const canCancel =
    (user?.role === "merchant" && trip.merchantId === user.id) ||
    user?.role === "admin";
  const isActive =
    trip.status !== "delivered" && trip.status !== "cancelled";

  const handleAction = async (
    action: "accept" | "start" | "deliver" | "cancel",
    confirmMsg: string
  ) => {
    Alert.alert(
      "Confirm",
      confirmMsg,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setLoading(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            try {
              if (action === "accept") await acceptTrip(trip.id);
              else if (action === "start") await startTrip(trip.id);
              else if (action === "deliver") await deliverTrip(trip.id);
              else if (action === "cancel") await cancelTrip(trip.id);
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
            } catch {
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topCard}>
          <View style={styles.biltyRow}>
            <View>
              <Text style={styles.biltyNum}>{trip.biltyNumber}</Text>
              <Text style={styles.biltyLabel}>Bilty Number</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <MaterialCommunityIcons
                name={status.icon as any}
                size={14}
                color={status.color}
              />
              <Text style={[styles.statusText, { color: status.color }]}>
                {status.label}
              </Text>
            </View>
          </View>

          <View style={styles.routeSection}>
            <View style={styles.routeCity}>
              <Text style={styles.routeCityLabel}>From</Text>
              <Text style={styles.routeCityName}>{trip.fromCity}</Text>
            </View>
            <View style={styles.routeMiddle}>
              <MaterialCommunityIcons
                name="truck-fast"
                size={24}
                color={Colors.primary}
              />
              <View style={styles.routeArrow} />
            </View>
            <View style={[styles.routeCity, { alignItems: "flex-end" }]}>
              <Text style={styles.routeCityLabel}>To</Text>
              <Text style={styles.routeCityName}>{trip.toCity}</Text>
            </View>
          </View>
        </View>

        <View style={styles.progressCard}>
          <Text style={styles.cardTitle}>Trip Progress</Text>
          <StepProgress status={trip.status} />
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Goods Details</Text>
          <InfoRow
            icon="package-variant"
            label="Goods Type"
            value={trip.goodsType}
          />
          <InfoRow
            icon="weight"
            label="Weight"
            value={`${trip.weightKg} kg`}
          />
          <InfoRow icon="truck" label="Vehicle Type" value={trip.vehicleType} />
          {trip.description ? (
            <InfoRow
              icon="text-box-outline"
              label="Description"
              value={trip.description}
            />
          ) : null}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Financial Details</Text>
          <InfoRow
            icon="currency-inr"
            label="Freight Amount"
            value={formatCurrency(trip.freightAmount)}
            highlight
          />
          <InfoRow
            icon="percent"
            label="LFI Commission (5%)"
            value={formatCurrency(trip.lfiCommission)}
          />
          <InfoRow
            icon="cash"
            label="Driver Earning"
            value={formatCurrency(trip.driverEarning)}
          />
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Parties</Text>
          <InfoRow
            icon="storefront"
            label="Merchant"
            value={trip.merchantName}
          />
          <InfoRow
            icon="account"
            label="Consignee"
            value={trip.consigneeName}
          />
          <InfoRow
            icon="phone"
            label="Consignee Phone"
            value={"+91 " + trip.consigneePhone}
          />
          <InfoRow
            icon="truck-account"
            label="Driver"
            value={trip.driverName || "Not assigned yet"}
          />
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Timeline</Text>
          <InfoRow
            icon="clock-plus-outline"
            label="Booked"
            value={formatDateTime(trip.createdAt)}
          />
          {trip.acceptedAt && (
            <InfoRow
              icon="check-circle-outline"
              label="Accepted"
              value={formatDateTime(trip.acceptedAt)}
            />
          )}
          {trip.deliveredAt && (
            <InfoRow
              icon="package-check"
              label="Delivered"
              value={formatDateTime(trip.deliveredAt)}
            />
          )}
        </View>
      </ScrollView>

      {isActive && (
        <View
          style={[styles.actionBar, { paddingBottom: insets.bottom + 16 }]}
        >
          {canAccept && (
            <Pressable
              style={styles.actionBtn}
              onPress={() =>
                handleAction("accept", "Do you want to accept this trip?")
              }
              disabled={loading}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryLight]}
                style={styles.actionBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="check"
                      size={20}
                      color="#fff"
                    />
                    <Text style={styles.actionBtnText}>Accept Trip</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          )}
          {canStart && (
            <Pressable
              style={styles.actionBtn}
              onPress={() =>
                handleAction("start", "Start transit for this trip?")
              }
              disabled={loading}
            >
              <LinearGradient
                colors={[Colors.info, "#0066CC"]}
                style={styles.actionBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="truck-delivery"
                      size={20}
                      color="#fff"
                    />
                    <Text style={styles.actionBtnText}>Start Transit</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          )}
          {canDeliver && (
            <Pressable
              style={styles.actionBtn}
              onPress={() =>
                handleAction(
                  "deliver",
                  "Mark this trip as delivered? This cannot be undone."
                )
              }
              disabled={loading}
            >
              <LinearGradient
                colors={[Colors.success, "#008844"]}
                style={styles.actionBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="package-check"
                      size={20}
                      color="#fff"
                    />
                    <Text style={styles.actionBtnText}>Mark as Delivered</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          )}
          {canCancel && isActive && trip.status === "pending" && (
            <Pressable
              style={styles.cancelBtn}
              onPress={() =>
                handleAction("cancel", "Cancel this trip? This cannot be undone.")
              }
              disabled={loading}
            >
              <MaterialCommunityIcons
                name="close-circle-outline"
                size={18}
                color={Colors.error}
              />
              <Text style={styles.cancelBtnText}>Cancel Trip</Text>
            </Pressable>
          )}
        </View>
      )}
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
    gap: 16,
  },
  topCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 20,
  },
  biltyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  biltyNum: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  biltyLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  routeSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  routeCity: {
    flex: 1,
  },
  routeCityLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginBottom: 2,
  },
  routeCityName: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  routeMiddle: {
    alignItems: "center",
    gap: 4,
  },
  routeArrow: {
    width: 40,
    height: 1,
    backgroundColor: Colors.border,
  },
  progressCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 4,
  },
  stepItem: {
    alignItems: "center",
    gap: 6,
    width: 60,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotDone: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  stepDotActive: {
    backgroundColor: Colors.card,
    borderColor: Colors.primary,
  },
  stepDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  stepLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 14,
  },
  stepLabelDone: {
    color: Colors.textSecondary,
  },
  stepLabelActive: {
    color: Colors.primary,
    fontFamily: "Inter_600SemiBold",
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.border,
    marginTop: 11,
  },
  stepLineDone: {
    backgroundColor: Colors.primary,
  },
  cancelledBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#2A0000",
    borderRadius: 10,
    padding: 12,
  },
  cancelledText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.error,
  },
  infoCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    width: 120,
    flexShrink: 0,
  },
  infoValue: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    flex: 1,
    textAlign: "right",
  },
  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 10,
  },
  actionBtn: {
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  actionBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    gap: 8,
  },
  actionBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.error,
    backgroundColor: "#2A0000",
  },
  cancelBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.error,
  },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
    gap: 16,
  },
  notFoundText: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  backLink: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
});
