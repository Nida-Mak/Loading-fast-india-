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
  city: string;
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
  driverId?: string;
  driverName?: string;
  consigneeName: string;
  consigneePhone: string;
  createdAt: string;
  acceptedAt?: string;
  deliveredAt?: string;
  lfiCommission: number;
  driverEarning: number;
  vehicleType: string;
  description?: string;
}

interface AppContextValue {
  user: User | null;
  trips: Trip[];
  isLoading: boolean;
  login: (name: string, phone: string, role: UserRole, city: string) => Promise<void>;
  logout: () => Promise<void>;
  createTrip: (trip: Omit<Trip, "id" | "biltyNumber" | "status" | "merchantId" | "merchantName" | "lfiCommission" | "driverEarning" | "createdAt">) => Promise<void>;
  acceptTrip: (tripId: string) => Promise<void>;
  startTrip: (tripId: string) => Promise<void>;
  deliverTrip: (tripId: string) => Promise<void>;
  cancelTrip: (tripId: string) => Promise<void>;
  getMyTrips: () => Trip[];
  getAvailableTrips: () => Trip[];
  getEarnings: () => { total: number; commission: number; thisMonth: number; completedTrips: number };
}

const AppContext = createContext<AppContextValue | null>(null);

const COMMISSION_RATE = 0.05;

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
    consigneeName: "Ramesh Kumar",
    consigneePhone: "9876543210",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    lfiCommission: 2250,
    driverEarning: 42750,
    vehicleType: "22-Wheeler",
    description: "Steel rods and construction material",
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
    consigneeName: "Priya Nair",
    consigneePhone: "9123456789",
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    lfiCommission: 600,
    driverEarning: 11400,
    vehicleType: "Mini Truck",
    description: "Mobile phones and laptops",
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
    consigneeName: "Suresh Reddy",
    consigneePhone: "9001234567",
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    lfiCommission: 900,
    driverEarning: 17100,
    vehicleType: "Tempo",
    description: "Furniture and household items",
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

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [userJson, tripsJson] = await Promise.all([
        AsyncStorage.getItem("lfi_user"),
        AsyncStorage.getItem("lfi_trips"),
      ]);
      if (userJson) setUser(JSON.parse(userJson));
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

  const login = useCallback(
    async (name: string, phone: string, role: UserRole, city: string) => {
      const newUser: User = {
        id: generateId(),
        name,
        phone,
        role,
        aadhaarVerified: false,
        city,
      };
      setUser(newUser);
      await AsyncStorage.setItem("lfi_user", JSON.stringify(newUser));
    },
    []
  );

  const logout = useCallback(async () => {
    setUser(null);
    await AsyncStorage.removeItem("lfi_user");
  }, []);

  const createTrip = useCallback(
    async (
      tripData: Omit<
        Trip,
        | "id"
        | "biltyNumber"
        | "status"
        | "merchantId"
        | "merchantName"
        | "lfiCommission"
        | "driverEarning"
        | "createdAt"
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
        lfiCommission: commission,
        driverEarning: tripData.freightAmount - commission,
        createdAt: new Date().toISOString(),
      };
      const updated = [newTrip, ...trips];
      await saveTrips(updated);
    },
    [user, trips]
  );

  const acceptTrip = useCallback(
    async (tripId: string) => {
      if (!user) return;
      const updated = trips.map((t) =>
        t.id === tripId
          ? {
              ...t,
              status: "accepted" as TripStatus,
              driverId: user.id,
              driverName: user.name,
              acceptedAt: new Date().toISOString(),
            }
          : t
      );
      await saveTrips(updated);
    },
    [user, trips]
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
      isLoading,
      login,
      logout,
      createTrip,
      acceptTrip,
      startTrip,
      deliverTrip,
      cancelTrip,
      getMyTrips,
      getAvailableTrips,
      getEarnings,
    }),
    [
      user,
      trips,
      isLoading,
      login,
      logout,
      createTrip,
      acceptTrip,
      startTrip,
      deliverTrip,
      cancelTrip,
      getMyTrips,
      getAvailableTrips,
      getEarnings,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
