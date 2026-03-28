import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Updates from "expo-updates";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, Text, Pressable, ActivityIndicator } from "react-native";

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

function RootLayoutNav() {
  const { user, isLoading } = useApp();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.replace("/(tabs)");
      } else {
        router.replace("/login");
      }
    }
  }, [user, isLoading]);

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
              </View>
            </GestureHandlerRootView>
          </AppProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
