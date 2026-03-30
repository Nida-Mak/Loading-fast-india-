import AsyncStorage from "@react-native-async-storage/async-storage";
import { get, onValue, ref, set } from "firebase/database";
import * as Location from "expo-location";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { getFirebaseDB } from "@/lib/firebase";

export type UserRole = "merchant" | "driver" | "admin";

export type TripStatus =
  | "pending"
  | "accepted"
  | "in_transit"
  | "delivered"
  | "cancelled";

export interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  aadhaarVerified: boolean;
  aadhaarNumber?: string;
  gstNumber?: string;
  businessName?: string;
  gstVerified?: boolean;
  city: string;
  registeredAt?: string;
  rating: number;
  totalRatings: number;
  isVerified: boolean;
  suspended?: boolean;
  suspendedAt?: string;
  suspendReason?: string;
  blacklisted?: boolean;
  blacklistedAt?: string;
  blacklistReason?: string;
  isTerminated?: boolean;
  terminatedAt?: string;
  terminationReason?: string;
}

export interface Payment {
  id: string;
  tripId: string;
  merchantId: string;
  merchantName: string;
  driverId: string;
  driverName: string;
  utrRef: string;
  status: "pending" | "verified" | "disputed";
  submittedAt: string;
  deadline: string;
  confirmedAt?: string;
  disputedAt?: string;
  autoBlockedAt?: string;
}

export const PAYMENT_GRACE_MINUTES = 30;

export interface IpcSection {
  section: string;
  bns: string;
  title: string;
  punishment: string;
}

export interface Trip {
  id: string;
  biltyNumber: string;
  fromCity: string;
  toCity: string;
  goodsType: string;
  weightKg: number;
  freightAmount: number;
  status: TripStatus;
  merchantId: string;
  merchantName: string;
  merchantPhone: string;
  merchantCity: string;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  consigneeName: string;
  consigneePhone: string;
  createdAt: string;
  acceptedAt?: string;
  deliveredAt?: string;
  lfiCommission: number;
  driverEarning: number;
  vehicleType: string;
  vehicleNumber?: string;
  vehicleCategory?: VehicleCategory;
  notificationRadiusKm?: number;
  notificationType?: NotificationType;
  description?: string;
  commissionPaid?: boolean;
  driverRatedByMerchant?: boolean;
  merchantRatedByDriver?: boolean;
  fraudReportedBy?: string[];
}

export interface ChatMessage {
  id: string;
  tripId: string;
  senderId: string;
  senderName: string;
  senderRole: "merchant" | "driver";
  text: string;
  createdAt: string;
}

export type FraudCaseStatus =
  | "pending_merchant"
  | "merchant_responded"
  | "auto_escalated"
  | "resolved";

export interface FraudCase {
  id: string;
  tripId: string;
  biltyNumber: string;
  fromCity: string;
  toCity: string;
  reportedBy: "driver" | "merchant";
  reporterId: string;
  reporterName: string;
  reporterPhone: string;
  accusedId: string;
  accusedName: string;
  accusedPhone: string;
  accusedRole: "driver" | "merchant";
  category: string;
  description: string;
  ipcSections: IpcSection[];
  reportedAt: string;
  deadlineAt: string;
  status: FraudCaseStatus;
  accusedResponse?: string;
  accusedRespondedAt?: string;
  escalatedAt?: string;
  caseRef: string;
  accusedSuspended?: boolean;
  vehicleNumber?: string;
}

export const FRAUD_RESPONSE_MINUTES = 30;

