import AsyncStorage from "@react-native-async-storage/async-storage";
import { get, ref, set } from "firebase/database";
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
}

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
  "Kuch aur": [
    { section: "IPC 420", bns: "BNS 318(4)", title: "Cheating / Dhokha", punishment: "7 saal + Jurmana" },
    { section: "IPC 406", bns: "BNS 316", title: "Criminal Breach of Trust / Amanat mein Khiyanat", punishment: "3 saal + Jurmana" },
  ],
};

interface AppContextValue {
  user: User | null;
  trips: Trip[];
  registeredUsers: User[];
  fraudCases: FraudCase[];
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
  removeUser: (userId: string) => Promise<void>;
  suspendUser: (userId: string, reason: string) => Promise<void>;
  reinstateUser: (userId: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export const APP_CONFIG = {
  commissionRate: 0.02,
  appName: "Loading Fast India",
  currency: "INR",
  upiId: "maksudsaiyed888@oksbi",
  gst: "24BRLPS3959R1ZN",
} as const;

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
    vehicleType: "10 Wheeler Truck (20 Ton)",
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
    vehicleType: "Tata Ace / Mini Truck (1.5 Ton)",
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
    vehicleType: "Canter (3 Ton)",
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

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);
  const [fraudCases, setFraudCases] = useState<FraudCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

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
      return snap.exists() ? snap.val() : null;
    } catch {
      return null;
    }
  };

  const snapToArray = <T,>(val: unknown): T[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val as T[];
    return Object.values(val as Record<string, T>);
  };

  const loadData = async () => {
    try {
      const [userJson, localTripsJson, localUsersJson, localFraudJson] = await Promise.all([
        AsyncStorage.getItem("lfi_user"),
        AsyncStorage.getItem("lfi_trips"),
        AsyncStorage.getItem("lfi_users"),
        AsyncStorage.getItem("lfi_fraud_cases"),
      ]);

      if (userJson) setUser(JSON.parse(userJson));

      const [fbTrips, fbUsers, fbFraud] = await Promise.all([
        fbRead("lfi_trips"),
        fbRead("lfi_users"),
        fbRead("lfi_fraud_cases"),
      ]);

      if (fbUsers) {
        const users = snapToArray<User>(fbUsers);
        setRegisteredUsers(users);
        await AsyncStorage.setItem("lfi_users", JSON.stringify(users));
      } else if (localUsersJson) {
        setRegisteredUsers(JSON.parse(localUsersJson));
      }

      if (fbFraud) {
        const cases = snapToArray<FraudCase>(fbFraud);
        setFraudCases(cases);
        await AsyncStorage.setItem("lfi_fraud_cases", JSON.stringify(cases));
      } else if (localFraudJson) {
        setFraudCases(JSON.parse(localFraudJson));
      }

      if (fbTrips) {
        const trips = snapToArray<Trip>(fbTrips);
        setTrips(trips);
        await AsyncStorage.setItem("lfi_trips", JSON.stringify(trips));
      } else if (localTripsJson) {
        setTrips(JSON.parse(localTripsJson));
      } else {
        setTrips(SAMPLE_TRIPS);
        await AsyncStorage.setItem("lfi_trips", JSON.stringify(SAMPLE_TRIPS));
        await fbWrite("lfi_trips", Object.fromEntries(SAMPLE_TRIPS.map((t) => [t.id, t])));
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

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
          ? { ...u, suspended: false, suspendedAt: undefined, suspendReason: undefined }
          : u
      );
      await saveUsers(updated);
    },
    [registeredUsers]
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
      >
    ) => {
      if (!user) return;
      const commission = Math.round(tripData.freightAmount * COMMISSION_RATE);
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
          ? sum + t.driverEarning
          : user.role === "admin"
          ? sum + t.lfiCommission
          : sum + t.freightAmount,
      0
    );
    const commission = relevantTrips.reduce((sum, t) => sum + t.lfiCommission, 0);
    const thisMonth = relevantTrips
      .filter((t) => new Date(t.deliveredAt || t.createdAt) >= startOfMonth)
      .reduce(
        (sum, t) =>
          user.role === "driver"
            ? sum + t.driverEarning
            : user.role === "admin"
            ? sum + t.lfiCommission
            : sum + t.freightAmount,
        0
      );

    return {
      total,
      commission,
      thisMonth,
      completedTrips: relevantTrips.length,
    };
  }, [user, trips]);

  const value = useMemo(
    () => ({
      user,
      trips,
      registeredUsers,
      fraudCases,
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
      removeUser,
      suspendUser,
      reinstateUser,
    }),
    [
      user,
      trips,
      registeredUsers,
      fraudCases,
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
      removeUser,
      suspendUser,
      reinstateUser,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
