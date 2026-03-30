import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import Colors from "@/constants/colors";
import { PAYMENT_GRACE_MINUTES, Payment, useApp } from "@/context/AppContext";

function formatTimer(ms: number): string {
  if (ms <= 0) return "00:00";
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

interface Props {
  tripId: string;
  driverId?: string;
}

export default function PaymentSection({ tripId, driverId }: Props) {
  const { user, payments, submitPayment, confirmPayment, disputePayment } = useApp();
  const [utrRef, setUtrRef] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const payment: Payment | undefined = payments.find((p) => p.tripId === tripId);

  useEffect(() => {
    if (!payment || payment.status !== "pending") {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    const update = () => {
      const left = new Date(payment.deadline).getTime() - Date.now();
      setTimeLeft(Math.max(0, left));
    };
    update();
    intervalRef.current = setInterval(update, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [payment?.id, payment?.status, payment?.deadline]);

  const isMerchant = user?.role === "merchant" && user?.id === payment?.merchantId;
  const isDriver = user?.role === "driver" && user?.id === driverId;
  const isMerchantView = user?.role === "merchant";

  const handleSubmit = async () => {
    if (!utrRef.trim()) { setErrorMsg("UTR / Transaction ID daalna zaroori hai"); return; }
    setLoading(true); setErrorMsg("");
    try { await submitPayment(tripId, utrRef); setUtrRef(""); }
    catch { setErrorMsg("Kuch galat hua, dobara try karein"); }
    finally { setLoading(false); }
  };

  const handleConfirm = async () => {
    if (!payment) return;
    setLoading(true);
    try { await confirmPayment(payment.id); }
    catch { setErrorMsg("Confirm nahi ho saka"); }
    finally { setLoading(false); }
  };

  const handleDispute = async () => {
    if (!payment) return;
    setLoading(true);
    try { await disputePayment(payment.id); }
    catch { setErrorMsg("Report nahi ho saka"); }
    finally { setLoading(false); }
  };

  if (!payment && !isMerchantView) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="cash-check" size={18} color={Colors.primary} />
        <Text style={styles.headerText}>Payment / भुगतान</Text>
      </View>

      {/* ── No payment yet: Merchant submits ── */}
      {!payment && isMerchantView && (
        <View style={styles.card}>
          <Text style={styles.instructionText}>
            Trip complete hone ke baad driver ko payment karein aur UTR number yahan enter karein.
          </Text>
          <Text style={styles.instructionTextHi}>
            यात्रा पूरी होने के बाद ड्राइवर को पेमेंट करें और UTR नंबर दर्ज करें।
          </Text>
          <TextInput
            style={styles.input}
            placeholder="UTR / Transaction ID"
            placeholderTextColor={Colors.textMuted}
            value={utrRef}
            onChangeText={setUtrRef}
            autoCapitalize="characters"
            maxLength={30}
          />
          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
          <Pressable
            style={({ pressed }) => [styles.payBtn, pressed && { opacity: 0.8 }, loading && styles.disabledBtn]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <>
                  <MaterialCommunityIcons name="bank-transfer-out" size={16} color="#fff" />
                  <Text style={styles.payBtnText}>Maine Payment Kar Di / मैंने पेमेंट कर दी</Text>
                </>
            }
          </Pressable>
        </View>
      )}

      {/* ── Payment pending: Merchant sees timer ── */}
      {payment?.status === "pending" && isMerchant && (
        <View style={styles.card}>
          <View style={styles.timerRow}>
            <MaterialCommunityIcons name="timer-outline" size={20} color={timeLeft < 300000 ? Colors.error : Colors.warning} />
            <Text style={[styles.timerText, { color: timeLeft < 300000 ? Colors.error : Colors.warning }]}>
              {formatTimer(timeLeft)}
            </Text>
            <Text style={styles.timerLabel}>
              bacha hua samay / शेष समय
            </Text>
          </View>
          <Text style={styles.pendingText}>
            Driver ke confirm karne ka intezaar hai. 30 minute mein confirm na hone par account block ho jayega.
          </Text>
          <Text style={styles.pendingTextHi}>
            ड्राइवर की पुष्टि का इंतज़ार। 30 मिनट में कन्फर्म न हो तो अकाउंट ब्लॉक होगा।
          </Text>
          <View style={styles.utrRow}>
            <Text style={styles.utrLabel}>UTR:</Text>
            <Text style={styles.utrValue}>{payment.utrRef}</Text>
          </View>
        </View>
      )}

      {/* ── Payment pending: Driver confirms or disputes ── */}
      {payment?.status === "pending" && isDriver && (
        <View style={styles.card}>
          <Text style={styles.instructionText}>
            Merchant ne payment submit ki hai. Kya aapko payment mili?
          </Text>
          <Text style={styles.instructionTextHi}>
            मर्चेंट ने पेमेंट सबमिट की है। क्या आपको पेमेंट मिली?
          </Text>
          <View style={styles.utrRow}>
            <Text style={styles.utrLabel}>UTR:</Text>
            <Text style={styles.utrValue}>{payment.utrRef}</Text>
          </View>
          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
          <View style={styles.actionRow}>
            <Pressable
              style={({ pressed }) => [styles.confirmBtn, pressed && { opacity: 0.8 }, loading && styles.disabledBtn]}
              onPress={handleConfirm}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <>
                    <MaterialCommunityIcons name="check-circle" size={16} color="#fff" />
                    <Text style={styles.actionBtnText}>Mili ✅ / मिली</Text>
                  </>
              }
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.disputeBtn, pressed && { opacity: 0.8 }, loading && styles.disabledBtn]}
              onPress={handleDispute}
              disabled={loading}
            >
              <>
                <MaterialCommunityIcons name="close-circle" size={16} color="#fff" />
                <Text style={styles.actionBtnText}>Nahi Mili ❌ / नहीं मिली</Text>
              </>
            </Pressable>
          </View>
        </View>
      )}

      {/* ── Payment verified ── */}
      {payment?.status === "verified" && (
        <View style={[styles.card, styles.verifiedCard]}>
          <MaterialCommunityIcons name="check-decagram" size={24} color={Colors.success} />
          <Text style={styles.verifiedText}>Payment Confirmed ✅</Text>
          <Text style={styles.verifiedTextHi}>भुगतान की पुष्टि हो गई</Text>
          <Text style={styles.utrValue}>UTR: {payment.utrRef}</Text>
        </View>
      )}

      {/* ── Payment disputed / auto-blocked ── */}
      {payment?.status === "disputed" && (
        <View style={[styles.card, styles.disputedCard]}>
          <MaterialCommunityIcons name="alert-circle" size={24} color={Colors.error} />
          <Text style={styles.disputedText}>
            {payment.autoBlockedAt
              ? "30 min mein confirm nahi hua — Merchant BLOCKED ❌"
              : "Driver ne payment nahi mili report ki — Merchant BLOCKED ❌"}
          </Text>
          <Text style={styles.disputedTextHi}>
            {payment.autoBlockedAt
              ? "30 मिनट में कन्फर्म नहीं हुआ — मर्चेंट ब्लॉक ❌"
              : "ड्राइवर ने पेमेंट न मिलने की रिपोर्ट की — मर्चेंट ब्लॉक ❌"}
          </Text>
          <Text style={styles.ipcText}>IPC 420 / BNS 318 — Dhokha / Cheating</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  headerText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
    fontFamily: "Inter_700Bold",
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  instructionText: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 17,
  },
  instructionTextHi: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 17,
    marginTop: -4,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    fontFamily: "Inter_500Medium",
  },
  payBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  payBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timerText: {
    fontSize: 28,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
  },
  timerLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    flex: 1,
  },
  pendingText: {
    fontSize: 12,
    color: Colors.warning,
    lineHeight: 17,
  },
  pendingTextHi: {
    fontSize: 12,
    color: Colors.warning,
    lineHeight: 17,
    marginTop: -4,
  },
  utrRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  utrLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: "600",
  },
  utrValue: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: Colors.success,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 11,
  },
  disputeBtn: {
    flex: 1,
    backgroundColor: Colors.error,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 11,
  },
  actionBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  verifiedCard: {
    borderColor: Colors.success,
    alignItems: "center",
    gap: 4,
  },
  verifiedText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.success,
    fontFamily: "Inter_700Bold",
  },
  verifiedTextHi: {
    fontSize: 12,
    color: Colors.success,
  },
  disputedCard: {
    borderColor: Colors.error,
    alignItems: "center",
    gap: 4,
  },
  disputedText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.error,
    textAlign: "center",
    fontFamily: "Inter_700Bold",
  },
  disputedTextHi: {
    fontSize: 12,
    color: Colors.error,
    textAlign: "center",
  },
  ipcText: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
  },
  disabledBtn: {
    opacity: 0.6,
  },
});
