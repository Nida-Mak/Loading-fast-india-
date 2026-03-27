import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

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

interface AppContextValue {
  user: User | null;
  trips: Trip[];
  registeredUsers: User[];
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
  getChatMessages: (tripId: string) => Promise<ChatMessage[]>;
  sendChatMessage: (tripId: string, text: string) => Promise<void>;
  getMyTrips: () => Trip[];
  getAvailableTrips: () => Trip[];
  getEarnings: () => { total: number; commission: number; thisMonth: number; completedTrips: number };
  removeUser: (userId: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

const COMMISSION_RATE = 0.05;
export const ADMIN_PIN = "LFI2024";
export const VERIFIED_MIN_RATING = 4.0;
export const VERIFIED_MIN_COUNT = 3;

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
    lfiCommission: 2250,
    driverEarning: 42750,
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
    lfiCommission: 600,
    driverEarning: 11400,
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
    lfiCommission: 900,
    driverEarning: 17100,
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [userJson, tripsJson, usersJson] = await Promise.all([
        AsyncStorage.getItem("lfi_user"),
        AsyncStorage.getItem("lfi_trips"),
        AsyncStorage.getItem("lfi_users"),
      ]);
      if (userJson) setUser(JSON.parse(userJson));
      if (usersJson) setRegisteredUsers(JSON.parse(usersJson));
      if (tripsJson) {
        setTrips(JSON.parse(tripsJson));
      } else {
        setTrips(SAMPLE_TRIPS);
        await AsyncStorage.setItem("lfi_trips", JSON.stringify(SAMPLE_TRIPS));
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  const saveTrips = async (updatedTrips: Trip[]) => {
    setTrips(updatedTrips);
    await AsyncStorage.setItem("lfi_trips", JSON.stringify(updatedTrips));
  };

  const saveUsers = async (updatedUsers: User[]) => {
    setRegisteredUsers(updatedUsers);
    await AsyncStorage.setItem("lfi_users", JSON.stringify(updatedUsers));
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

  const getChatMessages = useCallback(
    async (tripId: string): Promise<ChatMessage[]> => {
      try {
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
      await AsyncStorage.setItem(`lfi_chat_${tripId}`, JSON.stringify(updated));
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
      getChatMessages,
      sendChatMessage,
      getMyTrips,
      getAvailableTrips,
      getEarnings,
      removeUser,
    }),
    [
      user,
      trips,
      registeredUsers,
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
      getChatMessages,
      sendChatMessage,
      getMyTrips,
      getAvailableTrips,
      getEarnings,
      removeUser,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
