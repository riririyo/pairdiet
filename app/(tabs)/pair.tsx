import { ScrollView, View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { C } from "@/theme";

// TODO: 1対1チャット（1時間1通）＋👏無制限リアクション＋通報→ブロック連動
export default function PairScreen() {
  const { state } = useStore();
  const insets = useSafeAreaInsets();
  const pair = state.pair;
  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12 }}>
      <View style={s.card}>
        <Text style={{ fontSize: 26 }}>{pair?.emoji ?? "🤝"}</Text>
        <Text style={{ fontWeight: "700", fontSize: 16, marginTop: 4 }}>{pair?.name ?? "相棒"}</Text>
        <Text style={s.small}>理由：{pair?.reason ?? "—"}</Text>
      </View>
      <View style={s.card}>
        <Text style={s.h2}>チャット（未実装）</Text>
        <Text style={s.small}>1時間1通のテキスト＋相手の記録への👏無制限を移植予定。</Text>
      </View>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  card: { backgroundColor: C.card, borderRadius: C.radius, padding: 16, marginBottom: 10 },
  h2: { fontSize: 15, fontWeight: "600", marginBottom: 4 },
  small: { color: C.sub, fontSize: 12 },
});
