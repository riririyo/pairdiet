import { Tabs } from "expo-router";
import { Text } from "react-native";
import { C } from "@/theme";

function icon(e: string) {
  return ({ color }: { color: string }) => <Text style={{ fontSize: 22, color }}>{e}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.sub,
        tabBarStyle: { height: 84, paddingTop: 6 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "ホーム", tabBarIcon: icon("🏠") }} />
      <Tabs.Screen name="history" options={{ title: "推移", tabBarIcon: icon("📈") }} />
      <Tabs.Screen name="camera" options={{ title: "撮影", tabBarIcon: icon("📷") }} />
      <Tabs.Screen name="pair" options={{ title: "ペア", tabBarIcon: icon("💬") }} />
      <Tabs.Screen name="settings" options={{ title: "設定", tabBarIcon: icon("⚙️") }} />
    </Tabs>
  );
}
