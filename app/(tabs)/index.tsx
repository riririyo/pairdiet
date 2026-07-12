import { ScrollView, View, Text, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { C } from "@/theme";
import {
  streak, consecutiveMissed, recordedOn, lastWeight, progressRate,
  pairDaysLeft, pairExpired, penaltyState, daysBetween, CYCLE_DAYS,
} from "@/logic";

export default function Home() {
  const { state, set, today } = useStore();
  const t = today();
  const { pair, cycle, records, settings } = state;
  const insets = useSafeAreaInsets();

  if (!pair || !cycle) {
    return (
      <View style={[s.screen, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={s.muted}>まだ相棒がいません。オンボードから始めてください。</Text>
      </View>
    );
  }

  const cur = lastWeight(records, cycle.startWeight);
  const lost = +(cycle.startWeight - cur).toFixed(1);
  const rate = progressRate(cycle, cur);
  const cycleDay = Math.min(CYCLE_DAYS, daysBetween(cycle.startDate, t) + 1);
  const recDays = records.filter((r) => r.date >= cycle.startDate).length;
  const missed = consecutiveMissed(records, t, cycle.startDate);
  const pstate = pair.status === "dissolved" ? "dissolved" : penaltyState(missed, settings.graceDays);
  const left = pairDaysLeft(pair.startDate, t);
  const expired = pairExpired(pair.startDate, t);
  const recordedToday = recordedOn(records, t);
  const claps = state.claps[t] || 0;

  const banner =
    pstate === "dissolved"
      ? { bg: "#feecec", fg: "#a52a21", text: "ペアが解散しました。再マッチングで再挑戦できます。" }
      : recordedToday
      ? { bg: "#e9f9ee", fg: "#1e7a3d", text: "今日の記録は完了。相棒の写真が解放されました。" }
      : pstate === "last_chance"
      ? { bg: "#feecec", fg: "#a52a21", text: `今日中に記録しないとペア解散（連続${missed}日未記録）` }
      : pstate === "warning"
      ? { bg: "#fff6e5", fg: "#8a5b00", text: `記録が途切れています。あと${settings.graceDays - missed + 1}日で解散。` }
      : null;

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 32 }}>
      {expired && (
        <View style={[s.card, { borderWidth: 2, borderColor: C.accent }]}>
          <Text style={s.h1}>🎉 {pair.name}さんと、3ヶ月完走！</Text>
          <Text style={[s.muted, { marginTop: 6 }]}>
            接近率は{Math.round(rate * 100)}%。更新（¥2,000）か、新しい相棒（¥1,500）を選べます。
          </Text>
        </View>
      )}

      {banner && (
        <View style={[s.banner, { backgroundColor: banner.bg }]}>
          <Text style={{ color: banner.fg, fontWeight: "600" }}>{banner.text}</Text>
        </View>
      )}

      <View style={s.card}>
        <Text style={s.h2}>{state.profile?.nickname ?? "あなた"}さんの30日クール</Text>
        <Text style={s.muted}>目標 -{cycle.targetLoss}kg・{cycleDay}日目</Text>
        <View style={[s.chip, { backgroundColor: left <= 14 ? "#fff6e5" : "rgba(120,120,128,0.08)", marginTop: 8 }]}>
          <Text style={{ color: left <= 14 ? "#8a5b00" : C.sub, fontWeight: "700", fontSize: 12 }}>
            ⏳ このペアと、あと{left}日
          </Text>
        </View>
        <View style={s.deltaRow}>
          <Text style={[s.delta, { color: lost > 0 ? C.ok : C.ink }]}>{lost > 0 ? "-" : ""}{Math.abs(lost).toFixed(1)}</Text>
          <Text style={s.deltaUnit}>kg</Text>
        </View>
        <View style={s.pillRow}>
          <Pill b={String(streak(records, t))} i="連続記録" />
          <Pill b={`${recDays}/${cycleDay}`} i="記録日数" />
          <Pill b={`${Math.round(rate * 100)}%`} i="接近率" />
        </View>
      </View>

      <View style={s.card}>
        <View style={s.pRow}>
          <Text style={{ fontSize: 26 }}>{pair.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "700", fontSize: 15 }}>{pair.name}</Text>
            <Text style={s.small}>今日の記録：{recordedToday ? "公開中" : "あなたの記録待ち"}</Text>
          </View>
        </View>
        {recordedToday ? (
          <Pressable
            style={s.clapBtn}
            onPress={() => set({ claps: { ...state.claps, [t]: claps + 1 } })}
          >
            <Text style={{ color: "#b3401f", fontWeight: "700" }}>
              👏 応援する{claps > 0 ? `（${pair.name}さんに ×${claps}）` : "（無制限）"}
            </Text>
          </Pressable>
        ) : (
          <Text style={[s.small, { textAlign: "center", marginTop: 8 }]}>🔒 自分の記録を上げると相棒の写真が見られます</Text>
        )}
      </View>
    </ScrollView>
  );
}

function Pill({ b, i }: { b: string; i: string }) {
  return (
    <View style={s.pill}>
      <Text style={{ fontSize: 17, fontWeight: "800" }}>{b}</Text>
      <Text style={{ fontSize: 10, color: C.sub, fontWeight: "600" }}>{i}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  card: { backgroundColor: C.card, borderRadius: C.radius, padding: 18, marginBottom: 12 },
  h1: { fontSize: 20, fontWeight: "700" },
  h2: { fontSize: 15, fontWeight: "600", marginBottom: 4 },
  muted: { color: C.sub, fontSize: 13, lineHeight: 20 },
  small: { color: C.sub, fontSize: 11 },
  banner: { borderRadius: 14, padding: 13, marginBottom: 12 },
  chip: { alignSelf: "flex-start", borderRadius: 99, paddingHorizontal: 11, paddingVertical: 4 },
  deltaRow: { flexDirection: "row", alignItems: "flex-end", marginTop: 10 },
  delta: { fontSize: 44, fontWeight: "800", letterSpacing: -1 },
  deltaUnit: { fontSize: 14, color: C.sub, fontWeight: "600", marginBottom: 8, marginLeft: 4 },
  pillRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  pill: { flex: 1, backgroundColor: "rgba(120,120,128,0.08)", borderRadius: 12, padding: 10, alignItems: "center" },
  pRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  clapBtn: { backgroundColor: C.accentSoft, borderRadius: 99, paddingVertical: 11, alignItems: "center", marginTop: 12 },
});