export const IPC_SECTIONS_MAP: Record<string, IpcSection[]> = {
  "Maal deliver nahi kiya": [
    { section: "IPC 406", bns: "BNS 316", title: "Criminal Breach of Trust / Amanat mein Khiyanat", punishment: "3 saal + Jurmana" },
    { section: "IPC 420", bns: "BNS 318(4)", title: "Cheating & Dishonest Delivery / Dhokha", punishment: "7 saal + Jurmana" },
    { section: "IPC 120B", bns: "BNS 61", title: "Criminal Conspiracy / Sazish", punishment: "Upar wali dhara ke barabar" },
  ],
  "Maal mein nuksan hua": [
    { section: "IPC 425", bns: "BNS 324", title: "Mischief / Nuqsaan pahunchana", punishment: "3 mah + Jurmana" },
    { section: "IPC 406", bns: "BNS 316", title: "Criminal Breach of Trust / Amanat mein Khiyanat", punishment: "3 saal + Jurmana" },
  ],
  "Maal chhupa liya / chori": [
    { section: "IPC 403", bns: "BNS 314", title: "Dishonest Misappropriation / Haram Kabza", punishment: "2 saal + Jurmana" },
    { section: "IPC 406", bns: "BNS 316", title: "Criminal Breach of Trust / Amanat mein Khiyanat", punishment: "3 saal + Jurmana" },
    { section: "IPC 420", bns: "BNS 318(4)", title: "Cheating / Dhokha", punishment: "7 saal + Jurmana" },
  ],
  "Pehle zyada paise maange": [
    { section: "IPC 420", bns: "BNS 318(4)", title: "Cheating / Dhokha", punishment: "7 saal + Jurmana" },
    { section: "IPC 386", bns: "BNS 308(3)", title: "Extortion / Dhamki se Vasuli", punishment: "10 saal + Jurmana" },
  ],
  "Fake bilty / documents": [
    { section: "IPC 467", bns: "BNS 336(3)", title: "Forgery of Valuable Security / Qimti Dastavez Mein Jaalasaazi", punishment: "Umar qaid + Jurmana" },
    { section: "IPC 468", bns: "BNS 336(4)", title: "Forgery for Cheating / Dhokhe ke liye Jaalasaazi", punishment: "7 saal + Jurmana" },
    { section: "IPC 471", bns: "BNS 340(1)", title: "Using Forged Document / Jaali Kagaz Istemal", punishment: "IPC 467 ke barabar" },
    { section: "IPC 420", bns: "BNS 318(4)", title: "Cheating / Dhokha", punishment: "7 saal + Jurmana" },
  ],
  "Trip accept karke gaayab ho gaya": [
    { section: "IPC 420", bns: "BNS 318(4)", title: "Cheating / Dhokha", punishment: "7 saal + Jurmana" },
    { section: "IPC 406", bns: "BNS 316", title: "Criminal Breach of Trust / Amanat mein Khiyanat", punishment: "3 saal + Jurmana" },
    { section: "IPC 120B", bns: "BNS 61", title: "Criminal Conspiracy / Sazish", punishment: "Upar wali dhara ke barabar" },
  ],
  "Dhamki / badtameezi ki": [
    { section: "IPC 503", bns: "BNS 351", title: "Criminal Intimidation / Dhamki", punishment: "2 saal + Jurmana" },
    { section: "IPC 386", bns: "BNS 308(3)", title: "Extortion / Dhamki se Vasuli", punishment: "10 saal + Jurmana" },
    { section: "IPC 34", bns: "BNS 3(5)", title: "Acts in Common Intention / Mil ke Jurm", punishment: "Upar wali dhara ke barabar" },
  ],
  "Document Fraud": [
    { section: "IPC 467", bns: "BNS 336(3)", title: "Forgery of Valuable Security / Nakli Dastavez", punishment: "Umar qaid + Jurmana" },
    { section: "IPC 471", bns: "BNS 340(1)", title: "Using Forged Document / Jaali Kagaz ka Istemal", punishment: "IPC 467 ke barabar" },
    { section: "MV Act 192A", bns: "MV Act 192A", title: "Fake Registration / Nakli Gaadi Number", punishment: "1 saal + ₹5,000 Jurmana" },
  ],
  "Goods Theft/Misuse": [
    { section: "IPC 406", bns: "BNS 316", title: "Criminal Breach of Trust by Carrier / Carrier ka Dhokha", punishment: "3 saal + Jurmana" },
    { section: "IPC 403", bns: "BNS 314", title: "Dishonest Misappropriation / Haram Kabza", punishment: "2 saal + Jurmana" },
    { section: "IPC 379", bns: "BNS 303", title: "Theft / Chori", punishment: "3 saal + Jurmana" },
  ],
  "Payment Cheating": [
    { section: "IPC 420", bns: "BNS 318", title: "Cheating & Inducement / Dhokha", punishment: "7 saal + Jurmana" },
    { section: "IPC 406", bns: "BNS 316", title: "Criminal Breach of Trust / Amanat mein Khiyanat", punishment: "3 saal + Jurmana" },
  ],
  "Overloading": [
    { section: "MV Act 113", bns: "MV Act 113", title: "Overloading of Vehicle / Gaadi Mein Zyada Maal", punishment: "₹20,000 + ₹2,000/Ton" },
    { section: "MV Act 114", bns: "MV Act 114", title: "Exceeding Axle Load / Aksle Bhaar Adhik", punishment: "₹20,000 + RC Suspension" },
  ],
  "Unauthorized Access": [
    { section: "IT Act 66C", bns: "IT Act 66C", title: "Identity Theft / Pahchaan ki Chori", punishment: "3 saal + ₹1 Lakh Jurmana" },
    { section: "IT Act 66D", bns: "IT Act 66D", title: "Cheating by Impersonation / Nakli Pahchaan se Dhokha", punishment: "3 saal + ₹1 Lakh Jurmana" },
    { section: "IPC 419", bns: "BNS 319", title: "Cheating by Personation / Kisi Aur Ban ke Dhokha", punishment: "3 saal + Jurmana" },
  ],
  "Kuch aur": [
    { section: "IPC 420", bns: "BNS 318(4)", title: "Cheating / Dhokha", punishment: "7 saal + Jurmana" },
    { section: "IPC 406", bns: "BNS 316", title: "Criminal Breach of Trust / Amanat mein Khiyanat", punishment: "3 saal + Jurmana" },
  ],
};

export function generateFraudLegalNotice(params: {
  userName: string;
  vehicleNumber: string;
  fraudType: string;
  location: string;
  caseRef: string;
  ipcSections: IpcSection[];
}): string {
  const { userName, vehicleNumber, fraudType, location, caseRef, ipcSections } = params;
  const now = new Date();
  const timestamp = now.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const sectionList = ipcSections.map((s) => `${s.section} / ${s.bns} — ${s.title}`).join("\n       ");
  return `╔══════════════════════════════════════╗
║  LOADING FAST INDIA — LEGAL WARNING  ║
╚══════════════════════════════════════╝

Case Ref  : ${caseRef}
Timestamp : ${timestamp} IST
User/Driver: ${userName}
Vehicle No: ${vehicleNumber || "Not Provided"}
Location  : ${location}

⚠ ALERT: System ne '${fraudType}' detect kiya hai.
Yeh Government of India ke neeche ek criminal offence hai.

Laagu Dharayen (Applied Sections):
       ${sectionList}

Immediate Actions Taken:
  1. Aapki ID ko LFI platform par BLACKLIST kar diya gaya hai.
  2. Aapka GPS Location aur Device ID log kar liya gaya hai.
  3. Evidence Cyber Cell aur Transport Department ko bheja ja raha hai.
  4. Aapka account suspend kar diya gaya hai. Dobara login nahi hoga.

Agar yeh galti se hua hai, 30 minute mein jawab dein.
Jawab nahi dene par FIR darj ki jayegi.

─────────────────────────────────────
Helpline: 100 / 112  |  Cyber: 1930
Loading Fast India  •  lfi.app`;
}

