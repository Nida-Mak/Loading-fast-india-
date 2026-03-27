import React, { useRef, useEffect } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import WebView from "react-native-webview";

import Colors from "@/constants/colors";

interface Props {
  lat: number;
  lng: number;
  driverName?: string;
  fromCity?: string;
  toCity?: string;
  ageSeconds?: number;
}

function buildMapHtml(lat: number, lng: number, driverName: string, fromCity: string, toCity: string) {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body, #map { width: 100%; height: 100%; background: #0A0A0F; }
  .info-box {
    position: absolute;
    bottom: 12px;
    left: 12px;
    right: 12px;
    background: rgba(28,28,46,0.95);
    border: 1px solid #E85D04;
    border-radius: 10px;
    padding: 10px 14px;
    z-index: 999;
    color: white;
    font-family: sans-serif;
  }
  .info-box .driver { font-size: 14px; font-weight: bold; color: #E85D04; }
  .info-box .route { font-size: 12px; color: #8888AA; margin-top: 2px; }
  .live-dot {
    display: inline-block;
    width: 8px; height: 8px;
    background: #10B981;
    border-radius: 50%;
    margin-right: 5px;
    animation: pulse 1.5s infinite;
  }
  .live-label { font-size: 10px; color: #10B981; font-weight: bold; letter-spacing: 1px; }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.3); }
  }
</style>
</head>
<body>
<div id="map"></div>
<div class="info-box">
  <div><span class="live-dot"></span><span class="live-label">LIVE</span></div>
  <div class="driver">&#x1F69B; ${driverName}</div>
  <div class="route">${fromCity} &#x2192; ${toCity}</div>
</div>
<script>
  var map = L.map('map', { zoomControl: true, attributionControl: false }).setView([${lat}, ${lng}], 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

  var truckIcon = L.divIcon({
    html: '<div style="background:#E85D04;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.5);">&#x1F69B;</div>',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    className: ''
  });

  var marker = L.marker([${lat}, ${lng}], { icon: truckIcon }).addTo(map);

  function updateLocation(newLat, newLng) {
    marker.setLatLng([newLat, newLng]);
    map.panTo([newLat, newLng], { animate: true, duration: 0.8 });
  }

  window.addEventListener('message', function(e) {
    try { var d = JSON.parse(e.data); if (d.lat && d.lng) updateLocation(d.lat, d.lng); } catch(err) {}
  });
  document.addEventListener('message', function(e) {
    try { var d = JSON.parse(e.data); if (d.lat && d.lng) updateLocation(d.lat, d.lng); } catch(err) {}
  });
</script>
</body>
</html>`;
}

export default function LiveMap({ lat, lng, driverName = "Driver", fromCity = "From", toCity = "To", ageSeconds }: Props) {
  const isStale = ageSeconds !== undefined && ageSeconds > 60;
  const webViewRef = useRef<WebView>(null);
  const initializedRef = useRef(false);
  const initialHtmlRef = useRef(buildMapHtml(lat, lng, driverName, fromCity, toCity));

  useEffect(() => {
    if (!webViewRef.current) return;
    if (!initializedRef.current) return;
    const js = `updateLocation(${lat}, ${lng}); true;`;
    webViewRef.current.injectJavaScript(js);
  }, [lat, lng]);

  if (Platform.OS === "web") {
    return (
      <View style={styles.webFallback}>
        <Text style={styles.webIcon}>🗺️</Text>
        <Text style={styles.webTitle}>Live Location</Text>
        <Text style={styles.webCoords}>
          {driverName} — {lat.toFixed(5)}, {lng.toFixed(5)}
        </Text>
        <Text style={styles.webSub}>{fromCity} → {toCity}</Text>
        {isStale && <Text style={styles.staleText}>⚠️ Location purani ho sakti hai</Text>}
        <Text
          style={styles.webLink}
          onPress={() => {
            const url = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=14/${lat}/${lng}`;
            if (typeof window !== "undefined") window.open(url, "_blank");
          }}
        >
          🌐 OpenStreetMap mein dekho →
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isStale && (
        <View style={styles.staleBanner}>
          <Text style={styles.staleBannerText}>⚠️ Location update aane mein thodi der hai</Text>
        </View>
      )}
      <WebView
        ref={webViewRef}
        style={styles.map}
        source={{ html: initialHtmlRef.current }}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        bounces={false}
        onLoad={() => {
          initializedRef.current = true;
          if (webViewRef.current) {
            webViewRef.current.injectJavaScript(`updateLocation(${lat}, ${lng}); true;`);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  map: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  staleBanner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: "#2A1F00",
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  staleBannerText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.warning,
    textAlign: "center",
  },
  webFallback: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 180,
    justifyContent: "center",
  },
  webIcon: { fontSize: 36 },
  webTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  webCoords: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
  },
  webSub: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  staleText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.warning,
  },
  webLink: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.info,
    textDecorationLine: "underline",
    marginTop: 4,
  },
});
