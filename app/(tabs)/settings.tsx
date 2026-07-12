import { ScrollView, View, Text, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { C } from "@/theme";

export default function Settings() {
  const { state, set, reset } = useStore();
  const insets = useSafeAreaInsets();
  const off = state.debugDayOffset;
  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12 }}>
      <View style={s.card}>
        <Text style={s.h2}>設定</Text>
        <Row label="未記録の猶予日数" value={`${state.settings.graceDays}日`} />
        <Row label="併用アプリ" value="あすけん / Noom" />
      </View>
      <View style={s.card}>
        <Text style={s.h2}>開発用（現在 +{off}日）</Text>
        <View style={s.btnRow}>
          <Btn label="+1日" onPress={() => set({ debugDayOffset: off + 1 })} />
          <Btn label="+90日（満了へ）" onPress={() => set({ debugDayOffset: off + 90 })} />
          <Btn label="リセット" onPress={() => set({ debugDayOffset: 0 })} />
        </View>
        <Btn label="全データをリセット" danger onPress={reset} />
      </View>
      <Text style={s.small}>
        本アプリは減量効果を保証せず、継続を支援するツールです。食事・運動の指導は行いません。
      </Text>
    </ScrollView>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text>{label}</Text>
      <Text style={{ color: C.sub }}>{value}</Text>
    </View>
  );
}
function Btn({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable style={[s.btn, danger && { backgroundColor: "#feecec" }]} onPress={onPress}>
      <Text style={{ color: danger ? C.bad : C.ink, fontWeight: "600", fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  card: { backgroundColor: C.card, borderRadius: C.radius, padding: 16, marginBottom: 10 },
  h2: { fontSize: 15, fontWeight: "600", marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: C.line },
  btnRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 8 },
  btn: { backgroundColor: "rgba(120,120,128,0.12)", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, marginTop: 8 },
  small: { color: C.sub, fontSize: 11, lineHeight: 18, marginTop: 4 },
});