interface AppContextValue {
  user: User | null;
  trips: Trip[];
  registeredUsers: User[];
  fraudCases: FraudCase[];
  payments: Payment[];
  isLoading: boolean;
  login: (name: string, phone: string, role: UserRole, city: string, extras?: { businessName?: string; aadhaarNumber?: string; gstNumber?: string }) => Promise<void>;
  logout: () => Promise<void>;
  createTrip: (trip: Omit<Trip, "id" | "biltyNumber" | "status" | "merchantId" | "merchantName" | "merchantPhone" | "merchantCity" | "lfiCommission" | "driverEarning" | "createdAt" | "commissionPaid" | "driverRatedByMerchant" | "merchantRatedByDriver">) => Promise<void>;
  payCommissionAndAccept: (tripId: string) => Promise<void>;
  startTrip: (tripId: string) => Promise<void>;
  deliverTrip: (tripId: string) => Promise<void>;
  cancelTrip: (tripId: string) => Promise<void>;
  rateUser: (targetUserId: string, tripId: string, stars: number, raterRole: "merchant" | "driver") => Promise<void>;
  reportFraud: (tripId: string) => Promise<void>;
  fileFraudComplaint: (tripId: string, description: string) => Promise<FraudCase>;
  respondToFraudCase: (caseId: string, response: string) => Promise<void>;
  escalateFraudCase: (caseId: string) => Promise<void>;
  getFraudCasesForTrip: (tripId: string) => FraudCase[];
  getFraudCasesAgainstUser: (userId: string) => FraudCase[];
  getChatMessages: (tripId: string) => Promise<ChatMessage[]>;
  sendChatMessage: (tripId: string, text: string) => Promise<void>;
  getMyTrips: () => Trip[];
  getAvailableTrips: () => Trip[];
  getEarnings: () => { total: number; commission: number; thisMonth: number; completedTrips: number };
  deleteTrip: (tripId: string) => Promise<void>;
  removeUser: (userId: string) => Promise<void>;
  suspendUser: (userId: string, reason: string) => Promise<void>;
  reinstateUser: (userId: string) => Promise<void>;
  checkFraudAndAlert: (params: {
    userId: string;
    userName: string;
    vehicleNumber?: string;
    tripId: string;
    fraudType: "Document Fraud" | "Route Diversion" | "Goods Theft/Misuse" | "Unauthorized Access";
    location: string;
  }) => Promise<{ blocked: boolean; caseRef: string; warningMessage: string }>;
  submitPayment: (tripId: string, utrRef: string) => Promise<void>;
  confirmPayment: (paymentId: string) => Promise<void>;
  disputePayment: (paymentId: string) => Promise<void>;
  terminateBusiness: (userId: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export const APP_CONFIG = {
  commissionRate: 0.02,
  appName: "Loading Fast India",
  currency: "INR",
  upiId: "maksudsaiyed888@oksbi",
  gst: "24BRLPS3959R1ZN",
} as const;

export type VehicleCategory = "small" | "medium" | "heavy";
export type NotificationType = "instant" | "multi_layered" | "bulk_broadcast";

export interface VehicleCategoryConfig {
  types: string[];
  radiusKm: number;
  notificationType: NotificationType;
  label: string;
}

export const VEHICLE_CONFIG: Record<VehicleCategory, VehicleCategoryConfig> = {
  small: {
    label: "Small Vehicles (Local)",
    types: ["छोटा हाथी", "chhota haathi", "ईको", "eco", "थ्री-व्हीलर", "three-wheeler", "loading rickshaw", "rickshaw", "tempo", "bike", "delivery"],
    radiusKm: 15,
    notificationType: "instant",
  },
  medium: {
    label: "Medium Vehicles (Inter-city)",
    types: ["407", "pickup", "bolero", "आयशर", "eicher", "canter", "luggage", "mini truck", "tata ace"],
    radiusKm: 50,
    notificationType: "multi_layered",
  },
  heavy: {
    label: "Heavy Vehicles (Long Distance)",
    types: ["6 chak", "6 wheel", "10 chak", "10 wheel", "container", "trailer", "reefer", "insulator", "चक्का"],
    radiusKm: 200,
    notificationType: "bulk_broadcast",
  },
};

export const VEHICLE_RADIUS_INCREMENT_KM = 25;
export const VEHICLE_RENOTIFICATION_DELAY_MINUTES = 5;

export function getVehicleCategory(vehicleType: string): VehicleCategory {
  const lower = vehicleType.toLowerCase();
  for (const [cat, cfg] of Object.entries(VEHICLE_CONFIG) as [VehicleCategory, VehicleCategoryConfig][]) {
    if (cfg.types.some((kw) => lower.includes(kw.toLowerCase()))) {
      return cat;
    }
  }
  return "medium";
}

export function getVehicleNotificationConfig(vehicleType: string): {
  category: VehicleCategory;
  radiusKm: number;
  notificationType: NotificationType;
  radiusIncrementKm: number;
  renotificationDelayMinutes: number;
} {
  const category = getVehicleCategory(vehicleType);
  const cfg = VEHICLE_CONFIG[category];
  return {
    category,
    radiusKm: cfg.radiusKm,
    notificationType: cfg.notificationType,
    radiusIncrementKm: VEHICLE_RADIUS_INCREMENT_KM,
    renotificationDelayMinutes: VEHICLE_RENOTIFICATION_DELAY_MINUTES,
  };
}

const COMMISSION_RATE = APP_CONFIG.commissionRate;

export const ADMIN_PIN = "LFI2024";
export const VERIFIED_MIN_RATING = 4.0;
export const VERIFIED_MIN_COUNT = 3;

export function calculateDriverPayment(totalAmount: number): {
  commission: number;
  earning: number;
  ratePercent: string;
} {
  const commission = Math.round(totalAmount * APP_CONFIG.commissionRate);
  return {
    commission,
    earning: totalAmount - commission,
    ratePercent: (APP_CONFIG.commissionRate * 100) + "%",
  };
}

const SAMPLE_TRIPS: Trip[] = [
  {
    id: "trip_001",
    biltyNumber: "LFI-2024-001",
    fromCity: "Mumbai",
    toCity: "Delhi",
    goodsType: "Heavy goods, long distance",
    weightKg: 5000,
    freightAmount: 45000,
    status: "pending",
    merchantId: "merchant_sample",
    merchantName: "Sharma Traders",
    merchantPhone: "9876543210",
    merchantCity: "Mumbai",
    consigneeName: "Ramesh Kumar",
    consigneePhone: "9876543210",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    lfiCommission: 900,
    driverEarning: 44100,
    vehicleType: "10 चक्का ट्रक / 10 Wheeler Truck (20 Ton)",
    description: "Steel rods and construction material",
    commissionPaid: false,
  },
  {
    id: "trip_002",
    biltyNumber: "LFI-2024-002",
    fromCity: "Bangalore",
    toCity: "Chennai",
    goodsType: "Electronics",
    weightKg: 800,
    freightAmount: 12000,
    status: "pending",
    merchantId: "merchant_sample",
    merchantName: "Tech Exports Pvt Ltd",
    merchantPhone: "9123456789",
    merchantCity: "Bangalore",
    consigneeName: "Priya Nair",
    consigneePhone: "9123456789",
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    lfiCommission: 240,
    driverEarning: 11760,
    vehicleType: "Bolero Pickup / Tata 207 (1.5 Ton)",
    description: "Mobile phones and laptops",
    commissionPaid: false,
  },
  {
    id: "trip_003",
    biltyNumber: "LFI-2024-003",
    fromCity: "Pune",
    toCity: "Hyderabad",
    goodsType: "Household goods, luggage",
    weightKg: 1200,
    freightAmount: 18000,
    status: "pending",
    merchantId: "merchant_sample",
    merchantName: "Relocation Services",
    merchantPhone: "9001234567",
    merchantCity: "Pune",
    consigneeName: "Suresh Reddy",
    consigneePhone: "9001234567",
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    lfiCommission: 360,
    driverEarning: 17640,
    vehicleType: "आयशर 14ft / Eicher Canter (3 Ton)",
    description: "Furniture and household items",
    commissionPaid: false,
  },
];

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function generateBiltyNumber(): string {
  const year = new Date().getFullYear();
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `LFI-${year}-${num}`;
}

function computeVerified(rating: number, totalRatings: number): boolean {
  return rating >= VERIFIED_MIN_RATING && totalRatings >= VERIFIED_MIN_COUNT;
}

const sanitizeTrip = (t: any): Trip => ({
  ...t,
  lfiCommission: typeof t.lfiCommission === "number" ? t.lfiCommission : Math.round((t.freightAmount ?? 0) * 0.02),
  driverEarning: typeof t.driverEarning === "number" ? t.driverEarning : (t.freightAmount ?? 0) - (typeof t.lfiCommission === "number" ? t.lfiCommission : Math.round((t.freightAmount ?? 0) * 0.02)),
  commissionPaid: t.commissionPaid ?? false,
  status: ["pending", "accepted", "in_transit", "delivered", "cancelled"].includes(t.status) ? t.status : "pending",
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);
  const [fraudCases, setFraudCases] = useState<FraudCase[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const snapToArray = <T,>(val: unknown): T[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val as T[];
    return Object.values(val as Record<string, T>);
  };

  const fbWrite = async (path: string, data: unknown) => {
    try {
      const db = getFirebaseDB();
      if (db) await set(ref(db, path), data);
    } catch {}
  };

  const fbRead = async (path: string): Promise<unknown> => {
    try {
      const db = getFirebaseDB();
      if (!db) return null;
      const snap = await get(ref(db, path));
      return snap.exists() ? snap.val() : undefined;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    // Step 1: Load user + local data immediately (fast)
    (async () => {
      try {
        const [userJson, localTripsJson, localUsersJson, localFraudJson] = await Promise.all([
          AsyncStorage.getItem("lfi_user"),
          AsyncStorage.getItem("lfi_trips"),
          AsyncStorage.getItem("lfi_users"),
          AsyncStorage.getItem("lfi_fraud_cases"),
        ]);
        try { if (userJson) setUser(JSON.parse(userJson)); } catch {}
        if (localUsersJson) { try { setRegisteredUsers(JSON.parse(localUsersJson)); } catch {} }
        if (localFraudJson) { try { setFraudCases(JSON.parse(localFraudJson)); } catch {} }
        if (localTripsJson) { try { setTrips((JSON.parse(localTripsJson) as any[]).map(sanitizeTrip)); } catch {} }
        else { setTrips(SAMPLE_TRIPS); }
      } catch {}
      setIsLoading(false);
    })();

    // Step 2: Real-time Firebase listeners
    const db = getFirebaseDB();
    if (!db) return;

    const unsubTrips = onValue(ref(db, "lfi_trips"), async (snap) => {
      if (snap.exists()) {
        const arr = snapToArray<Trip>(snap.val()).map(sanitizeTrip);
        setTrips(arr);
        AsyncStorage.setItem("lfi_trips", JSON.stringify(arr)).catch(() => {});
      } else {
        // Fresh install: no Firebase data yet
        const local = await AsyncStorage.getItem("lfi_trips").catch(() => null);
        if (!local) {
          setTrips(SAMPLE_TRIPS);
          set(ref(db, "lfi_trips"), Object.fromEntries(SAMPLE_TRIPS.map((t) => [t.id, t]))).catch(() => {});
        }
      }
    });

    const unsubUsers = onValue(ref(db, "lfi_users"), (snap) => {
      if (snap.exists()) {
        const arr = snapToArray<User>(snap.val());
        setRegisteredUsers(arr);
        AsyncStorage.setItem("lfi_users", JSON.stringify(arr)).catch(() => {});
      }
    });

    const unsubFraud = onValue(ref(db, "lfi_fraud_cases"), (snap) => {
      if (snap.exists()) {
        const arr = snapToArray<FraudCase>(snap.val());
        setFraudCases(arr);
        AsyncStorage.setItem("lfi_fraud_cases", JSON.stringify(arr)).catch(() => {});
      }
    });

    const unsubPayments = onValue(ref(db, "lfi_payments"), (snap) => {
      if (snap.exists()) {
        const arr = snapToArray<Payment>(snap.val());
        setPayments(arr);
        AsyncStorage.setItem("lfi_payments", JSON.stringify(arr)).catch(() => {});
      }
    });

    // Auto-block: check expired pending payments every minute
    const autoBlockTimer = setInterval(async () => {
      try {
        const raw = await AsyncStorage.getItem("lfi_payments");
        const allPayments: Payment[] = raw ? JSON.parse(raw) : [];
        const now = new Date();
        const expired = allPayments.filter(
          (p) => p.status === "pending" && new Date(p.deadline) < now
        );
        if (expired.length === 0) return;

        const usersRaw = await AsyncStorage.getItem("lfi_users");
        const allUsers: User[] = usersRaw ? JSON.parse(usersRaw) : [];
        let usersChanged = false;
        const updatedUsers = allUsers.map((u) => {
          const hasExpired = expired.some((p) => p.merchantId === u.id);
          if (hasExpired && !u.isTerminated && !u.blacklisted) {
            usersChanged = true;
            return {
              ...u,
              blacklisted: true,
              blacklistedAt: now.toISOString(),
              blacklistReason: "Payment timeout — IPC 420 / BNS 318. Auto-blocked after 30 min.",
              suspended: true,
              suspendedAt: now.toISOString(),
              suspendReason: "Payment timeout fraud",
            };
          }
          return u;
        });

        if (usersChanged) {
          const obj = Object.fromEntries(updatedUsers.map((u) => [u.id, u]));
          await Promise.all([
            AsyncStorage.setItem("lfi_users", JSON.stringify(updatedUsers)),
            set(ref(db, "lfi_users"), obj),
          ]);
          setRegisteredUsers(updatedUsers);

          // Mark payments as auto-blocked
          const updatedPayments = allPayments.map((p) =>
            expired.some((e) => e.id === p.id)
              ? { ...p, status: "disputed" as const, autoBlockedAt: now.toISOString() }
              : p
          );
          const pObj = Object.fromEntries(updatedPayments.map((p) => [p.id, p]));
          await Promise.all([
            AsyncStorage.setItem("lfi_payments", JSON.stringify(updatedPayments)),
            set(ref(db, "lfi_payments"), pObj),
          ]);
          setPayments(updatedPayments);
        }
      } catch {}
    }, 60000);

    return () => {
      unsubTrips();
      unsubUsers();
      unsubFraud();
      unsubPayments();
      clearInterval(autoBlockTimer);
    };
  }, []);

  const saveFraudCases = async (updated: FraudCase[]) => {
    setFraudCases(updated);
    const obj = Object.fromEntries(updated.map((c) => [c.id, c]));
    await Promise.all([
      AsyncStorage.setItem("lfi_fraud_cases", JSON.stringify(updated)),
      fbWrite("lfi_fraud_cases", obj),
    ]);
  };

  const saveTrips = async (updatedTrips: Trip[]) => {
    setTrips(updatedTrips);
    const obj = Object.fromEntries(updatedTrips.map((t) => [t.id, t]));
    await Promise.all([
      AsyncStorage.setItem("lfi_trips", JSON.stringify(updatedTrips)),
      fbWrite("lfi_trips", obj),
    ]);
  };

  const saveUsers = async (updatedUsers: User[]) => {
    setRegisteredUsers(updatedUsers);
    const obj = Object.fromEntries(updatedUsers.map((u) => [u.id, u]));
    await Promise.all([
      AsyncStorage.setItem("lfi_users", JSON.stringify(updatedUsers)),
      fbWrite("lfi_users", obj),
    ]);
  };

  const login = useCallback(
    async (
      name: string,
      phone: string,
      role: UserRole,
      city: string,
      extras?: { businessName?: string; aadhaarNumber?: string; gstNumber?: string }
    ) => {
      const existingJson = await AsyncStorage.getItem("lfi_users");
      const existing: User[] = existingJson ? JSON.parse(existingJson) : [];
      const existingUser = existing.find((u) => u.phone === phone && u.role === role);

      if (existingUser?.blacklisted) {
        throw new Error(`BLACKLISTED:Your account is blocked under BNS Section 316 (Theft) & 318 (Cheating). GPS & IP logged for Mangrol, Junagadh jurisdiction. Reason: ${existingUser.blacklistReason ?? "Fraud / Theft detected."}`);
      }

      if (existingUser?.suspended) {
        throw new Error(`SUSPENDED:${existingUser.suspendReason ?? "Fraud complaint ke karan aapka account band kar diya gaya hai."}`);
      }

      const newUser: User = existingUser ?? {
        id: generateId(),
        name,
        phone,
        role,
        aadhaarVerified: false,
        city,
        registeredAt: new Date().toISOString(),
        rating: 0,
        totalRatings: 0,
        isVerified: false,
        ...(extras ?? {}),
      };

      setUser(newUser);
      await AsyncStorage.setItem("lfi_user", JSON.stringify(newUser));

      if (role !== "admin") {
        const withoutDuplicate = existing.filter((u) => u.phone !== phone || u.role !== role);
        const updated = [newUser, ...withoutDuplicate];
        await saveUsers(updated);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    setUser(null);
    await AsyncStorage.removeItem("lfi_user");
  }, []);

  const deleteTrip = useCallback(
    async (tripId: string) => {
      const updated = trips.filter((t) => t.id !== tripId);
      await saveTrips(updated);
    },
    [trips]
  );

  const removeUser = useCallback(
    async (userId: string) => {
      const updated = registeredUsers.filter((u) => u.id !== userId);
      await saveUsers(updated);
    },
    [registeredUsers]
  );

  const suspendUser = useCallback(
    async (userId: string, reason: string) => {
      const updated = registeredUsers.map((u) =>
        u.id === userId
          ? { ...u, suspended: true, suspendedAt: new Date().toISOString(), suspendReason: reason }
          : u
      );
      await saveUsers(updated);
      if (user?.id === userId) {
        setUser(null);
        await AsyncStorage.removeItem("lfi_user");
      }
    },
    [registeredUsers, user]
  );

  const reinstateUser = useCallback(
    async (userId: string) => {
      const updated = registeredUsers.map((u) =>
        u.id === userId
          ? { ...u, suspended: false, suspendedAt: undefined, suspendReason: undefined, blacklisted: false, blacklistedAt: undefined, blacklistReason: undefined }
          : u
      );
      await saveUsers(updated);
    },
    [registeredUsers]
  );

  const checkFraudAndAlert = useCallback(
    async (params: {
      userId: string;
      userName: string;
      vehicleNumber?: string;
      tripId: string;
      fraudType: "Document Fraud" | "Route Diversion" | "Goods Theft/Misuse" | "Unauthorized Access";
      location: string;
    }): Promise<{ blocked: boolean; caseRef: string; warningMessage: string }> => {
      const { userId, userName, vehicleNumber, tripId, fraudType, location } = params;
      const timestamp = new Date();
      const year = timestamp.getFullYear();
      const seq = Math.floor(Math.random() * 9000) + 1000;
      const caseRef = `LFI-ALERT-${year}-${seq}`;
      const ipcSections = IPC_SECTIONS_MAP[fraudType] ?? IPC_SECTIONS_MAP["Kuch aur"];
      const sectionLabels = ipcSections.map((s) => `${s.section}/${s.bns}`).join(", ");

      const warningMessage =
        `Your account is blocked under BNS Section 316 (Theft) & 318 (Cheating). ` +
        `GPS & IP logged for Mangrol, Junagadh jurisdiction.\n\n` +
        `Case Ref: ${caseRef}\n` +
        `Fraud Type: ${fraudType}\n` +
        `Applied Sections: ${sectionLabels}\n\n` +
        `Governed by Carriage by Road Act 2007. Disputes subject to Mangrol (Gujarat) jurisdiction.\n` +
        `Helpline: 100 / 112  |  Cyber: 1930`;

      let gpsCoords: { latitude: number; longitude: number; accuracy: number | null } | null = null;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          gpsCoords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy ?? null,
          };
        }
      } catch {}

      const fraudLog = {
        caseRef,
        userId,
        userName,
        vehicleNumber: vehicleNumber ?? null,
        tripId,
        fraudType,
        location,
        gpsCoords,
        ipcSections,
        detectedAt: timestamp.toISOString(),
        userStatus: "Blacklisted",
        blocked: true,
        warningMessage,
        jurisdiction: "Mangrol, Junagadh, Gujarat",
        actLaw: "Carriage by Road Act 2007 + BNS 316 & 318",
      };

      try {
        await fbWrite(`lfi_fraud_alerts/${caseRef}`, fraudLog);
        if (gpsCoords) {
          await fbWrite(`lfi_gps_security_log/${userId}/${caseRef}`, {
            ...gpsCoords,
            loggedAt: timestamp.toISOString(),
            reason: fraudType,
            caseRef,
          });
        }
      } catch {}

      const blacklistReason = `${fraudType} — BNS 316 & 318. Case: ${caseRef}`;
      const updatedUsers = registeredUsers.map((u) =>
        u.id === userId
          ? {
              ...u,
              suspended: true,
              suspendedAt: timestamp.toISOString(),
              suspendReason: blacklistReason,
              blacklisted: true,
              blacklistedAt: timestamp.toISOString(),
              blacklistReason,
            }
          : u
      );
      await saveUsers(updatedUsers);

      return { blocked: true, caseRef, warningMessage };
    },
    [registeredUsers, fbWrite, saveUsers]
  );

  const createTrip = useCallback(
    async (
      tripData: Omit<
        Trip,
        | "id"
        | "biltyNumber"
        | "status"
        | "merchantId"
        | "merchantName"
        | "merchantPhone"
        | "merchantCity"
        | "lfiCommission"
        | "driverEarning"
        | "createdAt"
        | "commissionPaid"
        | "driverRatedByMerchant"
        | "merchantRatedByDriver"
        | "vehicleCategory"
        | "notificationRadiusKm"
        | "notificationType"
      >
    ) => {
      if (!user) return;
      const commission = Math.round(tripData.freightAmount * COMMISSION_RATE);
      const vehicleNotifConfig = getVehicleNotificationConfig(tripData.vehicleType);
      const newTrip: Trip = {
        ...tripData,
        id: generateId(),
        biltyNumber: generateBiltyNumber(),
        status: "pending",
        merchantId: user.id,
        merchantName: user.name,
        merchantPhone: user.phone,
        merchantCity: user.city,
        lfiCommission: commission,
        driverEarning: tripData.freightAmount - commission,
        createdAt: new Date().toISOString(),
        commissionPaid: false,
        vehicleCategory: vehicleNotifConfig.category,
        notificationRadiusKm: vehicleNotifConfig.radiusKm,
        notificationType: vehicleNotifConfig.notificationType,
      };
      const updated = [newTrip, ...trips];
      await saveTrips(updated);
    },
    [user, trips]
  );

  const payCommissionAndAccept = useCallback(
    async (tripId: string) => {
      if (!user) return;
      const updated = trips.map((t) =>
        t.id === tripId
          ? {
              ...t,
              status: "accepted" as TripStatus,
              driverId: user.id,
              driverName: user.name,
              driverPhone: user.phone,
              acceptedAt: new Date().toISOString(),
              commissionPaid: true,
            }
          : t
      );
      await saveTrips(updated);
    },
    [user, trips]
  );

  const reportFraud = useCallback(
    async (tripId: string) => {
      if (!user) return;
      const updated = trips.map((t) =>
        t.id === tripId
          ? {
              ...t,
              fraudReportedBy: [...(t.fraudReportedBy ?? []), user.id],
            }
          : t
      );
      await saveTrips(updated);
    },
    [user, trips]
  );

  const fileFraudComplaint = useCallback(
    async (tripId: string, description: string): Promise<FraudCase> => {
      if (!user) throw new Error("Not logged in");
      const trip = trips.find((t) => t.id === tripId);
      if (!trip) throw new Error("Trip not found");

      const reportedAt = new Date();
      const deadlineAt = new Date(reportedAt.getTime() + FRAUD_RESPONSE_MINUTES * 60 * 1000);
      const year = reportedAt.getFullYear();
      const seq = Math.floor(Math.random() * 9000) + 1000;
      const caseRef = `LFI-FIR-${year}-${seq}`;

      const isDriver = user.role === "driver";
      const accusedId = isDriver ? trip.merchantId : (trip.driverId ?? "");
      const accusedName = isDriver ? trip.merchantName : (trip.driverName ?? "Unknown");
      const accusedPhone = isDriver ? trip.merchantPhone : (trip.driverPhone ?? "");
      const accusedRole: "merchant" | "driver" = isDriver ? "merchant" : "driver";

      const colonIdx = description.indexOf(":");
      const category = colonIdx > 0 ? description.substring(0, colonIdx).trim() : "Kuch aur";
      const ipcSections = IPC_SECTIONS_MAP[category] ?? IPC_SECTIONS_MAP["Kuch aur"];

      const fraudCase: FraudCase = {
        id: generateId(),
        tripId,
        biltyNumber: trip.biltyNumber,
        fromCity: trip.fromCity,
        toCity: trip.toCity,
        reportedBy: user.role as "driver" | "merchant",
        reporterId: user.id,
        reporterName: user.name,
        reporterPhone: user.phone,
        accusedId,
        accusedName,
        accusedPhone,
        accusedRole,
        category,
        ipcSections,
        description,
        reportedAt: reportedAt.toISOString(),
        deadlineAt: deadlineAt.toISOString(),
        status: "pending_merchant",
        caseRef,
        vehicleNumber: trip.vehicleNumber,
      };

      const updatedCases = [fraudCase, ...fraudCases];
      await saveFraudCases(updatedCases);

      const updatedTrips = trips.map((t) =>
        t.id === tripId
          ? { ...t, fraudReportedBy: [...(t.fraudReportedBy ?? []), user.id] }
          : t
      );
      await saveTrips(updatedTrips);

      return fraudCase;
    },
    [user, trips, fraudCases]
  );

  const respondToFraudCase = useCallback(
    async (caseId: string, response: string) => {
      if (!user) return;
      const updated = fraudCases.map((c) =>
        c.id === caseId
          ? {
              ...c,
              status: "merchant_responded" as FraudCaseStatus,
              accusedResponse: response,
              accusedRespondedAt: new Date().toISOString(),
            }
          : c
      );
      await saveFraudCases(updated);
    },
    [user, fraudCases]
  );

  const escalateFraudCase = useCallback(
    async (caseId: string) => {
      const fc = fraudCases.find((c) => c.id === caseId);
      if (!fc) return;

      const suspendReason =
        `Fraud Case ${fc.caseRef}: ${fc.category} — 30 min mein jawab na dene par auto-escalation. ` +
        `Dharayen: ${fc.ipcSections.map((s) => `${s.section} (${s.bns})`).join(", ")}`;

      const updatedUsers = registeredUsers.map((u) =>
        u.id === fc.accusedId
          ? { ...u, suspended: true, suspendedAt: new Date().toISOString(), suspendReason }
          : u
      );
      await saveUsers(updatedUsers);

      const updated = fraudCases.map((c) =>
        c.id === caseId
          ? {
              ...c,
              status: "auto_escalated" as FraudCaseStatus,
              escalatedAt: new Date().toISOString(),
              accusedSuspended: true,
            }
          : c
      );
      await saveFraudCases(updated);

      if (user?.id === fc.accusedId) {
        setUser(null);
        await AsyncStorage.removeItem("lfi_user");
      }
    },
    [fraudCases, registeredUsers, user]
  );

  const getFraudCasesForTrip = useCallback(
    (tripId: string): FraudCase[] => {
      return fraudCases.filter((c) => c.tripId === tripId);
    },
    [fraudCases]
  );

  const getFraudCasesAgainstUser = useCallback(
    (userId: string): FraudCase[] => {
      return fraudCases.filter((c) => c.accusedId === userId);
    },
    [fraudCases]
  );

  const getChatMessages = useCallback(
    async (tripId: string): Promise<ChatMessage[]> => {
      try {
        const fbVal = await fbRead(`lfi_chat/${tripId}`);
        if (fbVal) {
          const msgs = snapToArray<ChatMessage>(fbVal);
          msgs.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
          await AsyncStorage.setItem(`lfi_chat_${tripId}`, JSON.stringify(msgs));
          return msgs;
        }
        const json = await AsyncStorage.getItem(`lfi_chat_${tripId}`);
        return json ? JSON.parse(json) : [];
      } catch {
        return [];
      }
    },
    []
  );

  const sendChatMessage = useCallback(
    async (tripId: string, text: string) => {
      if (!user || !text.trim()) return;
      const existing = await getChatMessages(tripId);
      const msg: ChatMessage = {
        id: generateId(),
        tripId,
        senderId: user.id,
        senderName: user.name,
        senderRole: user.role as "merchant" | "driver",
        text: text.trim(),
        createdAt: new Date().toISOString(),
      };
      const updated = [...existing, msg];
      await Promise.all([
        AsyncStorage.setItem(`lfi_chat_${tripId}`, JSON.stringify(updated)),
        fbWrite(`lfi_chat/${tripId}`, Object.fromEntries(updated.map((m) => [m.id, m]))),
      ]);
    },
    [user, getChatMessages]
  );

  const startTrip = useCallback(
    async (tripId: string) => {
      const updated = trips.map((t) =>
        t.id === tripId ? { ...t, status: "in_transit" as TripStatus } : t
      );
      await saveTrips(updated);
    },
    [trips]
  );

  const deliverTrip = useCallback(
    async (tripId: string) => {
      const updated = trips.map((t) =>
        t.id === tripId
          ? {
              ...t,
              status: "delivered" as TripStatus,
              deliveredAt: new Date().toISOString(),
            }
          : t
      );
      await saveTrips(updated);
    },
    [trips]
  );

  const cancelTrip = useCallback(
    async (tripId: string) => {
      const updated = trips.map((t) =>
        t.id === tripId ? { ...t, status: "cancelled" as TripStatus } : t
      );
      await saveTrips(updated);
    },
    [trips]
  );

  const rateUser = useCallback(
    async (
      targetUserId: string,
      tripId: string,
      stars: number,
      raterRole: "merchant" | "driver"
    ) => {
      const updatedUsers = registeredUsers.map((u) => {
        if (u.id === targetUserId) {
          const newTotal = (u.totalRatings ?? 0) + 1;
          const newRating = (((u.rating ?? 0) * (u.totalRatings ?? 0)) + stars) / newTotal;
          return {
            ...u,
            rating: Math.round(newRating * 10) / 10,
            totalRatings: newTotal,
            isVerified: computeVerified(newRating, newTotal),
          };
        }
        return u;
      });
      await saveUsers(updatedUsers);

      const updatedTrips = trips.map((t) => {
        if (t.id === tripId) {
          if (raterRole === "merchant") return { ...t, driverRatedByMerchant: true };
          if (raterRole === "driver") return { ...t, merchantRatedByDriver: true };
        }
        return t;
      });
      await saveTrips(updatedTrips);

      if (user?.id === targetUserId) {
        const rated = updatedUsers.find((u) => u.id === targetUserId);
        if (rated) {
          setUser(rated);
          await AsyncStorage.setItem("lfi_user", JSON.stringify(rated));
        }
      }
    },
    [registeredUsers, trips, user]
  );

  const getMyTrips = useCallback((): Trip[] => {
    if (!user) return [];
    if (user.role === "merchant") {
      return trips.filter((t) => t.merchantId === user.id);
    }
    if (user.role === "driver") {
      return trips.filter((t) => t.driverId === user.id);
    }
    return trips;
  }, [user, trips]);

  const getAvailableTrips = useCallback((): Trip[] => {
    return trips.filter((t) => t.status === "pending");
  }, [trips]);

  const getEarnings = useCallback(() => {
    if (!user) return { total: 0, commission: 0, thisMonth: 0, completedTrips: 0 };
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let relevantTrips: Trip[];
    if (user.role === "driver") {
      relevantTrips = trips.filter(
        (t) => t.driverId === user.id && t.status === "delivered"
      );
    } else if (user.role === "admin") {
      relevantTrips = trips.filter((t) => t.status === "delivered");
    } else {
      relevantTrips = trips.filter(
        (t) => t.merchantId === user.id && t.status === "delivered"
      );
    }

    const total = relevantTrips.reduce(
      (sum, t) =>
        user.role === "driver"
          ? sum + (t.driverEarning ?? 0)
          : user.role === "admin"
          ? sum + (t.lfiCommission ?? 0)
          : sum + (t.freightAmount ?? 0),
      0
    );
    const commission = relevantTrips.reduce((sum, t) => sum + (t.lfiCommission ?? 0), 0);
    const thisMonth = relevantTrips
      .filter((t) => new Date(t.deliveredAt || t.createdAt) >= startOfMonth)
      .reduce(
        (sum, t) =>
          user.role === "driver"
            ? sum + (t.driverEarning ?? 0)
            : user.role === "admin"
            ? sum + (t.lfiCommission ?? 0)
            : sum + (t.freightAmount ?? 0),
        0
      );

    return {
      total,
      commission,
      thisMonth,
      completedTrips: relevantTrips.length,
    };
  }, [user, trips]);

  const savePayments = async (updated: Payment[]) => {
    setPayments(updated);
    const obj = Object.fromEntries(updated.map((p) => [p.id, p]));
    await Promise.all([
      AsyncStorage.setItem("lfi_payments", JSON.stringify(updated)),
      fbWrite("lfi_payments", obj),
    ]);
  };

  const submitPayment = useCallback(
    async (tripId: string, utrRef: string) => {
      if (!user) return;
      const trip = trips.find((t) => t.id === tripId);
      if (!trip) return;
      const now = new Date();
      const deadline = new Date(now.getTime() + PAYMENT_GRACE_MINUTES * 60 * 1000);
      const payment: Payment = {
        id: generateId(),
        tripId,
        merchantId: user.id,
        merchantName: user.name,
        driverId: trip.driverId ?? "",
        driverName: trip.driverName ?? "",
        utrRef: utrRef.trim(),
        status: "pending",
        submittedAt: now.toISOString(),
        deadline: deadline.toISOString(),
      };
      const updated = [payment, ...payments.filter((p) => p.tripId !== tripId)];
      await savePayments(updated);
    },
    [user, trips, payments]
  );

  const confirmPayment = useCallback(
    async (paymentId: string) => {
      const updated = payments.map((p) =>
        p.id === paymentId
          ? { ...p, status: "verified" as const, confirmedAt: new Date().toISOString() }
          : p
      );
      await savePayments(updated);
    },
    [payments]
  );

  const disputePayment = useCallback(
    async (paymentId: string) => {
      const updated = payments.map((p) =>
        p.id === paymentId
          ? { ...p, status: "disputed" as const, disputedAt: new Date().toISOString() }
          : p
      );
      await savePayments(updated);
      // Auto-block the merchant immediately on dispute
      const disputed = payments.find((p) => p.id === paymentId);
      if (!disputed) return;
      const now = new Date().toISOString();
      const updatedUsers = registeredUsers.map((u) =>
        u.id === disputed.merchantId
          ? {
              ...u,
              blacklisted: true,
              blacklistedAt: now,
              blacklistReason: "Driver ne payment nahi mili report ki — IPC 420 / BNS 318.",
              suspended: true,
              suspendedAt: now,
              suspendReason: "Payment disputed by driver",
            }
          : u
      );
      await saveUsers(updatedUsers);
    },
    [payments, registeredUsers]
  );

  const terminateBusiness = useCallback(
    async (userId: string) => {
      const now = new Date().toISOString();
      const reason = "IPC 420/406 aur Section 102 CrPC ke tehat aapka business sthayi roop se band kar diya gaya hai. / Business permanently terminated under IPC 420/406 & Section 102 CrPC.";
      const updatedUsers = registeredUsers.map((u) =>
        u.id === userId
          ? {
              ...u,
              isTerminated: true,
              terminatedAt: now,
              terminationReason: reason,
              blacklisted: true,
              blacklistedAt: now,
              blacklistReason: reason,
              suspended: true,
              suspendedAt: now,
              suspendReason: reason,
            }
          : u
      );
      await saveUsers(updatedUsers);
      await fbWrite(`lfi_global_blacklist/${userId}`, {
        userId,
        terminatedAt: now,
        reason,
        aadhaarNumber: registeredUsers.find((u) => u.id === userId)?.aadhaarNumber ?? null,
      });
    },
    [registeredUsers]
  );

  const value = useMemo(
    () => ({
      user,
      trips,
      registeredUsers,
      fraudCases,
      payments,
      isLoading,
      login,
      logout,
      createTrip,
      payCommissionAndAccept,
      startTrip,
      deliverTrip,
      cancelTrip,
      rateUser,
      reportFraud,
      fileFraudComplaint,
      respondToFraudCase,
      escalateFraudCase,
      getFraudCasesForTrip,
      getFraudCasesAgainstUser,
      getChatMessages,
      sendChatMessage,
      getMyTrips,
      getAvailableTrips,
      getEarnings,
      deleteTrip,
      removeUser,
      suspendUser,
      reinstateUser,
      checkFraudAndAlert,
      submitPayment,
      confirmPayment,
      disputePayment,
      terminateBusiness,
    }),
    [
      user,
      trips,
      registeredUsers,
      fraudCases,
      payments,
      isLoading,
      login,
      logout,
      createTrip,
      payCommissionAndAccept,
      startTrip,
      deliverTrip,
      cancelTrip,
      rateUser,
      reportFraud,
      fileFraudComplaint,
      respondToFraudCase,
      escalateFraudCase,
      getFraudCasesForTrip,
      getFraudCasesAgainstUser,
      getChatMessages,
      sendChatMessage,
      getMyTrips,
      getAvailableTrips,
      getEarnings,
      deleteTrip,
      removeUser,
      suspendUser,
      reinstateUser,
      checkFraudAndAlert,
      submitPayment,
      confirmPayment,
      disputePayment,
      terminateBusiness,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
