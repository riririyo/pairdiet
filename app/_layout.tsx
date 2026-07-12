import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StoreProvider, useStore } from "@/store";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="dark" />
        <RootNav />
      </StoreProvider>
    </SafeAreaProvider>
  );
}

// オンボード完了状況に応じて遷移を振り分けるゲート
function RootNav() {
  const { state, loaded } = useStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!loaded) return;
    const inOnboarding = segments[0] === "onboarding";
    if (!state.onboarded && !inOnboarding) {
      router.replace("/onboarding");
    } else if (state.onboarded && inOnboarding) {
      router.replace("/");
    }
  }, [loaded, state.onboarded, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" />
    </Stack>
  );
}
