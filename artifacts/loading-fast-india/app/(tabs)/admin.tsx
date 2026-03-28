import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { FraudCase, User, useApp } from "@/context/AppContext";
import { API_BASE, type WhatsAppSendResponse } from "@/lib/api";

type FilterTab = "all" | "merchant" | "driver";

const WA_TEMPLATES = [
  { key: "hello_world",      label: "Hello World (Test)",           hints: [] },
  { key: "new_load_alert",   label: "New Load Alert (Driver ko)",   hints: ["Driver Name", "From City", "To City", "Weight (tons)", "Freight (₹)"] },
  { key: "booking_confirmed",label: "Booking Confirmed (Merchant)", hints: ["Merchant Name", "Bilty Number", "Driver Name", "From City", "To City"] },
  { key: "driver_approval",  label: "Driver Approval",              hints: ["Driver Name"] },
];

function formatDate(dateStr?: string) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function maskAadhaar(aadhaar?: string) {
  if (!aadhaar || aadhaar.length < 4) return "—";
  return `XXXX XXXX ${aadhaar.slice(-4)}`;
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <MaterialCommunityIcons name={icon as any} size={22} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function UserCard({ user, onRemove }: { user: User; onRemove: () => void }) {
  const isMerchant = user.role === "merchant";
  const roleColor = isMerchant ? Colors.primary : Colors.info;
  const roleLabel = isMerchant ? "Merchant" : "Driver";
  const roleIcon = isMerchant ? "store-outline" : "truck-outline";

  return (
    <View style={styles.userCard}>
      <View style={styles.userCardHeader}>
        <View style={[styles.roleTag, { backgroundColor: roleColor + "22" }]}>
          <MaterialCommunityIcons name={roleIcon as any} size={13} color={roleColor} />
          <Text style={[styles.roleTagText, { color: roleColor }]}>{roleLabel}</Text>
        </View>
        <Text style={styles.regDate}>{formatDate(user.registeredAt)}</Text>
      </View>

      <Text style={styles.userName}>{user.name}</Text>
      <View style={styles.infoRow}>
        <Ionicons name="call-outline" size={13} color={Colors.textMuted} />
        <Text style={styles.infoText}>+91 {user.phone}</Text>
      </View>
      <View style={styles.infoRow}>
        <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
        <Text style={styles.infoText}>{user.city}</Text>
      </View>

      {isMerchant && user.businessName ? (
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="domain" size={13} color={Colors.textMuted} />
          <Text style={styles.infoText}>{user.businessName}</Text>
        </View>
      ) : null}

      {user.aadhaarNumber ? (
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="card-account-details-outline" size={13} color={Colors.textMuted} />
          <Text style={styles.infoText}>Aadhaar: {maskAadhaar(user.aadhaarNumber)}</Text>
        </View>
      ) : null}

      {isMerchant && user.gstNumber ? (
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="file-certificate-outline" size={13} color={Colors.textMuted} />
          <Text style={styles.infoText}>GST: {user.gstNumber}</Text>
        </View>
      ) : null}

      <View style={styles.userCardFooter}>
        <Pressable
          style={styles.removeBtn}
          onPress={() => {
            Alert.alert(
              "Hatayen?",
              `Kya aap ${user.name} ko list se hataana chahte hain?`,
              [
                { text: "Cancel", style: "cancel" },
                { text: "Hatayen", style: "destructive", onPress: onRemove },
              ]
            );
          }}
        >
          <Ionicons name="trash-outline" size={14} color={Colors.error} />
          <Text style={styles.removeBtnText}>Hatayen</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function AdminScreen() {
  const { user, trips, registeredUsers, fraudCases, deleteTrip, removeUser, reinstateUser } = useApp();
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [waUnlocked, setWaUnlocked] = useState(false);
  const [waToken, setWaToken] = useState("");
  const [waLoginUser, setWaLoginUser] = useState("");
  const [waLoginPass, setWaLoginPass] = useState("");
  const [waLoginError, setWaLoginError] = useState("");
  const [waLoginLoading, setWaLoginLoading] = useState(false);
  const [waPhone, setWaPhone] = useState("");
  const [waTemplate, setWaTemplate] = useState("hello_world");
  const [waVariables, setWaVariables] = useState<string[]>([]);
  const [waSending, setWaSending] = useState(false);
  const [waResult, setWaResult] = useState<{ success: boolean; msg: string } | null>(null);

  const selectedTpl = WA_TEMPLATES.find((t) => t.key === waTemplate) ?? WA_TEMPLATES[0];

  const verifyAdminLogin = async () => {
    if (!waLoginUser.trim() || !waLoginPass.trim()) {
      setWaLoginError("Username aur password dono daalen");
      return;
    }
    setWaLoginLoading(true);
    setWaLoginError("");
    try {
      const res = await fetch(`${API_BASE}/admin/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: waLoginUser.trim(), pass: waLoginPass.trim() }),
      });
      const data = await res.json();
      if (data.success && data.token) {
        setWaToken(data.token);
        setWaUnlocked(true);
        setWaLoginUser("");
        setWaLoginPass("");
      } else {
        setWaLoginError(data.error ?? "Login failed");
      }
    } catch {
      setWaLoginError("Server se connection nahi ho paya");
    } finally {
      setWaLoginLoading(false);
    }
  };

  const handleTemplateChange = (key: string) => {
    setWaTemplate(key);
    const tpl = WA_TEMPLATES.find((t) => t.key === key);
    setWaVariables(tpl ? tpl.hints.map(() => "") : []);
    setWaResult(null);
  };

  const setVariable = (index: number, value: string) => {
    setWaVariables((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const sendWhatsApp = async () => {
    if (!waPhone.trim() || waPhone.trim().length < 10) {
      setWaResult({ success: false, msg: "Valid 10-digit phone number daalen" });
      return;
    }
    const emptyVar = selectedTpl.hints.findIndex((_, i) => !waVariables[i]?.trim());
    if (emptyVar !== -1) {
      setWaResult({ success: false, msg: `"${selectedTpl.hints[emptyVar]}" field khaali hai` });
      return;
    }
    setWaSending(true);
    setWaResult(null);
    try {
      const res = await fetch(`${API_BASE}/whatsapp/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": waToken,
        },
        body: JSON.stringify({
          phone: waPhone.trim(),
          template: waTemplate,
          variables: waVariables.filter((v) => v.trim()),
        }),
      });
      const data: WhatsAppSendResponse = await res.json();
      if (data.success) {
        setWaResult({ success: true, msg: `Message bhej diya! ID: ${data.messageId}` });
        setWaPhone("");
        setWaVariables(selectedTpl.hints.map(() => ""));
      } else {
        setWaResult({ success: false, msg: data.error ?? "Kuch gadbad hui" });
      }
    } catch {
      setWaResult({ success: false, msg: "Server se connection nahi ho paya" });
    } finally {
      setWaSending(false);
    }
  };

  if (!user || user.role !== "admin") {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <MaterialCommunityIcons name="shield-lock" size={48} color={Colors.error} />
        <Text style={[styles.userName, { marginTop: 12 }]}>Access Denied</Text>
        <Text style={styles.infoText}>Sirf Admin is section ko dekh sakta hai.</Text>
      </View>
    );
  }

  const merchants = registeredUsers.filter((u) => u.role === "merchant");
  const drivers = registeredUsers.filter((u) => u.role === "driver");
  const totalCommission = trips
    .filter((t) => t.status === "delivered")
    .reduce((sum, t) => sum + t.lfiCommission, 0);

  const filtered =
    activeTab === "merchant"
      ? merchants
      : activeTab === "driver"
      ? drivers
      : registeredUsers;

  const pendingFrauds = fraudCases.filter((c) => c.status === "pending_merchant");
  const escalatedFrauds = fraudCases.filter((c) => c.status === "auto_escalated");

  const habitualOffenders = registeredUsers.filter((u) => {
    const casesAgainst = fraudCases.filter((c) => c.accusedId === u.id);
    return casesAgainst.length >= 2;
  });

  const suspendedUsers = registeredUsers.filter((u) => u.suspended);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={["#1C1C2E", "#0A0A0F"]}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Admin Dashboard</Text>
            <Text style={styles.headerSub}>LFI Platform Overview</Text>
          </View>
          <View style={[styles.adminBadge]}>
            <MaterialCommunityIcons name="shield-crown" size={16} color={Colors.primary} />
            <Text style={styles.adminBadgeText}>Admin</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsRow}>
          <StatCard
            icon="store-outline"
            label="Merchants"
            value={merchants.length}
            color={Colors.primary}
          />
          <StatCard
            icon="truck-outline"
            label="Drivers"
            value={drivers.length}
            color={Colors.info}
          />
        </View>
        <View style={styles.statsRow}>
          <StatCard
            icon="package-variant"
            label="Total Trips"
            value={trips.length}
            color={Colors.warning}
          />
          <StatCard
            icon="currency-inr"
            label="LFI Commission"
            value={"₹" + totalCommission.toLocaleString("en-IN")}
            color={Colors.success}
          />
        </View>
        <View style={styles.statsRow}>
          <StatCard
            icon="shield-alert-outline"
            label="Fraud Pending"
            value={pendingFrauds.length}
            color={Colors.error}
          />
          <StatCard
            icon="alert-octagon-outline"
            label="Auto Escalated"
            value={escalatedFrauds.length}
            color="#8B5CF6"
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Registered Users</Text>
          <Text style={styles.totalCount}>{registeredUsers.length} total</Text>
        </View>

        <View style={styles.filterTabs}>
          {(["all", "merchant", "driver"] as FilterTab[]).map((tab) => (
            <Pressable
              key={tab}
              style={[styles.filterTab, activeTab === tab && styles.filterTabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  activeTab === tab && styles.filterTabTextActive,
                ]}
              >
                {tab === "all" ? `Sab (${registeredUsers.length})` : tab === "merchant" ? `Merchant (${merchants.length})` : `Driver (${drivers.length})`}
              </Text>
            </Pressable>
          ))}
        </View>

        {filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons
              name={activeTab === "merchant" ? "store-outline" : activeTab === "driver" ? "truck-outline" : "account-group-outline"}
              size={40}
              color={Colors.textMuted}
            />
            <Text style={styles.emptyText}>
              {activeTab === "all"
                ? "Abhi koi user registered nahi hai"
                : activeTab === "merchant"
                ? "Koi Merchant registered nahi hai"
                : "Koi Driver registered nahi hai"}
            </Text>
          </View>
        ) : (
          filtered.map((u) => (
            <UserCard
              key={u.id}
              user={u}
              onRemove={() => removeUser(u.id)}
            />
          ))
        )}

        <View style={styles.allTripsSection}>
          <Text style={styles.sectionTitle}>Sabhi Trips ({trips.length})</Text>
          {trips.length === 0 && (
            <Text style={styles.tripMerchant}>Koi trip nahi hai</Text>
          )}
          {trips.map((t) => (
            <View key={t.id} style={styles.tripRow}>
              <Pressable
                style={{ flex: 1 }}
                onPress={() => router.push(`/trip/${t.id}`)}
              >
                <Text style={styles.tripBilty}>{t.biltyNumber}</Text>
                <Text style={styles.tripRoute}>
                  {t.fromCity} → {t.toCity}
                </Text>
                <Text style={styles.tripMerchant}>
                  {t.merchantName} • {t.driverName ?? "Driver nahi mila"}
                </Text>
              </Pressable>
              <View style={{ alignItems: "flex-end", gap: 6 }}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor:
                        t.status === "delivered"
                          ? Colors.success
                          : t.status === "cancelled"
                          ? Colors.error
                          : t.status === "in_transit"
                          ? Colors.primary
                          : t.status === "accepted"
                          ? Colors.info
                          : Colors.warning,
                    },
                  ]}
                />
                <Text style={styles.commissionText}>
                  ₹{t.lfiCommission.toLocaleString("en-IN")} fee
                </Text>
                <Pressable
                  onPress={async () => {
                    setDeletingTripId(t.id);
                    try {
                      await deleteTrip(t.id);
                    } finally {
                      setDeletingTripId(null);
                    }
                  }}
                  style={styles.tripDeleteBtn}
                >
                  {deletingTripId === t.id ? (
                    <ActivityIndicator size={12} color={Colors.error} />
                  ) : (
                    <Ionicons name="trash-outline" size={14} color={Colors.error} />
                  )}
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        {/* ===== SUSPENDED USERS SECTION ===== */}
        {suspendedUsers.length > 0 && (
          <View style={styles.suspendedSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: Colors.error }]}>
                Suspended Accounts ({suspendedUsers.length})
              </Text>
              <View style={styles.escalatedBadge}>
                <Text style={styles.escalatedBadgeText}>Auto Banned</Text>
              </View>
            </View>
            {suspendedUsers.map((u) => (
              <View key={u.id} style={styles.suspendedCard}>
                <View style={styles.suspendedCardLeft}>
                  <MaterialCommunityIcons
                    name={u.role === "merchant" ? "store-remove" : "truck-remove"}
                    size={20}
                    color={Colors.error}
                  />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={styles.suspendedName}>{u.name}</Text>
                      {u.blacklisted && (
                        <View style={{ backgroundColor: "#7f1d1d", borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 9, fontWeight: "800", color: "#fca5a5", letterSpacing: 0.5 }}>⛔ BLACKLISTED</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.suspendedPhone}>+91 {u.phone} • {u.role === "merchant" ? "Merchant" : "Driver"}</Text>
                    <Text style={styles.suspendedReason} numberOfLines={2}>{u.blacklisted ? u.blacklistReason : u.suspendReason}</Text>
                    <Text style={styles.suspendedAt}>
                      {u.blacklisted
                        ? `Blacklisted: ${u.blacklistedAt ? new Date(u.blacklistedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}`
                        : `Suspend: ${u.suspendedAt ? new Date(u.suspendedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}`
                      }
                    </Text>
                  </View>
                </View>
                <Pressable
                  style={styles.reinstateBtn}
                  onPress={() => reinstateUser(u.id)}
                >
                  <MaterialCommunityIcons name="account-check" size={14} color={Colors.success} />
                  <Text style={styles.reinstateBtnText}>Wapas Do</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* ===== FRAUD CASES SECTION ===== */}
        {fraudCases.length > 0 && (
          <View style={styles.fraudSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: Colors.error }]}>
                Fraud Shikaayatein ({fraudCases.length})
              </Text>
              {escalatedFrauds.length > 0 && (
                <View style={styles.escalatedBadge}>
                  <Text style={styles.escalatedBadgeText}>{escalatedFrauds.length} Escalated</Text>
                </View>
              )}
            </View>

            {habitualOffenders.length > 0 && (
              <View style={styles.habitualSection}>
                <MaterialCommunityIcons name="account-alert" size={16} color={Colors.error} />
                <Text style={styles.habitualTitle}>
                  Habitual Offenders ({habitualOffenders.length})
                </Text>
                {habitualOffenders.map((u) => {
                  const count = fraudCases.filter((c) => c.accusedId === u.id).length;
                  return (
                    <View key={u.id} style={styles.habitualCard}>
                      <MaterialCommunityIcons
                        name={u.role === "merchant" ? "store-alert" : "truck-alert"}
                        size={18}
                        color={Colors.error}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.habitualName}>{u.name}</Text>
                        <Text style={styles.habitualMeta}>
                          {u.role === "merchant" ? "Merchant" : "Driver"} • +91 {u.phone}
                        </Text>
                      </View>
                      <View style={styles.habitualCountBadge}>
                        <Text style={styles.habitualCount}>{count} cases</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {fraudCases.slice(0, 15).map((fc: FraudCase) => (
              <Pressable
                key={fc.id}
                style={styles.fraudCard}
                onPress={() => router.push(`/trip/fraud/${fc.tripId}` as any)}
              >
                <View style={styles.fraudCardHeader}>
                  <View style={[
                    styles.fraudStatusBadge,
                    {
                      backgroundColor:
                        fc.status === "auto_escalated" ? Colors.error + "22"
                        : fc.status === "merchant_responded" ? Colors.success + "22"
                        : Colors.warning + "22"
                    }
                  ]}>
                    <Text style={[
                      styles.fraudStatusText,
                      {
                        color:
                          fc.status === "auto_escalated" ? Colors.error
                          : fc.status === "merchant_responded" ? Colors.success
                          : Colors.warning
                      }
                    ]}>
                      {fc.status === "auto_escalated" ? "Auto Escalated"
                        : fc.status === "merchant_responded" ? "Jawab Mila"
                        : "Pending"}
                    </Text>
                  </View>
                  <Text style={styles.fraudCaseRef}>{fc.caseRef}</Text>
                </View>
                <Text style={styles.fraudAccused}>
                  {fc.accusedName} ({fc.accusedRole === "merchant" ? "Merchant" : "Driver"}) ke khilaf
                </Text>
                <Text style={styles.fraudDesc} numberOfLines={2}>{fc.description}</Text>
                <Text style={styles.fraudMeta}>
                  {fc.biltyNumber} • {fc.fromCity} → {fc.toCity}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* ===== WHATSAPP SUPPORT SECTION ===== */}
        <View style={styles.waSection}>
          <View style={styles.waSectionHeader}>
            <MaterialCommunityIcons name="whatsapp" size={20} color="#25D366" />
            <Text style={styles.waSectionTitle}>WhatsApp Support</Text>
            {waUnlocked ? (
              <Pressable
                style={styles.waLockBtn}
                onPress={() => { setWaUnlocked(false); setWaToken(""); setWaResult(null); }}
              >
                <MaterialCommunityIcons name="lock-open-outline" size={15} color={Colors.success} />
                <Text style={[styles.waLockBtnText, { color: Colors.success }]}>Unlocked</Text>
              </Pressable>
            ) : (
              <View style={styles.waLockBtn}>
                <MaterialCommunityIcons name="lock-outline" size={15} color={Colors.error} />
                <Text style={[styles.waLockBtnText, { color: Colors.error }]}>Locked</Text>
              </View>
            )}
          </View>
          <Text style={styles.waSectionSub}>Driver / Merchant ko directly message bhejein</Text>

          {!waUnlocked ? (
            <View style={styles.waLoginBox}>
              <MaterialCommunityIcons name="shield-key-outline" size={32} color={Colors.textMuted} style={{ alignSelf: "center" }} />
              <Text style={styles.waLoginTitle}>Admin Verification Zaroori Hai</Text>
              <Text style={styles.waLoginSub}>WhatsApp tool use karne ke liye apna Admin username aur password daalen</Text>

              <TextInput
                style={styles.waInput}
                placeholder="Admin Username"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
                value={waLoginUser}
                onChangeText={(v) => { setWaLoginUser(v); setWaLoginError(""); }}
              />
              <TextInput
                style={styles.waInput}
                placeholder="Admin Password"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry
                value={waLoginPass}
                onChangeText={(v) => { setWaLoginPass(v); setWaLoginError(""); }}
              />

              {waLoginError ? (
                <View style={styles.waLoginErrorBox}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={14} color={Colors.error} />
                  <Text style={styles.waLoginErrorText}>{waLoginError}</Text>
                </View>
              ) : null}

              <Pressable
                style={[styles.waSendBtn, { backgroundColor: Colors.primary }, waLoginLoading && { opacity: 0.6 }]}
                onPress={verifyAdminLogin}
                disabled={waLoginLoading}
              >
                {waLoginLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <MaterialCommunityIcons name="shield-check" size={16} color="#fff" />
                )}
                <Text style={styles.waSendBtnText}>
                  {waLoginLoading ? "Verify ho raha hai..." : "Verify Karein"}
                </Text>
              </Pressable>
            </View>
          ) : (
            <>

          <Text style={styles.waLabel}>Phone Number</Text>
          <TextInput
            style={styles.waInput}
            placeholder="10-digit number (e.g. 9876543210)"
            placeholderTextColor={Colors.textMuted}
            keyboardType="number-pad"
            maxLength={10}
            value={waPhone}
            onChangeText={setWaPhone}
          />

          <Text style={styles.waLabel}>Template Chunein</Text>
          <View style={styles.waTemplateRow}>
            {WA_TEMPLATES.map((t) => (
              <Pressable
                key={t.key}
                style={[
                  styles.waTemplateBtn,
                  waTemplate === t.key && styles.waTemplateBtnActive,
                ]}
                onPress={() => handleTemplateChange(t.key)}
              >
                <Text
                  style={[
                    styles.waTemplateBtnText,
                    waTemplate === t.key && styles.waTemplateBtnTextActive,
                  ]}
                >
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {selectedTpl.hints.length > 0 && (
            <View style={styles.waVariablesBox}>
              <View style={styles.waVariablesHeader}>
                <MaterialCommunityIcons name="variable" size={14} color={Colors.textMuted} />
                <Text style={styles.waVariablesTitle}>Template Variables</Text>
              </View>
              {selectedTpl.hints.map((hint, i) => (
                <View key={i} style={styles.waVarRow}>
                  <Text style={styles.waVarLabel}>
                    {`{{${i + 1}}}`} {hint}
                  </Text>
                  <TextInput
                    style={styles.waVarInput}
                    placeholder={`${hint} daalen...`}
                    placeholderTextColor={Colors.textMuted}
                    value={waVariables[i] ?? ""}
                    onChangeText={(v) => setVariable(i, v)}
                  />
                </View>
              ))}
            </View>
          )}

          {waResult && (
            <View
              style={[
                styles.waResultBox,
                { borderColor: waResult.success ? Colors.success : Colors.error },
              ]}
            >
              <MaterialCommunityIcons
                name={waResult.success ? "check-circle-outline" : "alert-circle-outline"}
                size={15}
                color={waResult.success ? Colors.success : Colors.error}
              />
              <Text
                style={[
                  styles.waResultText,
                  { color: waResult.success ? Colors.success : Colors.error },
                ]}
              >
                {waResult.msg}
              </Text>
            </View>
          )}

          <Pressable
            style={[styles.waSendBtn, waSending && { opacity: 0.6 }]}
            onPress={sendWhatsApp}
            disabled={waSending}
          >
            {waSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialCommunityIcons name="send" size={16} color="#fff" />
            )}
            <Text style={styles.waSendBtnText}>
              {waSending ? "Bhej raha hai..." : "WhatsApp Bhejein"}
            </Text>
          </Pressable>
            </>
          )}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  headerSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginTop: 2,
  },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.primary + "22",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.primary + "44",
  },
  adminBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginTop: 6,
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
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  totalCount: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  filterTabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.card,
    alignItems: "center",
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
  },
  filterTabText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
  },
  filterTabTextActive: {
    color: "#fff",
  },
  userCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  userCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  roleTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  roleTagText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  regDate: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  userName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
  },
  infoText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  userCardFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  removeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: Colors.error + "15",
    borderRadius: 6,
  },
  removeBtnText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.error,
  },
  emptyBox: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
  },
  allTripsSection: {
    marginTop: 24,
    gap: 8,
  },
  tripRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 6,
  },
  tripBilty: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  tripRoute: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    marginTop: 2,
  },
  tripMerchant: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginTop: 2,
  },
  tripDeleteBtn: {
    backgroundColor: Colors.error + "18",
    borderRadius: 6,
    padding: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  commissionText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.success,
  },
  suspendedSection: {
    marginTop: 24,
    gap: 8,
  },
  suspendedCard: {
    backgroundColor: "#140000",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.error + "66",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  suspendedCardLeft: {
    flex: 1,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  suspendedName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  suspendedPhone: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginTop: 2,
  },
  suspendedReason: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.error,
    marginTop: 4,
    lineHeight: 16,
  },
  suspendedAt: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginTop: 3,
  },
  reinstateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.success + "18",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.success + "44",
    alignSelf: "flex-start",
    marginTop: 4,
  },
  reinstateBtnText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.success,
  },
  fraudSection: {
    marginTop: 24,
    gap: 8,
  },
  escalatedBadge: {
    backgroundColor: Colors.error + "22",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  escalatedBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.error,
  },
  habitualSection: {
    backgroundColor: "#140000",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.error + "66",
    gap: 10,
  },
  habitualTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.error,
  },
  habitualCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.card,
    borderRadius: 8,
    padding: 10,
  },
  habitualName: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  habitualMeta: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginTop: 2,
  },
  habitualCountBadge: {
    backgroundColor: Colors.error + "22",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  habitualCount: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.error,
  },
  fraudCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  fraudCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fraudStatusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  fraudStatusText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  fraudCaseRef: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
  },
  fraudAccused: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  fraudDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  fraudMeta: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  waSection: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#25D36633",
    gap: 10,
  },
  waSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  waSectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  waSectionSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: -6,
  },
  waLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    marginBottom: -4,
  },
  waInput: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  waTemplateRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  waTemplateBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: Colors.surface,
  },
  waTemplateBtnActive: {
    borderColor: "#25D366",
    backgroundColor: "#25D36622",
  },
  waTemplateBtnText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  waTemplateBtnTextActive: {
    color: "#25D366",
    fontFamily: "Inter_600SemiBold",
  },
  waResultBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: Colors.surface,
  },
  waResultText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  waSendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#25D366",
    borderRadius: 10,
    paddingVertical: 13,
    marginTop: 4,
  },
  waSendBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  waLockBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: "auto",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  waLockBtnText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  waLoginBox: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 12,
    marginTop: 4,
  },
  waLoginTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    textAlign: "center",
  },
  waLoginSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 17,
  },
  waLoginErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.error + "15",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.error + "40",
  },
  waLoginErrorText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.error,
    flex: 1,
  },
  waVariablesBox: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    gap: 10,
  },
  waVariablesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  waVariablesTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  waVarRow: {
    gap: 4,
  },
  waVarLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  waVarInput: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
});
