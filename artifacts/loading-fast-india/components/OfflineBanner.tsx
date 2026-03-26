import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
} from "react-native";

import Colors from "@/constants/colors";

function useIsOffline() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (Platform.OS === "web") {
      const onOnline = () => setIsOffline(false);
      const onOffline = () => setIsOffline(true);
      setIsOffline(!navigator.onLine);
      window.addEventListener("online", onOnline);
      window.addEventListener("offline", onOffline);
      return () => {
        window.removeEventListener("online", onOnline);
        window.removeEventListener("offline", onOffline);
      };
    } else {
      let NetInfo: any;
      try {
        NetInfo = require("@react-native-community/netinfo").default;
        const unsubscribe = NetInfo.addEventListener((state: any) => {
          if (state.isConnected !== null) {
            setIsOffline(state.isConnected === false);
          }
        });
        return unsubscribe;
      } catch {
        return undefined;
      }
    }
  }, []);

  return isOffline;
}

export default function OfflineBanner() {
  const isOffline = useIsOffline();
  const slideAnim = useRef(new Animated.Value(-80)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isOffline ? 0 : -80,
      useNativeDriver: false,
      tension: 80,
      friction: 10,
    }).start();
  }, [isOffline]);

  if (!isOffline) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      <MaterialCommunityIcons name="wifi-off" size={18} color="#fff" />
      <Text style={styles.title}>Aap Offline Hain — </Text>
      <Text style={styles.subtitle}>App kaam karta rahega</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: "#B45309",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingTop: Platform.OS === "ios" ? 52 : 8,
  },
  title: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#FDE68A",
  },
});
