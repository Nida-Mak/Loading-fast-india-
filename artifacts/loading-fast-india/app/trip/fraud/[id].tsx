import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { Linking } from "react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { FraudCase, FRAUD_RESPONSE_MINUTES, IpcSection, useApp } from "@/context/AppContext";

function formatDateTime(dateStr?: string) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function useCountdown(deadlineAt: string | undefined) {
  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
    if (!deadlineAt) return;
    const tick = () => {
      const diff = new Date(deadlineAt).getTime() - Date.now();
      setRemaining(Math.max(0, diff));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadlineAt]);

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  const expired = remaining === 0;
  return { minutes, seconds, expired, remaining };
}

function CountdownBadge({ deadlineAt, onExpired }: { deadlineAt: string; onExpired: () => void }) {
  const { minutes, seconds, expired } = useCountdown(deadlineAt);
  const calledRef = useRef(false);

  useEffect(() => {
    if (expired && !calledRef.current) {
      calledRef.current = true;
      onExpired();
    }
  }, [expired]);

  if (expired) {
    return (
      <View style={styles.countdownExpired}>
        <MaterialCommunityIcons name="timer-off" size={16} color={Colors.error} />
        <Text style={styles.countdownExpiredText}>Samay Samapt — Auto Escalation</Text>
      </View>
    );
  }

  return (
    <View style={styles.countdownBox}>
      <MaterialCommunityIcons name="timer-outline" size={16} color={Colors.warning} />
      <Text style={styles.countdownLabel}>Jawab ki Meeaad:</Text>
      <Text style={styles.countdownValue}>
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </Text>
    </View>
  );
}

const FRAUD_CATEGORIES = [
  "Maal deliver nahi kiya",
  "Maal mein nuksan hua",
  "Maal chhupa liya / chori",
  "Pehle zyada paise maange",
  "Fake bilty / documents",
  "Trip accept karke gaayab ho gaya",
  "Dhamki / badtameezi ki",
  "Kuch aur",
];

