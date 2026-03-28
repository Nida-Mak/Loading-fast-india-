import * as Location from "expo-location";
import { useEffect, useRef, useState, useCallback } from "react";
import { Platform } from "react-native";
import { ref, set, onValue, type Unsubscribe } from "firebase/database";
import { getFirebaseDB, isFirebaseConfigured } from "@/lib/firebase";
import { API_BASE } from "@/lib/api";

interface TrackingState {
  isTracking: boolean;
  lat: number | null;
  lng: number | null;
  error: string | null;
  permissionGranted: boolean;
}

export interface RemoteLocation {
  lat: number;
  lng: number;
  driverName: string;
  ageSeconds: number;
  timestamp: number;
}

async function sendLocationToAPI(
  tripId: string,
  driverId: string,
  driverName: string,
  lat: number,
  lng: number,
  speed?: number,
  heading?: number
) {
  try {
    await fetch(`${API_BASE}/location`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tripId, driverId, driverName, lat, lng, speed, heading }),
    });
  } catch {}
}

async function sendLocationToFirebase(
  tripId: string,
  driverId: string,
  driverName: string,
  lat: number,
  lng: number
) {
  const db = getFirebaseDB();
  if (!db) return false;
  try {
    await set(ref(db, `locations/${tripId}`), {
      lat,
      lng,
      driverId,
      driverName,
      timestamp: Date.now(),
    });
    return true;
  } catch {
    return false;
  }
}

export function useDriverLocationTracking(tripId: string, driverName: string) {
  const [state, setState] = useState<TrackingState>({
    isTracking: false,
    lat: null,
    lng: null,
    error: null,
    permissionGranted: false,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const latestCoords = useRef<{ lat: number; lng: number } | null>(null);

  const sendLocation = useCallback(
    async (lat: number, lng: number, speed?: number, heading?: number) => {
      const firebaseOk = await sendLocationToFirebase(tripId, tripId, driverName, lat, lng);
      if (!firebaseOk) {
        await sendLocationToAPI(tripId, tripId, driverName, lat, lng, speed, heading);
      }
    },
    [tripId, driverName]
  );

  const startTracking = useCallback(async () => {
    if (Platform.OS === "web") {
      if (!navigator.geolocation) {
        setState((s) => ({ ...s, error: "GPS is not supported in this browser" }));
        return;
      }
      setState((s) => ({ ...s, error: null }));
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          latestCoords.current = { lat, lng };
          setState((s) => ({ ...s, isTracking: true, lat, lng, permissionGranted: true, error: null }));
          sendLocation(lat, lng);
        },
        () => setState((s) => ({ ...s, error: "Location permission denied" })),
        { enableHighAccuracy: true }
      );
      const webInterval = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude: lat, longitude: lng } = pos.coords;
            latestCoords.current = { lat, lng };
            setState((s) => ({ ...s, lat, lng }));
            sendLocation(lat, lng, pos.coords.speed ?? undefined, pos.coords.heading ?? undefined);
          },
          () => {},
          { enableHighAccuracy: true }
        );
      }, 15000);
      intervalRef.current = webInterval;
      return;
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setState((s) => ({ ...s, error: "Location permission denied. Settings mein jaake allow karein." }));
      return;
    }

    setState((s) => ({ ...s, permissionGranted: true, error: null }));

    const currentPos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const lat = currentPos.coords.latitude;
    const lng = currentPos.coords.longitude;
    latestCoords.current = { lat, lng };
    setState((s) => ({ ...s, isTracking: true, lat, lng }));
    await sendLocation(lat, lng);

    watchRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 20, timeInterval: 15000 },
      async (pos) => {
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;
        latestCoords.current = { lat: newLat, lng: newLng };
        setState((s) => ({ ...s, lat: newLat, lng: newLng }));
        await sendLocation(newLat, newLng, pos.coords.speed ?? undefined, pos.coords.heading ?? undefined);
      }
    );
  }, [sendLocation]);

  const stopTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (watchRef.current) {
      watchRef.current.remove();
      watchRef.current = null;
    }
    setState((s) => ({ ...s, isTracking: false }));
  }, []);

  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  return { ...state, startTracking, stopTracking };
}

export function useMerchantLocationWatch(tripId: string, active: boolean) {
  const [location, setLocation] = useState<RemoteLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const unsubscribeRef = useRef<Unsubscribe | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanupFirebase = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  }, []);

  const cleanupPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startFirebaseWatch = useCallback(() => {
    const db = getFirebaseDB();
    if (!db) return false;
    try {
      const locRef = ref(db, `locations/${tripId}`);
      unsubscribeRef.current = onValue(locRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const ageSeconds = (Date.now() - data.timestamp) / 1000;
          setLocation({ ...data, ageSeconds });
        }
        setLoading(false);
      });
      return true;
    } catch {
      return false;
    }
  }, [tripId]);

  const fetchFromAPI = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/location/${tripId}`);
      if (res.ok) {
        const data = await res.json();
        setLocation(data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    if (!active) {
      cleanupFirebase();
      cleanupPolling();
      return;
    }

    setLoading(true);

    if (isFirebaseConfigured) {
      const ok = startFirebaseWatch();
      if (ok) return () => cleanupFirebase();
    }

    fetchFromAPI();
    intervalRef.current = setInterval(fetchFromAPI, 10000);
    return () => cleanupPolling();
  }, [active, startFirebaseWatch, fetchFromAPI, cleanupFirebase, cleanupPolling]);

  return { location, loading };
}
