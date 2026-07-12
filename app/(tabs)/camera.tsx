import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "@/theme";

// TODO: expo-camera でBeReal式の専用カメラを移植
//  - フルスクリーン黒背景・編集不可・アプリ内カメラのみ
//  - 撮影ガイド枠「体重計の表示部だけを枠に収めて」
//  - 撮影後スタンプ（🙈）で写り込みを隠す → 画像に焼き込み
//  - 相棒ブラー：自分が上げるまで相手の記録はモザイク
//  - 練習撮影モード（マッチング待機中・記録に残さない）
export default function Camera() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.screen, { paddingTop: insets.top + 40 }]}>
      <Text style={{ fontSize: 40 }}>📷</Text>
      <Text style={s.h}>専用カメラ（未実装）</Text>
      <Text style={s.p}>expo-camera で移植予定。体重計だけを撮り、スタンプで隠して10秒で記録する画面。</Text>
    </View>
  );
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#000", alignItems: "center", padding: 24 },
  h: { color: "#fff", fontSize: 20, fontWeight: "700", marginTop: 12 },
  p: { color: "#aab", fontSize: 13, textAlign: "center", marginTop: 8, lineHeight: 20 },
});
