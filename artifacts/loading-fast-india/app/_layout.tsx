import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router, Stack, useRootNavigationState } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Updates from "expo-updates";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, Text, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import OfflineBanner from "@/components/OfflineBanner";
import { AppProvider, useApp } from "@/context/AppContext";
import Colors from "@/constants/colors";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function OtaUpdateBanner() {
  const [updateReady, setUpdateReady] = useState(false);
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    if (__DEV__) return;
    (async () => {
      try {
        const check = await Updates.checkForUpdateAsync();
        if (check.isAvailable) {
          await Updates.fetchUpdateAsync();
          setUpdateReady(true);
        }
      } catch {
      }
    })();
  }, []);

  if (!updateReady) return null;

  return (
    <Pressable
      onPress={async () => {
        setReloading(true);
        await Updates.reloadAsync();
      }}
      style={{
        position: "absolute",
        bottom: 90,
        left: 16,
        right: 16,
        backgroundColor: Colors.primary,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 10,
        zIndex: 9999,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>
          🔄 Naya Update Available!
        </Text>
        <Text style={{ color: "#fff", fontSize: 11, opacity: 0.9, marginTop: 2 }}>
          App restart karein — naya version ready hai
        </Text>
      </View>
      {reloading ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>
          Restart →
        </Text>
      )}
    </Pressable>
  );
}

function TerminatedNotice() {
  const { user, logout } = useApp();
  const insets = useSafeAreaInsets();
  if (!user?.isTerminated) return null;
  return (
    <View style={{
      position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "#0A0A0F", zIndex: 9999,
      paddingTop: insets.top, paddingBottom: insets.bottom,
    }}>
      <ScrollView contentContainerStyle={{ padding: 24, alignItems: "center", gap: 16 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#2A0000", alignItems: "center", justifyContent: "center", marginTop: 20 }}>
          <Text style={{ fontSize: 32 }}>{user.role === "driver" ? "🚛" : "⚖️"}</Text>
        </View>
        <Text style={{ fontSize: 20, fontWeight: "800", color: "#FF4444", textAlign: "center", fontFamily: "Inter_700Bold" }}>
          {user.role === "driver"
            ? "Driver ID Permanently Blocked\nड्राइवर ID स्थायी रूप से बंद"
            : "Business Permanently Terminated\nव्यापार स्थायी रूप से बंद"}
        </Text>
        <View style={{ backgroundColor: "#1C0000", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#FF444440", gap: 10, width: "100%" }}>
          <Text style={{ fontSize: 13, color: "#FF4444", fontWeight: "700", textAlign: "center", fontFamily: "Inter_700Bold" }}>
            {user.role === "driver" ? "🔴 DRIVER KILL-SWITCH ACTIVE" : "LEGAL NOTICE / कानूनी नोटिस"}
          </Text>

          {user.role === "driver" ? (
            <>
              <Text style={{ fontSize: 13, color: "#FF6666", fontWeight: "700", textAlign: "center", lineHeight: 20 }}>
                IPC 406/407: Aapka Truck aur Bank Account SEIZED (जब्त) kiya ja raha hai.
              </Text>
              <Text style={{ fontSize: 12, color: "#ccc", lineHeight: 19, textAlign: "center" }}>
                आपका ट्रक और बैंक खाता IPC 406/407 के तहत जब्त (SEIZED) किया जा रहा है।{"\n"}
                Section 102 CrPC ke tehat Police ko report kar di gayi hai.
              </Text>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 12, color: "#ccc", lineHeight: 19, textAlign: "center" }}>
                Aapka business IPC 420/406 aur Section 102 CrPC ke tehat sthayi roop se band kar diya gaya hai.
              </Text>
              <Text style={{ fontSize: 12, color: "#ccc", lineHeight: 19, textAlign: "center" }}>
                आपका बिज़नेस IPC 420/406 और Section 102 CrPC के तहत स्थायी रूप से बंद कर दिया गया है।
              </Text>
            </>
          )}

          <View style={{ borderTopWidth: 1, borderTopColor: "#FF444430", paddingTop: 10 }}>
            <Text style={{ fontSize: 11, color: "#888", textAlign: "center", lineHeight: 17 }}>
              Aadhaar aur Device ID Global Blacklist mein darz kar li gayi hai.{"\n"}
              Helpline: 100 / 112  |  Cyber Crime: 1930
            </Text>
          </View>
        </View>
        {user.terminationReason ? (
          <Text style={{ fontSize: 11, color: "#666", textAlign: "center", lineHeight: 16 }}>
            Karan / कारण: {user.terminationReason}
          </Text>
        ) : null}
        <Pressable
          onPress={logout}
          style={({ pressed }) => ({
            marginTop: 8,
            backgroundColor: "#1C1C2E",
            borderRadius: 10,
            paddingVertical: 12,
            paddingHorizontal: 32,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ color: "#888", fontSize: 13, fontFamily: "Inter_500Medium" }}>
            Logout / बाहर जाएं
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function RootLayoutNav() {
  const { user, isLoading } = useApp();
  const navState = useRootNavigationState();

  useEffect(() => {
    // Wait for router to be fully ready before navigating
    if (!navState?.key) return;
    if (!isLoading) {
      if (user) {
        router.replace("/(tabs)" as any);
      } else {
        router.replace("/login");
      }
    }
  }, [user, isLoading, navState?.key]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: "fade",
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="book-trip"
        options={{
          headerShown: true,
          title: "Book a Trip",
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.text,
          headerTitleStyle: {
            fontFamily: "Inter_600SemiBold",
            color: Colors.text,
          },
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="trip/[id]"
        options={{
          headerShown: true,
          title: "Trip Details",
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.text,
          headerTitleStyle: {
            fontFamily: "Inter_600SemiBold",
            color: Colors.text,
          },
        }}
      />
      <Stack.Screen
        name="privacy-policy"
        options={{
          headerShown: true,
          title: "Privacy Policy",
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.text,
          headerTitleStyle: {
            fontFamily: "Inter_600SemiBold",
            color: Colors.text,
          },
        }}
      />
      <Stack.Screen
        name="qr-share"
        options={{
          headerShown: false,
          presentation: "modal",
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AppProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <View style={{ flex: 1 }}>
                <RootLayoutNav />
                <OfflineBanner />
                <OtaUpdateBanner />
                <TerminatedNotice />
              </View>
            </GestureHandlerRootView>
          </AppProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
