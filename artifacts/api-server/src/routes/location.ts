import { Router } from "express";

const router = Router();

interface LocationData {
  tripId: string;
  driverId: string;
  driverName: string;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  timestamp: number;
}

const locationStore = new Map<string, LocationData>();

router.post("/location", (req, res) => {
  const { tripId, driverId, driverName, lat, lng, speed, heading } = req.body;

  if (!tripId || !driverId || !lat || !lng) {
    return res.status(400).json({ error: "tripId, driverId, lat, lng required" });
  }

  const data: LocationData = {
    tripId,
    driverId,
    driverName: driverName || "Driver",
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    speed: speed ? parseFloat(speed) : undefined,
    heading: heading ? parseFloat(heading) : undefined,
    timestamp: Date.now(),
  };

  locationStore.set(tripId, data);
  return res.json({ success: true, timestamp: data.timestamp });
});

router.get("/location/:tripId", (req, res) => {
  const { tripId } = req.params;
  const data = locationStore.get(tripId);

  if (!data) {
    return res.status(404).json({ error: "No location found for this trip" });
  }

  const ageSeconds = (Date.now() - data.timestamp) / 1000;

  return res.json({ ...data, ageSeconds });
});

export default router;