export default function FraudCaseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trips, user, fraudCases, fileFraudComplaint, respondToFraudCase, escalateFraudCase, getFraudCasesAgainstUser } = useApp();
  const insets = useSafeAreaInsets();

  const trip = useMemo(() => trips.find((t) => t.id === id), [trips, id]);
  const tripCases = useMemo(
    () => fraudCases.filter((c) => c.tripId === id),
    [fraudCases, id]
  );

  const myReportedCase = tripCases.find((c) => c.reporterId === user?.id);
  const caseAgainstMe = tripCases.find((c) => c.accusedId === user?.id && c.status === "pending_merchant");
  const resolvedCaseAgainstMe = tripCases.find((c) => c.accusedId === user?.id && c.status === "merchant_responded");

  const [step, setStep] = useState<"select" | "describe" | "submitted">(
    myReportedCase ? "submitted" : "select"
  );
  const [selectedCategory, setSelectedCategory] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeCase, setActiveCase] = useState<FraudCase | null>(myReportedCase ?? null);
  const [respondText, setRespondText] = useState("");
  const [responding, setResponding] = useState(false);
  const [showRespondBox, setShowRespondBox] = useState(false);

  const accusedCasesCount = trip
    ? (user?.role === "driver"
        ? getFraudCasesAgainstUser(trip.merchantId)
        : trip.driverId
        ? getFraudCasesAgainstUser(trip.driverId)
        : []
      ).length
    : 0;

  const isHabitualOffender = accusedCasesCount >= 2;

  const handleSubmitComplaint = async () => {
    if (!selectedCategory) {
      setErrorMsg("Shikaayat ki wajah chunein");
      return;
    }
    if (!description.trim() || description.trim().length < 20) {
      setErrorMsg("Kripya kamaz az kamaz 20 akshar mein waqya bataiye");
      return;
    }
    setErrorMsg("");
    setSubmitting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    try {
      const fc = await fileFraudComplaint(id!, `${selectedCategory}: ${description.trim()}`);
      setActiveCase(fc);
      setStep("submitted");
    } catch {
      setErrorMsg("Kuch galat ho gaya. Dobara koshish karein.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutoEscalate = async () => {
    if (!activeCase) return;
    await escalateFraudCase(activeCase.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    await Linking.openURL("https://parivahan.gov.in/parivahan/");
  };

  const handleRespond = async () => {
    if (!caseAgainstMe) return;
    if (!respondText.trim() || respondText.trim().length < 10) {
      setErrorMsg("Kripya apni safai 10+ akshar mein likhein");
      return;
    }
    setErrorMsg("");
    setResponding(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await respondToFraudCase(caseAgainstMe.id, respondText.trim());
      setShowRespondBox(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setErrorMsg("Kuch galat ho gaya. Dobara koshish karein.");
    } finally {
      setResponding(false);
    }
  };

  if (!trip) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Trip nahi mili</Text>
      </View>
    );
  }

  const canFileComplaint =
    !myReportedCase &&
    trip.driverId &&
    trip.status !== "pending" &&
    trip.status !== "cancelled" &&
    ((user?.role === "driver" && trip.driverId === user.id) ||
      (user?.role === "merchant" && trip.merchantId === user.id));

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={["#1A0000", Colors.background]}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Fraud Shikaayat</Text>
          <Text style={styles.headerSub}>{trip.biltyNumber} • {trip.fromCity} → {trip.toCity}</Text>
        </View>
        <View style={styles.lfiShield}>
          <MaterialCommunityIcons name="shield-check" size={20} color={Colors.primary} />
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Habitual Offender Warning */}
        {isHabitualOffender && (
          <View style={styles.habitualBanner}>
            <MaterialCommunityIcons name="alert-octagon" size={20} color={Colors.error} />
            <View style={{ flex: 1 }}>
              <Text style={styles.habitualTitle}>Baar Baar Shikaayat!</Text>
              <Text style={styles.habitualSub}>
                Is {user?.role === "driver" ? "merchant" : "driver"} ke khilaf {accusedCasesCount} shikayatein darj hain. LFI ne is account ko flag kar diya hai.
              </Text>
            </View>
          </View>
        )}

        {/* MERCHANT VIEW: Notice about complaint against them */}
        {caseAgainstMe && !resolvedCaseAgainstMe && (
          <View style={styles.noticeCard}>
            <View style={styles.noticeHeader}>
              <MaterialCommunityIcons name="alert-circle" size={22} color={Colors.error} />
              <Text style={styles.noticeTitle}>Driver Ne Shikaayat Darj Ki!</Text>
            </View>
            <Text style={styles.noticeSub}>
              Driver <Text style={{ color: Colors.text, fontFamily: "Inter_600SemiBold" }}>{caseAgainstMe.reporterName}</Text> ne aapke khilaf fraud ki shikaayat darj ki hai.
              30 minute mein jawab na dene par maamla Parivahan Niyam ke antargat svadhyaay ke liye bhaeja jaayega.
            </Text>

            <View style={styles.noticeDetail}>
              <Text style={styles.noticeDetailLabel}>Shikaayat:</Text>
              <Text style={styles.noticeDetailValue}>{caseAgainstMe.description}</Text>
            </View>
            <View style={styles.noticeDetail}>
              <Text style={styles.noticeDetailLabel}>Case Ref:</Text>
              <Text style={[styles.noticeDetailValue, { color: Colors.warning }]}>{caseAgainstMe.caseRef}</Text>
            </View>
            <View style={styles.noticeDetail}>
              <Text style={styles.noticeDetailLabel}>Darj Hui:</Text>
              <Text style={styles.noticeDetailValue}>{formatDateTime(caseAgainstMe.reportedAt)}</Text>
            </View>

            <CountdownBadge
              deadlineAt={caseAgainstMe.deadlineAt}
              onExpired={() => escalateFraudCase(caseAgainstMe.id)}
            />

            {!showRespondBox ? (
              <Pressable
                style={styles.respondBtn}
                onPress={() => setShowRespondBox(true)}
              >
                <MaterialCommunityIcons name="reply" size={18} color="#fff" />
                <Text style={styles.respondBtnText}>Apni Safai Do</Text>
              </Pressable>
            ) : (
              <View style={styles.respondBox}>
                <Text style={styles.respondBoxLabel}>Apna Jawab Likhein:</Text>
                <TextInput
                  style={styles.respondInput}
                  placeholder="Kya hua, sach kya hai — yahan likhein (10+ akshar)..."
                  placeholderTextColor={Colors.textMuted}
                  value={respondText}
                  onChangeText={setRespondText}
                  multiline
                  maxLength={500}
                />
                {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
                <View style={styles.respondActions}>
                  <Pressable
                    style={styles.respondCancel}
                    onPress={() => setShowRespondBox(false)}
                  >
                    <Text style={styles.respondCancelText}>Wapas</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.respondSubmit, responding && { opacity: 0.5 }]}
                    onPress={handleRespond}
                    disabled={responding}
                  >
                    {responding ? (
                      <ActivityIndicator color="#fff" size={16} />
                    ) : (
                      <Text style={styles.respondSubmitText}>Jawab Bhejo</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        )}

        {resolvedCaseAgainstMe && (
          <View style={styles.respondedCard}>
            <MaterialCommunityIcons name="shield-check" size={24} color={Colors.success} />
            <Text style={styles.respondedTitle}>Aapne Jawab De Diya</Text>
            <Text style={styles.respondedSub}>Aapka jawab darj ho gaya. LFI team review karegi.</Text>
            <View style={styles.respondedDetail}>
              <Text style={styles.respondedDetailLabel}>Aapka Jawab:</Text>
              <Text style={styles.respondedDetailValue}>{resolvedCaseAgainstMe.accusedResponse}</Text>
            </View>
          </View>
        )}

        {/* DRIVER / REPORTER VIEW: File complaint or view status */}
        {canFileComplaint && step === "select" && (
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <MaterialCommunityIcons name="shield-alert-outline" size={22} color={Colors.error} />
              <Text style={styles.formTitle}>Shikaayat Darj Karein</Text>
            </View>
            <Text style={styles.formSub}>
              Kya hua? Neeche se sabse sahi wajah chunein:
            </Text>
            {FRAUD_CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                style={[
                  styles.categoryBtn,
                  selectedCategory === cat && styles.categoryBtnActive,
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <MaterialCommunityIcons
                  name={selectedCategory === cat ? "radiobox-marked" : "radiobox-blank"}
                  size={18}
                  color={selectedCategory === cat ? Colors.error : Colors.textMuted}
                />
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === cat && styles.categoryTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            ))}
            <Pressable
              style={[styles.nextBtn, !selectedCategory && { opacity: 0.4 }]}
              onPress={() => {
                if (selectedCategory) setStep("describe");
              }}
              disabled={!selectedCategory}
            >
              <Text style={styles.nextBtnText}>Aage Badhein</Text>
              <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" />
            </Pressable>
          </View>
        )}

        {canFileComplaint && step === "describe" && (
          <View style={styles.formCard}>
            <Pressable
              style={styles.backLink}
              onPress={() => setStep("select")}
            >
              <MaterialCommunityIcons name="arrow-left" size={16} color={Colors.textSecondary} />
              <Text style={styles.backLinkText}>Wajah Badlein</Text>
            </Pressable>
            <Text style={styles.selectedCatLabel}>
              Wajah: <Text style={{ color: Colors.error }}>{selectedCategory}</Text>
            </Text>
            <Text style={styles.formSub}>Ab puri baat likhein (kam se kam 20 akshar):</Text>
            <TextInput
              style={styles.descInput}
              placeholder="Kya hua, kab hua, kitna nuksaan hua — sab likhein..."
              placeholderTextColor={Colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={1000}
              autoFocus
            />
            <Text style={styles.charCount}>{description.length}/1000</Text>
            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

            <View style={styles.warningNote}>
              <MaterialCommunityIcons name="information-outline" size={14} color={Colors.warning} />
              <Text style={styles.warningNoteText}>
                Shikaayat darj hone ke baad merchant ko 30 minute mein jawab dena hoga. Nahi diya to maamla Parivahan Niyam ke antargat svadhyaay ke liye bhaeja jaayega.
              </Text>
            </View>

            <Pressable
              style={[styles.submitBtn, submitting && { opacity: 0.5 }]}
              onPress={handleSubmitComplaint}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialCommunityIcons name="send-check" size={18} color="#fff" />
                  <Text style={styles.submitBtnText}>Shikaayat Darj Karein</Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        {(step === "submitted" || myReportedCase) && (activeCase ?? myReportedCase) && (
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <MaterialCommunityIcons
                name={
                  (activeCase ?? myReportedCase)?.status === "auto_escalated"
                    ? "alert-octagon"
                    : (activeCase ?? myReportedCase)?.status === "merchant_responded"
                    ? "shield-check"
                    : "clock-alert-outline"
                }
                size={28}
                color={
                  (activeCase ?? myReportedCase)?.status === "auto_escalated"
                    ? Colors.error
                    : (activeCase ?? myReportedCase)?.status === "merchant_responded"
                    ? Colors.success
                    : Colors.warning
                }
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.statusTitle}>
                  {(activeCase ?? myReportedCase)?.status === "auto_escalated"
                    ? "Auto Escalation Ho Gayi"
                    : (activeCase ?? myReportedCase)?.status === "merchant_responded"
                    ? "Merchant Ne Jawab Diya"
                    : "Shikaayat Pending Hai"}
                </Text>
                <Text style={styles.caseRef}>
                  Case Ref: {(activeCase ?? myReportedCase)?.caseRef}
                </Text>
              </View>
            </View>

            <View style={styles.caseDetailBox}>
              <Text style={styles.caseDetailRow}>
                <Text style={styles.caseDetailKey}>Accused: </Text>
                {(activeCase ?? myReportedCase)?.accusedName}
              </Text>
              <Text style={styles.caseDetailRow}>
                <Text style={styles.caseDetailKey}>Phone: </Text>
                +91 {(activeCase ?? myReportedCase)?.accusedPhone}
              </Text>
              <Text style={styles.caseDetailRow}>
                <Text style={styles.caseDetailKey}>Shikaayat: </Text>
                {(activeCase ?? myReportedCase)?.description}
              </Text>
              <Text style={styles.caseDetailRow}>
                <Text style={styles.caseDetailKey}>Darj Hui: </Text>
                {formatDateTime((activeCase ?? myReportedCase)?.reportedAt)}
              </Text>
            </View>

            {/* IPC / BNS Dhara Card */}
            {((activeCase ?? myReportedCase)?.ipcSections?.length ?? 0) > 0 && (
              <View style={styles.ipcCard}>
                <View style={styles.ipcHeader}>
                  <MaterialCommunityIcons name="gavel" size={18} color={Colors.error} />
                  <Text style={styles.ipcTitle}>Laagu Dharayen (IPC / BNS)</Text>
                </View>
                <Text style={styles.ipcSubtitle}>
                  Yeh Indian Penal Code aur Bharatiya Nyaya Sanhita ki dharayen is shikaayat par laagu hoti hain:
                </Text>
                {(activeCase ?? myReportedCase)!.ipcSections.map((sec: IpcSection, i: number) => (
                  <View key={i} style={styles.ipcRow}>
                    <View style={styles.ipcSectionBadge}>
                      <Text style={styles.ipcSectionText}>{sec.section}</Text>
                      <Text style={styles.ipcBnsText}>{sec.bns}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ipcTitleText}>{sec.title}</Text>
                      <Text style={styles.ipcPunishment}>
                        <Text style={{ color: Colors.error }}>Saza: </Text>{sec.punishment}
                      </Text>
                    </View>
                  </View>
                ))}
                <View style={styles.ipcWarning}>
                  <MaterialCommunityIcons name="alert" size={14} color={Colors.warning} />
                  <Text style={styles.ipcWarningText}>
                    Yeh dharayen court mein use ki ja sakti hain. FIR darj karwane ke liye nazdiki police station jaayein ya 100/112 par call karein.
                  </Text>
                </View>
              </View>
            )}

            {/* Suspension Notice */}
            {(activeCase ?? myReportedCase)?.accusedSuspended && (
              <View style={styles.suspensionNotice}>
                <MaterialCommunityIcons name="account-cancel" size={22} color={Colors.error} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.suspensionTitle}>Account Suspend Ho Gaya!</Text>
                  <Text style={styles.suspensionText}>
                    {(activeCase ?? myReportedCase)?.accusedName} ka LFI account fraud complaint ke karan automatically suspend kar diya gaya hai. Ve dobara login nahi kar sakte.
                  </Text>
                </View>
              </View>
            )}

            {(activeCase ?? myReportedCase)?.status === "pending_merchant" && (
              <>
                <CountdownBadge
                  deadlineAt={(activeCase ?? myReportedCase)!.deadlineAt}
                  onExpired={handleAutoEscalate}
                />
                <Text style={styles.pendingNote}>
                  Merchant ke jawab ka intazaar hai. Samay khatam hone par maamla Bharat Parivahan Niyam ke antargat darj ho jaayega.
                </Text>
              </>
            )}

            {(activeCase ?? myReportedCase)?.status === "merchant_responded" && (
              <View style={styles.merchantResponseBox}>
                <Text style={styles.merchantResponseLabel}>Merchant Ka Jawab:</Text>
                <Text style={styles.merchantResponseText}>
                  {(activeCase ?? myReportedCase)?.accusedResponse}
                </Text>
                <Text style={styles.merchantResponseTime}>
                  {formatDateTime((activeCase ?? myReportedCase)?.accusedRespondedAt)}
                </Text>
              </View>
            )}

            {(activeCase ?? myReportedCase)?.status === "auto_escalated" && (
              <>
                <View style={styles.escalatedBox}>
                  <Text style={styles.escalatedText}>
                    Merchant ne 30 minute mein jawab nahi diya. Maamla Bharat Parivahan Niyam ke antargat svadhyaay ke liye bhaeja ja raha hai.
                  </Text>
                  <Text style={styles.escalatedTime}>
                    Escalated: {formatDateTime((activeCase ?? myReportedCase)?.escalatedAt)}
                  </Text>
                </View>
                <Pressable
                  style={styles.parivaahanBtn}
                  onPress={() => Linking.openURL("https://parivahan.gov.in/parivahan/")}
                >
                  <MaterialCommunityIcons name="web" size={18} color="#fff" />
                  <Text style={styles.parivaahanBtnText}>Parivahan Portal Par Complaint Karein</Text>
                </Pressable>
                <Pressable
                  style={styles.cybercrimeBtn}
                  onPress={() => Linking.openURL("https://cybercrime.gov.in/Webform/Accept.aspx")}
                >
                  <MaterialCommunityIcons name="shield-alert" size={18} color="#fff" />
                  <Text style={styles.cybercrimeBtnText}>Cybercrime Portal Par Bhi Karein</Text>
                </Pressable>
              </>
            )}
          </View>
        )}

        {!canFileComplaint && !myReportedCase && !caseAgainstMe && !resolvedCaseAgainstMe && (
          <View style={styles.noActionCard}>
            <MaterialCommunityIcons name="shield-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.noActionTitle}>Koi Shikaayat Nahi</Text>
            <Text style={styles.noActionSub}>
              Is trip ke liye abhi koi fraud shikaayat darj nahi ki gayi hai.
            </Text>
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
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
  notFoundText: {
    color: Colors.textMuted,
    fontFamily: "Inter_500Medium",
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  headerSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginTop: 2,
  },
  lfiShield: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#1A0A00",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.primary + "44",
  },
  content: {
    padding: 16,
    gap: 16,
  },

  habitualBanner: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#1A0000",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.error,
    alignItems: "flex-start",
  },
  habitualTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.error,
  },
  habitualSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },

  noticeCard: {
    backgroundColor: "#140000",
    borderRadius: 16,
    padding: 18,
    gap: 12,
    borderWidth: 1.5,
    borderColor: Colors.error,
  },
  noticeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  noticeTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.error,
  },
  noticeSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  noticeDetail: {
    gap: 2,
  },
  noticeDetailLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  noticeDetailValue: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    lineHeight: 20,
  },
  countdownBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#2A1A00",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.warning + "66",
  },
  countdownLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.warning,
    flex: 1,
  },
  countdownValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.warning,
    letterSpacing: 1,
  },
  countdownExpired: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1A0000",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  countdownExpiredText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.error,
  },
  respondBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.info,
    borderRadius: 12,
    paddingVertical: 14,
    justifyContent: "center",
  },
  respondBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  respondBox: {
    gap: 10,
  },
  respondBoxLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  respondInput: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    minHeight: 100,
    borderWidth: 1,
    borderColor: Colors.border,
    textAlignVertical: "top",
  },
  respondActions: {
    flexDirection: "row",
    gap: 10,
  },
  respondCancel: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  respondCancelText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  respondSubmit: {
    flex: 2,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: Colors.info,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  respondSubmitText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  respondedCard: {
    backgroundColor: "#001A00",
    borderRadius: 14,
    padding: 18,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.success,
    alignItems: "center",
  },
  respondedTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.success,
  },
  respondedSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  respondedDetail: {
    width: "100%",
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    gap: 4,
    marginTop: 4,
  },
  respondedDetailLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
    textTransform: "uppercase",
  },
  respondedDetailValue: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    lineHeight: 20,
  },

  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.error + "44",
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  formTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  formSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  categoryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryBtnActive: {
    borderColor: Colors.error,
    backgroundColor: "#1A0000",
  },
  categoryText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    flex: 1,
  },
  categoryTextActive: {
    color: Colors.error,
    fontFamily: "Inter_600SemiBold",
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 4,
  },
  nextBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  backLinkText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  selectedCatLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  descInput: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    minHeight: 120,
    borderWidth: 1,
    borderColor: Colors.border,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "right",
  },
  warningNote: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#1A1000",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.warning + "44",
  },
  warningNoteText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.error,
    borderRadius: 12,
    paddingVertical: 14,
  },
  submitBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },

  statusCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  statusTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  caseRef: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.warning,
    marginTop: 2,
  },
  caseDetailBox: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  caseDetailRow: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  caseDetailKey: {
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  pendingNote: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    lineHeight: 18,
    textAlign: "center",
  },
  merchantResponseBox: {
    backgroundColor: "#001A00",
    borderRadius: 12,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.success + "44",
  },
  merchantResponseLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.success,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  merchantResponseText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    lineHeight: 20,
  },
  merchantResponseTime: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  escalatedBox: {
    backgroundColor: "#1A0000",
    borderRadius: 12,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.error + "44",
  },
  escalatedText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  escalatedTime: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  parivaahanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1A4A00",
    borderRadius: 12,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: Colors.success,
  },
  parivaahanBtnText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  cybercrimeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1A0020",
    borderRadius: 12,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "#8B5CF6",
  },
  cybercrimeBtnText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },

  errorText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.error,
  },

  noActionCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  noActionTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  noActionSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 19,
  },
  ipcCard: {
    backgroundColor: "#0D0005",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: Colors.error + "55",
    gap: 10,
    marginTop: 4,
  },
  ipcHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ipcTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.error,
  },
  ipcSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  ipcRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 10,
  },
  ipcSectionBadge: {
    alignItems: "center",
    gap: 3,
    minWidth: 70,
  },
  ipcSectionText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: Colors.error,
    textAlign: "center",
  },
  ipcBnsText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: "#8B5CF6",
    textAlign: "center",
  },
  ipcTitleText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    lineHeight: 17,
  },
  ipcPunishment: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 3,
  },
  ipcWarning: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    backgroundColor: Colors.warning + "11",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.warning + "33",
  },
  ipcWarningText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.warning,
    flex: 1,
    lineHeight: 16,
  },
  suspensionNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#140000",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.error,
    marginTop: 4,
  },
  suspensionTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.error,
  },
  suspensionText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 17,
  },
});
