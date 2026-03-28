import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useApp, TripStatus, getVehicleNotificationConfig } from "@/context/AppContext";
import LiveMap from "@/components/LiveMap";
import { useDriverLocationTracking, useMerchantLocationWatch } from "@/hooks/useLocationTracking";

const COMMISSION_UPI = "maksudsaiyed888@oksbi";

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
    label: "Confirmed",
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
  { key: "accepted", label: "Confirmed" },
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
        <Text style={styles.cancelledText}>Yeh trip cancel ho gayi hai</Text>
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
  valueColor,
}: {
  icon: string;
  label: string;
  value: string;
  highlight?: boolean;
  valueColor?: string;
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
        style={[
          styles.infoValue,
          highlight && { color: Colors.primary },
          valueColor ? { color: valueColor } : null,
        ]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

function UserRatingBadge({ rating, totalRatings, isVerified, name }: {
  rating: number;
  totalRatings: number;
  isVerified: boolean;
  name: string;
}) {
  if (totalRatings === 0) return null;
  const stars = Math.round(rating);
  return (
    <View style={styles.ratingBadgeRow}>
      <View style={styles.starsSmallRow}>
        {[1, 2, 3, 4, 5].map((s) => (
          <MaterialCommunityIcons
            key={s}
            name={s <= stars ? "star" : "star-outline"}
            size={14}
            color={Colors.warning}
          />
        ))}
        <Text style={styles.ratingBadgeScore}> {rating.toFixed(1)}</Text>
        <Text style={styles.ratingBadgeCount}> ({totalRatings} rating{totalRatings !== 1 ? "s" : ""})</Text>
      </View>
      {isVerified && (
        <View style={styles.verifiedBadge}>
          <MaterialCommunityIcons name="check-decagram" size={13} color="#fff" />
          <Text style={styles.verifiedText}>Verified</Text>
        </View>
      )}
    </View>
  );
}

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trips, user, registeredUsers, fraudCases, payCommissionAndAccept, startTrip, deliverTrip, cancelTrip, rateUser, getFraudCasesForTrip } =
    useApp();
  const insets = useSafeAreaInsets();

  const trip = useMemo(() => trips.find((t) => t.id === id), [trips, id]);
  const [loading, setLoading] = useState(false);
  const [upiOpened, setUpiOpened] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ action: "start" | "deliver" | "cancel"; msg: string } | null>(null);
  const [selectedStars, setSelectedStars] = useState(0);
  const [ratingLoading, setRatingLoading] = useState(false);
  const tripFraudCases = useMemo(
    () => (id ? getFraudCasesForTrip(id) : []),
    [fraudCases, id]
  );
  const pendingFraudAgainstMe = tripFraudCases.find(
    (c) => c.accusedId === user?.id && c.status === "pending_merchant"
  );

  const isInTransit = trip?.status === "in_transit";
  const driverTracking = useDriverLocationTracking(
    id ?? "",
    user?.name ?? "Driver"
  );
  const { location: merchantLiveLocation, loading: locationLoading } =
    useMerchantLocationWatch(id ?? "", isInTransit && user?.role === "merchant");

  if (!trip) {
    return (
      <View style={styles.notFound}>
        <MaterialCommunityIcons
          name="truck-remove"
          size={64}
          color={Colors.textMuted}
        />
        <Text style={styles.notFoundText}>Trip nahi mili</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backLink}>Wapas jaao</Text>
        </Pressable>
      </View>
    );
  }

  const status = STATUS_CONFIG[trip.status];

  const isDriverView = user?.role === "driver";
  const canPayCommission =
    isDriverView && trip.status === "pending" && !trip.driverId;
  const canStart =
    isDriverView &&
    trip.driverId === user.id &&
    trip.status === "accepted";
  const canDeliver =
    isDriverView &&
    trip.driverId === user.id &&
    trip.status === "in_transit";
  const canCancel =
    (user?.role === "merchant" && trip.merchantId === user.id) ||
    user?.role === "admin";
  const isActive =
    trip.status !== "delivered" && trip.status !== "cancelled";

  const merchantContactUnlocked =
    trip.commissionPaid && trip.driverId === user?.id;

  const handleOpenUPI = async () => {
    if (!trip) return;
    const note = encodeURIComponent(`LFI Commission - ${trip.biltyNumber}`);
    const upiUrl = `upi://pay?pa=${COMMISSION_UPI}&pn=Loading%20Fast%20India&am=${trip.lfiCommission}&cu=INR&tn=${note}`;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const supported = await Linking.canOpenURL(upiUrl);
      if (supported) {
        await Linking.openURL(upiUrl);
      } else {
        await Linking.openURL("https://pay.google.com/");
      }
    } catch {
      await Linking.openURL("https://pay.google.com/");
    }
    setUpiOpened(true);
  };

  const handleConfirmPayment = async () => {
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await payCommissionAndAccept(trip.id);
      setUpiOpened(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Trip Confirm Ho Gayi! ✅",
        "Commission pay ho gayi. Ab merchant ka phone number aur location yahan dikh raha hai.",
        [{ text: "Theek Hai" }]
      );
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (action: "start" | "deliver" | "cancel", confirmMsg: string) => {
    setPendingAction({ action, msg: confirmMsg });
  };

  const executeAction = async () => {
    if (!pendingAction || !trip) return;
    const { action } = pendingAction;
    setPendingAction(null);
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      if (action === "start") await startTrip(trip.id);
      else if (action === "deliver") await deliverTrip(trip.id);
      else if (action === "cancel") await cancelTrip(trip.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleCallPhone = async (phone: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Linking.openURL(`tel:+91${phone}`);
  };

  const submitRating = async () => {
    if (!trip || !user || selectedStars === 0) return;
    setRatingLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      if (user.role === "merchant" && trip.driverId) {
        await rateUser(trip.driverId, trip.id, selectedStars, "merchant");
      } else if (user.role === "driver" && trip.merchantId) {
        await rateUser(trip.merchantId, trip.id, selectedStars, "driver");
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
    } finally {
      setRatingLoading(false);
    }
  };

  const driverUser = trip?.driverId
    ? registeredUsers.find((u) => u.id === trip.driverId) ?? null
    : null;
  const merchantUser = trip?.merchantId
    ? registeredUsers.find((u) => u.id === trip.merchantId) ?? null
    : null;

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
              <Text style={styles.routeCityLabel}>Kahan Se</Text>
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
              <Text style={styles.routeCityLabel}>Kahan Tak</Text>
              <Text style={styles.routeCityName}>{trip.toCity}</Text>
            </View>
          </View>
        </View>

        <View style={styles.progressCard}>
          <Text style={styles.cardTitle}>Trip Progress</Text>
          <StepProgress status={trip.status} />
        </View>

        {/* DRIVER: Location Tracking Card (when in_transit) */}
        {isInTransit && user?.role === "driver" && trip.driverId === user.id && (
          <View style={styles.locationCard}>
            <View style={styles.locationHeader}>
              <View style={styles.locationHeaderLeft}>
                <MaterialCommunityIcons
                  name="map-marker-radius"
                  size={20}
                  color={driverTracking.isTracking ? Colors.success : Colors.textMuted}
                />
                <View>
                  <Text style={styles.locationTitle}>Live Location Sharing</Text>
                  <Text style={styles.locationSubtitle}>
                    {driverTracking.isTracking
                      ? "📡 Merchant ko aapka location dikh raha hai"
                      : "Merchant ko aapka location bhejne ke liye ON karein"}
                  </Text>
                </View>
              </View>
              {driverTracking.isTracking && (
                <View style={styles.liveDot}>
                  <Text style={styles.liveDotText}>LIVE</Text>
                </View>
              )}
            </View>

            {driverTracking.lat && driverTracking.lng && (
              <View style={styles.coordsRow}>
                <Ionicons name="location" size={12} color={Colors.primary} />
                <Text style={styles.coordsText}>
                  {driverTracking.lat.toFixed(5)}, {driverTracking.lng.toFixed(5)}
                </Text>
              </View>
            )}

            {driverTracking.error && (
              <View style={styles.locationError}>
                <Ionicons name="warning" size={14} color={Colors.warning} />
                <Text style={styles.locationErrorText}>{driverTracking.error}</Text>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.trackingBtn,
                driverTracking.isTracking ? styles.trackingBtnStop : styles.trackingBtnStart,
                pressed && { opacity: 0.85 },
              ]}
              onPress={driverTracking.isTracking ? driverTracking.stopTracking : driverTracking.startTracking}
            >
              <MaterialCommunityIcons
                name={driverTracking.isTracking ? "map-marker-off" : "map-marker-check"}
                size={18}
                color="#fff"
              />
              <Text style={styles.trackingBtnText}>
                {driverTracking.isTracking
                  ? "Location Sharing Band Karo"
                  : "Location Sharing Shuru Karo"}
              </Text>
            </Pressable>
          </View>
        )}

        {/* MERCHANT: Live Map Card (when in_transit) */}
        {isInTransit && user?.role === "merchant" && trip.merchantId === user.id && (
          <View style={styles.liveMapCard}>
            <View style={styles.liveMapHeader}>
              <MaterialCommunityIcons name="map-marker-path" size={20} color={Colors.primary} />
              <Text style={styles.liveMapTitle}>Driver Ki Live Location</Text>
              {merchantLiveLocation && (
                <View style={styles.liveDot}>
                  <Text style={styles.liveDotText}>LIVE</Text>
                </View>
              )}
            </View>

            {locationLoading && !merchantLiveLocation && (
              <View style={styles.mapLoading}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.mapLoadingText}>Location dhundh raha hai...</Text>
              </View>
            )}

            {!locationLoading && !merchantLiveLocation && (
              <View style={styles.mapNoLocation}>
                <MaterialCommunityIcons name="map-marker-question" size={36} color={Colors.textMuted} />
                <Text style={styles.mapNoLocationText}>
                  Driver ne abhi location sharing shuru nahi ki
                </Text>
                <Text style={styles.mapNoLocationSub}>
                  Driver trip start hone ke baad apni location share karega
                </Text>
              </View>
            )}

            {merchantLiveLocation && (
              <View style={styles.mapContainer}>
                <LiveMap
                  lat={merchantLiveLocation.lat}
                  lng={merchantLiveLocation.lng}
                  driverName={merchantLiveLocation.driverName}
                  fromCity={trip.fromCity}
                  toCity={trip.toCity}
                  ageSeconds={merchantLiveLocation.ageSeconds}
                />
              </View>
            )}

            <Text style={styles.mapRefreshNote}>
              🔄 Location har 10 second mein update hoti hai
            </Text>
          </View>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Maal Ki Jankari</Text>
          <InfoRow
            icon="package-variant"
            label="Maal"
            value={trip.goodsType}
          />
          <InfoRow
            icon="weight"
            label="Vajan"
            value={`${trip.weightKg} kg`}
          />
          <InfoRow icon="truck" label="Gaadi" value={trip.vehicleType} />
          {(() => {
            const vc = getVehicleNotificationConfig(trip.vehicleType);
            const labelMap = { small: "Local (Sheher)", medium: "Inter-city", heavy: "Long Distance" };
            const colorMap = { small: "#22c55e", medium: "#f59e0b", heavy: "#ef4444" };
            const iconMap = { small: "bike" as const, medium: "truck-outline" as const, heavy: "truck-fast" as const };
            return (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4, marginBottom: 4, flexWrap: "wrap" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colorMap[vc.category] + "22", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: colorMap[vc.category] + "55" }}>
                  <MaterialCommunityIcons name={iconMap[vc.category]} size={12} color={colorMap[vc.category]} />
                  <Text style={{ fontSize: 11, color: colorMap[vc.category], fontWeight: "600" }}>{labelMap[vc.category]}</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#3b82f622", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: "#3b82f655" }}>
                  <MaterialCommunityIcons name="radar" size={12} color="#3b82f6" />
                  <Text style={{ fontSize: 11, color: "#3b82f6", fontWeight: "600" }}>{vc.radiusKm} km radius</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#a855f722", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: "#a855f755" }}>
                  <MaterialCommunityIcons name="bell-ring-outline" size={12} color="#a855f7" />
                  <Text style={{ fontSize: 11, color: "#a855f7", fontWeight: "600" }}>
                    {vc.notificationType === "instant" ? "Instant" : vc.notificationType === "multi_layered" ? "Multi-layer" : "Broadcast"}
                  </Text>
                </View>
              </View>
            );
          })()}
          {trip.description ? (
            <InfoRow
              icon="text-box-outline"
              label="Vivaran"
              value={trip.description}
            />
          ) : null}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Paisa</Text>
          <InfoRow
            icon="currency-inr"
            label="Freight (Rent)"
            value={formatCurrency(trip.freightAmount)}
            highlight
          />
          <InfoRow
            icon="percent"
            label="LFI Commission (5%)"
            value={formatCurrency(trip.lfiCommission)}
            valueColor={Colors.error}
          />
          <InfoRow
            icon="cash"
            label="Driver Ki Kamaai"
            value={formatCurrency(trip.driverEarning)}
            valueColor={Colors.success}
          />
        </View>

        {isDriverView ? (
          merchantContactUnlocked ? (
            <View style={[styles.infoCard, styles.unlockedCard]}>
              <View style={styles.unlockedHeader}>
                <MaterialCommunityIcons name="lock-open-check" size={18} color={Colors.success} />
                <Text style={[styles.cardTitle, { color: Colors.success, marginBottom: 0 }]}>
                  Merchant Ki Jankari
                </Text>
              </View>
              <InfoRow
                icon="storefront"
                label="Merchant"
                value={trip.merchantName}
              />
              {merchantUser && (
                <UserRatingBadge
                  rating={merchantUser.rating}
                  totalRatings={merchantUser.totalRatings}
                  isVerified={merchantUser.isVerified}
                  name={merchantUser.name}
                />
              )}
              <InfoRow
                icon="map-marker"
                label="Pickup Sheher"
                value={trip.merchantCity}
              />
              <InfoRow
                icon="phone"
                label="Phone Number"
                value={"+91 " + trip.merchantPhone}
                valueColor={Colors.info}
              />
              <InfoRow
                icon="account"
                label="Consignee"
                value={trip.consigneeName}
              />
              <InfoRow
                icon="phone-outline"
                label="Consignee Phone"
                value={"+91 " + trip.consigneePhone}
                valueColor={Colors.info}
              />
              <Pressable
                style={[styles.callBtn, { backgroundColor: Colors.info }]}
                onPress={() => handleCallPhone(trip.merchantPhone)}
              >
                <MaterialCommunityIcons name="phone" size={16} color="#fff" />
                <Text style={styles.callBtnText}>Merchant Ko Call Karo</Text>
                <Text style={styles.callBtnNumber}>+91 {trip.merchantPhone}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.lockedCard}>
              <View style={styles.lockedIconRow}>
                <View style={styles.lockedIconCircle}>
                  <MaterialCommunityIcons name="lock" size={28} color={Colors.warning} />
                </View>
              </View>
              <Text style={styles.lockedTitle}>Merchant Ki Jankari</Text>
              <Text style={styles.lockedSubtitle}>
                Commission pay karne ke baad merchant ka naam, phone number aur pickup location milega
              </Text>
              <View style={styles.lockedItems}>
                <View style={styles.lockedItem}>
                  <MaterialCommunityIcons name="storefront" size={14} color={Colors.textMuted} />
                  <Text style={styles.lockedItemText}>Merchant Ka Naam</Text>
                  <View style={styles.lockedBlur} />
                </View>
                <View style={styles.lockedItem}>
                  <MaterialCommunityIcons name="phone" size={14} color={Colors.textMuted} />
                  <Text style={styles.lockedItemText}>Phone Number</Text>
                  <View style={styles.lockedBlur} />
                </View>
                <View style={styles.lockedItem}>
                  <MaterialCommunityIcons name="map-marker" size={14} color={Colors.textMuted} />
                  <Text style={styles.lockedItemText}>Pickup Location</Text>
                  <View style={styles.lockedBlur} />
                </View>
              </View>
            </View>
          )
        ) : (
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
              value={trip.driverName || "Assign nahi hua"}
            />
            {driverUser && (
              <UserRatingBadge
                rating={driverUser.rating}
                totalRatings={driverUser.totalRatings}
                isVerified={driverUser.isVerified}
                name={driverUser.name}
              />
            )}
            {trip.driverPhone && trip.status !== "pending" && (
              <Pressable
                style={styles.callBtn}
                onPress={() => handleCallPhone(trip.driverPhone!)}
              >
                <MaterialCommunityIcons name="phone" size={16} color="#fff" />
                <Text style={styles.callBtnText}>Driver Ko Call Karo</Text>
                <Text style={styles.callBtnNumber}>+91 {trip.driverPhone}</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* ===== FRAUD NOTICE FOR ACCUSED (MERCHANT/DRIVER) ===== */}
        {pendingFraudAgainstMe && (
          <Pressable
            style={styles.fraudNoticeCard}
            onPress={() => router.push(`/trip/fraud/${trip.id}` as any)}
          >
            <MaterialCommunityIcons name="alert-circle" size={22} color={Colors.error} />
            <View style={{ flex: 1 }}>
              <Text style={styles.fraudNoticeTitle}>Aapke Khilaf Shikaayat Darj Hai!</Text>
              <Text style={styles.fraudNoticeText}>
                {pendingFraudAgainstMe.reporterName} ne fraude ki report ki hai. 30 min mein jawab dena zaroori hai.
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.error} />
          </Pressable>
        )}

        {/* ===== CHAT + FRAUD ACTION SECTION ===== */}
        {trip.driverId && trip.status !== "pending" && trip.status !== "cancelled" &&
          (user?.role === "merchant" || (user?.role === "driver" && trip.commissionPaid && trip.driverId === user.id)) && (
          <View style={styles.actionBtnRow}>
            <Pressable
              style={styles.chatBtn}
              onPress={() => router.push(`/trip/chat/${trip.id}` as any)}
            >
              <MaterialCommunityIcons name="chat-outline" size={18} color={Colors.primary} />
              <Text style={styles.chatBtnText}>
                {user?.role === "driver" ? "Merchant Se Baat Karo" : "Driver Se Baat Karo"}
              </Text>
            </Pressable>

            {!(trip.fraudReportedBy ?? []).includes(user?.id ?? "") ? (
              <Pressable
                style={styles.fraudBtn}
                onPress={() => router.push(`/trip/fraud/${trip.id}` as any)}
              >
                <MaterialCommunityIcons name="alert-octagon-outline" size={18} color={Colors.error} />
                <Text style={styles.fraudBtnText}>Fraude Shikaayat</Text>
              </Pressable>
            ) : (
              <Pressable
                style={styles.fraudDoneBtn}
                onPress={() => router.push(`/trip/fraud/${trip.id}` as any)}
              >
                <MaterialCommunityIcons name="shield-check" size={18} color={Colors.success} />
                <Text style={styles.fraudDoneText}>Complaint Darj ▶</Text>
              </Pressable>
            )}
          </View>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Timeline</Text>
          <InfoRow
            icon="clock-plus-outline"
            label="Book Kiya"
            value={formatDateTime(trip.createdAt)}
          />
          {trip.acceptedAt && (
            <InfoRow
              icon="check-circle-outline"
              label="Confirm"
              value={formatDateTime(trip.acceptedAt)}
            />
          )}
          {trip.deliveredAt && (
            <InfoRow
              icon="package-check"
              label="Deliver"
              value={formatDateTime(trip.deliveredAt)}
            />
          )}
        </View>

        {/* ===== RATING CARD ===== */}
        {trip.status === "delivered" && user?.role === "merchant" && trip.driverId && (
          trip.driverRatedByMerchant ? (
            <View style={styles.ratingDoneCard}>
              <MaterialCommunityIcons name="star-check" size={24} color={Colors.warning} />
              <Text style={styles.ratingDoneText}>Aapne driver ko rate kar diya ✓</Text>
            </View>
          ) : (
            <View style={styles.ratingCard}>
              <View style={styles.ratingCardHeader}>
                <MaterialCommunityIcons name="star-circle" size={22} color={Colors.warning} />
                <Text style={styles.ratingCardTitle}>Driver Ko Rate Karo</Text>
              </View>
              <Text style={styles.ratingCardSub}>
                {trip.driverName} ne aapka maal safely deliver kiya. Unhe rating do:
              </Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Pressable key={s} onPress={() => setSelectedStars(s)} style={styles.starBtn}>
                    <MaterialCommunityIcons
                      name={s <= selectedStars ? "star" : "star-outline"}
                      size={36}
                      color={Colors.warning}
                    />
                  </Pressable>
                ))}
              </View>
              <Text style={styles.ratingLabel}>
                {selectedStars === 0 ? "Star select karo" :
                 selectedStars === 1 ? "⭐ Bahut Bura" :
                 selectedStars === 2 ? "⭐⭐ Theek Nahi" :
                 selectedStars === 3 ? "⭐⭐⭐ Theek Tha" :
                 selectedStars === 4 ? "⭐⭐⭐⭐ Achha" :
                 "⭐⭐⭐⭐⭐ Zabardast!"}
              </Text>
              <Pressable
                style={[styles.ratingSubmitBtn, selectedStars === 0 && styles.ratingSubmitDisabled]}
                onPress={submitRating}
                disabled={selectedStars === 0 || ratingLoading}
              >
                {ratingLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.ratingSubmitText}>Rating Submit Karo</Text>
                )}
              </Pressable>
            </View>
          )
        )}

        {trip.status === "delivered" && user?.role === "driver" && trip.merchantId && trip.driverId === user.id && (
          trip.merchantRatedByDriver ? (
            <View style={styles.ratingDoneCard}>
              <MaterialCommunityIcons name="star-check" size={24} color={Colors.warning} />
              <Text style={styles.ratingDoneText}>Aapne merchant ko rate kar diya ✓</Text>
            </View>
          ) : (
            <View style={styles.ratingCard}>
              <View style={styles.ratingCardHeader}>
                <MaterialCommunityIcons name="star-circle" size={22} color={Colors.warning} />
                <Text style={styles.ratingCardTitle}>Merchant Ko Rate Karo</Text>
              </View>
              <Text style={styles.ratingCardSub}>
                {trip.merchantName} ke saath kaam kaisa raha? Unhe rating do:
              </Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Pressable key={s} onPress={() => setSelectedStars(s)} style={styles.starBtn}>
                    <MaterialCommunityIcons
                      name={s <= selectedStars ? "star" : "star-outline"}
                      size={36}
                      color={Colors.warning}
                    />
                  </Pressable>
                ))}
              </View>
              <Text style={styles.ratingLabel}>
                {selectedStars === 0 ? "Star select karo" :
                 selectedStars === 1 ? "⭐ Bahut Bura" :
                 selectedStars === 2 ? "⭐⭐ Theek Nahi" :
                 selectedStars === 3 ? "⭐⭐⭐ Theek Tha" :
                 selectedStars === 4 ? "⭐⭐⭐⭐ Achha" :
                 "⭐⭐⭐⭐⭐ Zabardast!"}
              </Text>
              <Pressable
                style={[styles.ratingSubmitBtn, selectedStars === 0 && styles.ratingSubmitDisabled]}
                onPress={submitRating}
                disabled={selectedStars === 0 || ratingLoading}
              >
                {ratingLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.ratingSubmitText}>Rating Submit Karo</Text>
                )}
              </Pressable>
            </View>
          )
        )}

        {/* Inline Confirmation Dialog */}
        {pendingAction && (
          <View style={styles.confirmBox}>
            <MaterialCommunityIcons
              name={pendingAction.action === "cancel" ? "alert-circle" : "information"}
              size={22}
              color={pendingAction.action === "cancel" ? Colors.error : Colors.info}
            />
            <Text style={styles.confirmMsg}>{pendingAction.msg}</Text>
            <View style={styles.confirmBtns}>
              <Pressable
                style={styles.confirmNo}
                onPress={() => setPendingAction(null)}
              >
                <Text style={styles.confirmNoText}>Nahi</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmYes, pendingAction.action === "cancel" && styles.confirmYesRed]}
                onPress={executeAction}
                accessibilityLabel="Confirm Action"
              >
                <Text style={styles.confirmYesText}>Haan, Confirm</Text>
              </Pressable>
            </View>
          </View>
        )}

      </ScrollView>

      {isActive && (
        <View
          style={[styles.actionBar, { paddingBottom: insets.bottom + 16 }]}
        >
          {canPayCommission && !upiOpened && (
            <Pressable
              style={styles.actionBtn}
              onPress={handleOpenUPI}
              disabled={loading}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryLight]}
                style={styles.actionBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <MaterialCommunityIcons name="cellphone-nfc" size={20} color="#fff" />
                <View>
                  <Text style={styles.actionBtnText}>
                    UPI Se Pay Karo — {formatCurrency(trip.lfiCommission)}
                  </Text>
                  <Text style={styles.actionBtnSub}>
                    Loading Fast India • PhonePe / GPay / BHIM
                  </Text>
                </View>
              </LinearGradient>
            </Pressable>
          )}
          {canPayCommission && upiOpened && (
            <>
              <Pressable
                style={styles.actionBtn}
                onPress={handleConfirmPayment}
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
                      <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
                      <Text style={styles.actionBtnText}>Maine Pay Kar Diya ✓</Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
              <Pressable
                style={styles.reOpenUpiBtn}
                onPress={handleOpenUPI}
                disabled={loading}
              >
                <MaterialCommunityIcons name="refresh" size={16} color={Colors.primary} />
                <Text style={styles.reOpenUpiBtnText}>UPI App Dobara Kholo</Text>
              </Pressable>
            </>
          )}
          {canStart && (
            <Pressable
              style={styles.actionBtn}
              onPress={() =>
                handleAction("start", "Kya aap yeh trip shuru karna chahte hain?")
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
                    <Text style={styles.actionBtnText}>Transit Shuru Karo</Text>
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
                  "Kya maal deliver ho gaya? Yeh action wapas nahi hoga."
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
                    <Text style={styles.actionBtnText}>Deliver Mark Karo</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          )}
          {canCancel && isActive && trip.status === "pending" && (
            <Pressable
              style={styles.cancelBtn}
              onPress={() =>
                handleAction("cancel", "Kya aap yeh trip cancel karna chahte hain? Yeh wapas nahi hoga.")
              }
              disabled={loading}
            >
              <MaterialCommunityIcons
                name="close-circle-outline"
                size={18}
                color={Colors.error}
              />
              <Text style={styles.cancelBtnText}>Trip Cancel Karo</Text>
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
  unlockedCard: {
    borderColor: Colors.success,
    borderWidth: 1.5,
  },
  unlockedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
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
    width: 110,
    flexShrink: 0,
  },
  infoValue: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    flex: 1,
    textAlign: "right",
  },
  lockedCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.5,
    borderColor: "#4A3500",
    borderStyle: "dashed",
    alignItems: "center",
    gap: 12,
  },
  lockedIconRow: {
    alignItems: "center",
    marginBottom: 4,
  },
  lockedIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2A1F00",
    borderWidth: 2,
    borderColor: "#4A3500",
    alignItems: "center",
    justifyContent: "center",
  },
  lockedTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.warning,
  },
  lockedSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  lockedItems: {
    width: "100%",
    gap: 8,
    marginTop: 4,
  },
  lockedItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 10,
  },
  lockedItemText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  lockedBlur: {
    flex: 1,
    height: 10,
    backgroundColor: Colors.border,
    borderRadius: 4,
    marginLeft: "auto",
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
    gap: 10,
  },
  actionBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  actionBtnSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },
  reOpenUpiBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  reOpenUpiBtnText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
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

  locationCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1.5,
    borderColor: Colors.success,
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  locationHeaderLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    flex: 1,
  },
  locationTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  locationSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginTop: 2,
    lineHeight: 17,
  },
  liveDot: {
    backgroundColor: Colors.success,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  liveDotText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  coordsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  coordsText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  locationError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2A1F00",
    borderRadius: 8,
    padding: 10,
  },
  locationErrorText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.warning,
  },
  trackingBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 13,
  },
  trackingBtnStart: {
    backgroundColor: Colors.success,
  },
  trackingBtnStop: {
    backgroundColor: Colors.error,
  },
  trackingBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },

  liveMapCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  liveMapHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  liveMapTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  mapContainer: {
    height: 280,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mapLoading: {
    height: 160,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  mapLoadingText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  mapNoLocation: {
    alignItems: "center",
    gap: 8,
    padding: 20,
    backgroundColor: Colors.surface,
    borderRadius: 12,
  },
  mapNoLocationText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  mapNoLocationSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
  },
  mapRefreshNote: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
  },

  confirmBox: {
    margin: 16,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    gap: 12,
    borderWidth: 1.5,
    borderColor: Colors.info,
    alignItems: "center",
  },
  confirmMsg: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    textAlign: "center",
    lineHeight: 20,
  },
  confirmBtns: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  confirmNo: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  confirmNoText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  confirmYes: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.info,
    alignItems: "center",
  },
  confirmYesRed: {
    backgroundColor: Colors.error,
  },
  confirmYesText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },

  ratingCard: {
    margin: 16,
    marginTop: 0,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    gap: 12,
    borderWidth: 1.5,
    borderColor: Colors.warning,
  },
  ratingCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ratingCardTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.warning,
  },
  ratingCardSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 4,
  },
  starBtn: {
    padding: 4,
  },
  ratingLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  ratingSubmitBtn: {
    backgroundColor: Colors.warning,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  ratingSubmitDisabled: {
    opacity: 0.4,
  },
  ratingSubmitText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  ratingDoneCard: {
    margin: 16,
    marginTop: 0,
    backgroundColor: "#1A2A1A",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.success,
  },
  ratingDoneText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.success,
  },

  ratingBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 4,
    paddingBottom: 6,
  },
  starsSmallRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
  },
  ratingBadgeScore: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.warning,
  },
  ratingBadgeCount: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.success,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  verifiedText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.3,
  },

  callBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.success,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 6,
  },
  callBtnText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  callBtnNumber: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
  },

  actionBtnRow: {
    marginHorizontal: 16,
    marginBottom: 0,
    gap: 10,
  },
  chatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  chatBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  fraudBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#1A0000",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  fraudBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.error,
  },
  fraudDoneBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#001A00",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.success,
  },
  fraudDoneText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.success,
  },
  fraudNoticeCard: {
    marginHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#140000",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.error,
  },
  fraudNoticeTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.error,
  },
  fraudNoticeText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 17,
  },
});
