import { ScrollView, View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { C } from "@/theme";

export default function History() {
  const { state } = useStore();
  const insets = useSafeAreaInsets();
  const recs = [...state.records].sort((a, b) => (a.date < b.date ? 1 : -1));
  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12 }}>
      <View style={s.card}>
        <Text style={s.h2}>記録（{recs.length}件）</Text>
        <Text style={s.small}>TODO: Apple風グラフ＋カレンダー（react-native-svg / react-native-calendars で移植）</Text>
      </View>
      {recs.map((r) => (
        <View key={r.date} style={[s.card, s.row]}>
          <Text style={{ fontWeight: "700" }}>{r.date}</Text>
          <Text style={{ color: C.sub }}>{r.weightKg != null ? `${r.weightKg}kg` : "—"}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  card: { backgroundColor: C.card, borderRadius: C.radius, padding: 16, marginBottom: 10 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  h2: { fontSize: 15, fontWeight: "600", marginBottom: 4 },
  small: { color: C.sub, fontSize: 12 },
});
