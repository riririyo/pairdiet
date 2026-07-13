import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
  Animated,
  Easing,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useStore } from "@/store";
import { OC } from "@/theme";
import { bmi, minGoalWeight, cycleTargetCap, type Sex } from "@/logic";

// 確定モック（pairdiet_onboarding_full.html）の14ステップをRNへ移植。
// 0:認証 1:悩み 2:仲間データ 3:性別 4:身長 5:体重 6:ご褒美 7:目標
// 8:安心 9:カメラ 10:¥1500 11:5倍 12:約束 13:完了
const LAST = 13;

const PAIN_OPTS: [string, string, string][] = [
  ["⚖️", "毎日、体重計に乗る習慣を", "毎日の習慣"],
  ["🥲", "一人だと、いつも続かない", "一人だと続かない"],
  ["🙈", "知り合いに知られたくない", "誰にも知られず"],
  ["🎯", "今度こそ、結果を出したい", "今度こそ結果を"],
];

const GREEN_GRAD = ["#12b76a", "#3ddc91"];

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, set } = useStore();

  const [idx, setIdx] = useState(0);
  const [age18, setAge18] = useState(false);
  const [ageError, setAgeError] = useState(false);
  const [pains, setPains] = useState<string[]>([]);
  const [sex, setSex] = useState<Sex | null>(null);
  const [height, setHeight] = useState(170);
  const [weight, setWeight] = useState(70);
  const [goal, setGoal] = useState(63);
  const [rulesOpen, setRulesOpen] = useState(false);

  // 目標ステップに入ったらBMI18.5ガード内へクランプ
  useEffect(() => {
    if (idx !== 7) return;
    const mn = minGoalWeight(height);
    const mx = Math.round((weight - 0.5) * 10) / 10;
    setGoal((g) => {
      const base = g >= weight ? Math.max(mn, Math.round((weight - 6) * 10) / 10) : g;
      return Math.min(mx, Math.max(mn, base));
    });
  }, [idx, height, weight]);

  const next = () => {
    if (idx < LAST) setIdx(idx + 1);
    else complete();
  };
  const back = () => {
    if (idx > 0) setIdx(idx - 1);
  };

  const complete = () => {
    const cap = cycleTargetCap(weight);
    set({
      onboarded: true,
      profile: {
        nickname: state.profile?.nickname ?? "あなた",
        sex: sex ?? "f",
        height,
        weight,
        goal,
        cycleTarget: Math.min(2, cap),
      },
    });
    router.replace("/");
  };

  const tryAuth = () => {
    if (!age18) {
      setAgeError(true);
      return;
    }
    next();
  };

  const togPain = (key: string) =>
    setPains((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));

  const showChrome = idx !== 0; // 認証画面はプログレス/戻るを隠す

  return (
    <View style={[d.root, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 18 }]}>
      {showChrome && (
        <View style={d.top}>
          <Pressable onPress={back} hitSlop={12} style={d.backBtn}>
            <Text style={d.backChevron}>‹</Text>
          </Pressable>
          <View style={d.prog}>
            {Array.from({ length: LAST }).map((_, i) => (
              <View key={i} style={[d.progSeg, i + 1 <= idx && d.progSegDone]} />
            ))}
          </View>
        </View>
      )}

      <View style={d.body}>{renderStep()}</View>

      <Modal transparent visible={rulesOpen} animationType="fade" onRequestClose={() => setRulesOpen(false)}>
        <View style={d.overlay}>
          <View style={d.sheet}>
            <Text style={d.emoji}>⚖️</Text>
            <Text style={[d.h1, { textAlign: "center", fontSize: 23 }]}>もし途中でやめたら？</Text>
            <View style={d.card2}>
              <Text style={d.card2Line}>🔒 3日記録が止まると<Text style={d.bold}>ペア解散</Text>。</Text>
              <Text style={d.card2Line}>💪 続けたあなたには<Text style={d.bold}>チケットが残る</Text>。</Text>
              <Text style={d.card2Line}>🎫 目標に近づいた分だけ<Text style={d.bold}>次回を割引</Text>。何度でも再挑戦できる。</Text>
              <Text style={d.card2Line}>🤝 ふたりで払ったから、<Text style={d.bold}>ふたりでやめない</Text>。</Text>
            </View>
            <Cta label="閉じる" onPress={() => setRulesOpen(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );

  function renderStep() {
    switch (idx) {
      // 0: 認証（Apple / Google）＋18歳確認
      case 0:
        return (
          <>
            <View style={d.badge}>
              <Text style={d.badgeText}>🌿 続けた人、66% 🌿</Text>
            </View>
            <View style={d.hero}>
              <LinearGradient
                colors={["#d9d3ff", "#7b6ff0", "#4a3fb0"]}
                start={{ x: 0.2, y: 0.1 }}
                end={{ x: 0.9, y: 1 }}
                style={d.hcard}
              >
                <View style={d.tagTop}>
                  <Text style={d.tagTextAccent}>👏 今日も記録</Text>
                </View>
                <View style={d.avp}>
                  <Avatar />
                  <Avatar dark />
                  <View style={d.qm}>
                    <Text style={{ color: OC.accent, fontWeight: "800", fontSize: 14 }}>?</Text>
                  </View>
                </View>
                <View style={d.tagBottom}>
                  <Text style={d.tagText}>-2.4kg</Text>
                </View>
              </LinearGradient>
            </View>
            <Text style={d.h1}>知らない一人と、{"\n"}ダイエット。</Text>
            <Text style={d.sub}>痩せるまで、逃げられない相棒ができる。顔も名前も出さずに、毎日つづく。</Text>

            <Pressable style={d.check} onPress={() => { setAge18((v) => !v); setAgeError(false); }}>
              <View style={[d.checkBox, age18 && d.checkBoxOn]}>
                {age18 && <Text style={d.checkMark}>✓</Text>}
              </View>
              <Text style={[d.checkLabel, ageError && { color: "#e24b4a" }]}>
                18歳以上です（PairDietは18歳以上限定）
              </Text>
            </Pressable>

            <Pressable style={[d.btn, d.apple]} onPress={tryAuth}>
              <Text style={[d.btnText, { color: "#fff" }]}> Appleで続ける</Text>
            </Pressable>
            <Pressable style={[d.btn, d.google]} onPress={tryAuth}>
              <Text style={[d.btnText, { color: "#1f2430" }]}>Googleで続ける</Text>
            </Pressable>
            <Text style={d.fine}>続けると、利用規約とプライバシーポリシーに同意したことになります。</Text>
          </>
        );

      // 1: 悩み選択（複数選択＝宣言）
      case 1:
        return (
          <>
            <Text style={d.h1}>PairDietで、{"\n"}何を変えたい？</Text>
            <Text style={d.sub}>この悩みを、最後まで覚えておきます。</Text>
            <Text style={d.multi}>複数選択OK</Text>
            <View style={d.opts}>
              {PAIN_OPTS.map(([ic, label, key]) => {
                const sel = pains.includes(key);
                return (
                  <Pressable key={key} onPress={() => togPain(key)} style={[d.opt, sel && d.optSel]}>
                    <Text style={d.optIc}>{ic}</Text>
                    <Text style={[d.optLabel, sel && { color: OC.selInk }]}>{label}</Text>
                    <Text style={[d.optCk, sel && { color: OC.accent }]}>✓</Text>
                  </Pressable>
                );
              })}
            </View>
            <Cta label="続ける" onPress={next} disabled={pains.length === 0} />
          </>
        );

      // 2: 仲間データ（24% vs 66%）
      case 2:
        return (
          <>
            <Text style={d.h1}>意志の力の問題じゃ、{"\n"}なかった。</Text>
            <Text style={d.sub}>続く人は、相棒がいただけ。</Text>
            <View style={d.bars}>
              <BarRow label="ひとりで" labelColor={OC.sub} value="24%" valueColor={OC.sub} pct={24} color="#c7ccd6" />
              <BarRow label="相棒と" labelColor={OC.ok} value="66%" valueColor={OC.ok} pct={66} colors={GREEN_GRAD} />
            </View>
            <Text style={d.sub}>
              仲間と挑んだ人は半年後も<Text style={d.bold}>66%</Text>が成果をキープ。ひとりでは<Text style={d.bold}>24%</Text>。
            </Text>
            <Text style={d.src}>出典：Wing &amp; Jeffery (1999)</Text>
            <Cta label="続ける" onPress={next} />
          </>
        );

      // 3: 性別
      case 3:
        return (
          <>
            <Text style={d.h1}>あなたの性別は？</Text>
            <Text style={d.sub}>相棒は同性同士。体重の話は、同性がいちばん話しやすい。</Text>
            <View style={d.seg}>
              <Pressable style={[d.segO, sex === "f" && d.segOSel]} onPress={() => setSex("f")}>
                <Text style={[d.segText, sex === "f" && { color: OC.selInk }]}>女性</Text>
              </Pressable>
              <Pressable style={[d.segO, sex === "m" && d.segOSel]} onPress={() => setSex("m")}>
                <Text style={[d.segText, sex === "m" && { color: OC.selInk }]}>男性</Text>
              </Pressable>
            </View>
            <Cta label="続ける" onPress={next} disabled={sex === null} />
          </>
        );

      // 4: 身長
      case 4:
        return (
          <>
            <Text style={d.h1}>身長は？</Text>
            <Text style={d.sub}>あなたに合ったデータを見せるために使います。</Text>
            <View style={d.valRow}>
              <Text style={d.valNum}>{height.toFixed(1)}</Text>
              <Text style={d.valUnit}> cm</Text>
            </View>
            <Drum min={130} max={200} value={height} onChange={setHeight} />
            <Cta label="続ける" onPress={next} />
          </>
        );

      // 5: 体重（体重計＋ドラム）
      case 5:
        return (
          <>
            <Text style={d.h1}>いまの体重は？</Text>
            <Text style={d.sub}>これから減る数字の“スタート値”。体重計に乗る感覚で、くるくる回して。</Text>
            <View style={d.scaleWrap}>
              <RealScale value={weight} />
            </View>
            <Drum min={35} max={150} value={weight} onChange={setWeight} />
            <Cta label="続ける" onPress={next} />
          </>
        );

      // 6: ご褒美データ（5%減）
      case 6: {
        const w5 = Math.round(weight * 0.05 * 10) / 10;
        return (
          <>
            <Text style={d.rewardLead}>{weight}kgのあなたへ</Text>
            <View style={d.megaRow}>
              <Text style={d.mega}>-{w5}</Text>
              <Text style={d.megaUnit}>kg</Text>
            </View>
            <Text style={[d.sub, { textAlign: "center", marginTop: -2 }]}>たった5%で、体は変わり始める。</Text>
            <View style={[d.bars, { marginTop: 26 }]}>
              <BarRow label="糖尿病リスク（今）" labelColor={OC.sub} value="100%" valueColor={OC.sub} pct={100} color="#c7ccd6" />
              <BarRow label={`-${w5}kg後`} labelColor={OC.ok} value="42%" valueColor={OC.ok} pct={42} color={OC.ok} />
            </View>
            <Text style={d.src}>米国DPP研究（高リスク群）の引用。個人差があり、効果を保証しません。</Text>
            <Cta label="続ける" onPress={next} />
          </>
        );
      }

      // 7: 目標体重（BMI18.5ガード）
      case 7: {
        const mn = minGoalWeight(height);
        const mx = Math.max(mn, Math.round((weight - 0.5) * 10) / 10);
        const b1 = bmi(weight, height).toFixed(1);
        const b2 = bmi(goal, height).toFixed(1);
        return (
          <>
            <Text style={d.h1}>最終目標は？</Text>
            <Text style={d.sub}>
              未来のあなたが乗る、体重計。<Text style={d.bold}>BMI18.5未満は選べません。</Text>
            </Text>
            <View style={d.scaleWrap}>
              <FutureScale value={goal} />
            </View>
            <Text style={d.good}>達成でBMI {b1} → {b2}。十分届く距離です。</Text>
            <Drum min={mn} max={mx} value={goal} onChange={setGoal} />
            <Cta label="続ける" onPress={next} />
          </>
        );
      }

      // 8: 安心（相棒は1人）
      case 8:
        return (
          <InfoStep icon="💬" title={"相棒は、あなたと\n同じ体重のひとり"} onNext={next}>
            あなたの体重を見るのは、同じ体重帯の<Text style={d.bold}>たった1人</Text>だけ。顔も本名も出ません。
          </InfoStep>
        );

      // 9: カメラ説明
      case 9:
        return (
          <InfoStep icon="📷" title={"好きな時間に、\n体重計の数字を撮影"} onNext={next}>
            アプリ内カメラでその場撮影。<Text style={d.bold}>数字以外が写っても</Text>、送る前にスタンプで隠せます。
          </InfoStep>
        );

      // 10: ¥1,500チケット（悩みをechoで回収）
      case 10: {
        const items = pains.length ? pains : ["続けたい"];
        return (
          <>
            <Text style={d.h1}>その悩みを消すのは、{"\n"}意志じゃなく仕組み。</Text>
            <View style={d.echo}>
              <Text style={d.echoLabel}>あなたが選んだ悩み</Text>
              <View style={d.chips}>
                {items.map((k) => (
                  <View key={k} style={d.chip}>
                    <Text style={d.chipText}>{k}</Text>
                  </View>
                ))}
              </View>
            </View>
            <Text style={[d.sub, { color: OC.ink }]}>
              ふたりとも <Text style={d.bold}>¥1,500</Text> 払って組むから、途中で<Text style={d.bold}>逃げられない</Text>。それが“続く”を作る。
            </Text>
            <View style={d.priceRow}>
              <Text style={d.price}>¥1,500</Text>
              <Text style={d.priceSmall}> / 3ヶ月・おひとり</Text>
            </View>
            <Text style={d.src}>あなたが¥1,500、相棒も¥1,500。それぞれ自分のぶんを払います。</Text>
            <View style={d.choco}>
              <Text style={d.chocoText}>🍫 1日あたり 約¥17。小さなチョコ1個より安い値段で、痩せるまで逃げない相棒がつく。</Text>
            </View>
            <Pressable style={d.warnlink} onPress={() => setRulesOpen(true)}>
              <Text style={d.warnlinkText}>⚠️ もし途中でやめたら？</Text>
            </Pressable>
            <Cta label="続ける" onPress={next} />
          </>
        );
      }

      // 11: サンクコスト5倍
      case 11:
        return (
          <>
            <Text style={d.h1}>払った人ほど、{"\n"}続く。</Text>
            <Text style={d.sub}>お金を賭けて他人と約束した人の達成率は、そうでない人の約5倍。</Text>
            <View style={d.bars}>
              <BarRow label="賭けた人" labelColor={OC.ok} value="5倍" valueColor={OC.ok} pct={100} colors={GREEN_GRAD} />
              <BarRow label="賭けない人" labelColor={OC.sub} value="1倍" valueColor={OC.sub} pct={20} color="#c7ccd6" />
            </View>
            <Text style={d.src}>コミットメント契約研究の引用。効果を保証するものではありません。</Text>
            <Cta label="続ける" onPress={next} />
          </>
        );

      // 12: 大事な約束（健康免責）
      case 12:
        return (
          <>
            <Text style={d.emoji}>🌱</Text>
            <Text style={[d.h1, { textAlign: "center" }]}>大事な、約束。</Text>
            <View style={d.card2}>
              <Text style={d.card2Line}>🚫 PairDietは<Text style={d.bold}>食事・運動の指導はしません</Text>。担うのは「続ける力」だけ（仲間の目＋払ったお金）。</Text>
              <Text style={d.card2Line}>📱 ダイエットの<Text style={d.bold}>やり方は専門アプリと併用</Text>を（あすけん / Noom など）。</Text>
              <Text style={d.card2Line}>🫂 <Text style={d.bold}>無理はしないで</Text>。体調が悪い日は休んでOK。つらいときは専門家に相談を。</Text>
              <Text style={d.card2Line}>⚖️ 裁くのは“痩せたか”じゃなく<Text style={d.bold}>“今日記録できたか”</Text>。焦らなくていい。</Text>
            </View>
            <Cta label="わかった" onPress={next} />
          </>
        );

      // 13: 完了（マッチング権購入へ）
      case 13:
        return (
          <>
            <Text style={d.emoji}>🤝</Text>
            <Text style={[d.h1, { textAlign: "center" }]}>準備できた。{"\n"}相棒を探そう。</Text>
            <Text style={[d.sub, { textAlign: "center" }]}>
              条件の近い相手とマッチングします。{"\n"}見つかったら、通知します。
            </Text>
            <Cta label="¥1,500で相棒を探す" onPress={next} />
            <Text style={d.fine}>チケットは成立まで有効。無駄になりません。</Text>
          </>
        );

      default:
        return null;
    }
  }
}

/* ---- 再利用コンポーネント ---- */

function Cta({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={disabled ? undefined : onPress} style={[d.btn, d.cta, disabled && d.ctaDisabled]}>
      <Text style={[d.btnText, { color: "#fff" }, disabled && { color: OC.disabledInk }]}>{label}</Text>
    </Pressable>
  );
}

function InfoStep({
  icon,
  title,
  children,
  onNext,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
  onNext: () => void;
}) {
  return (
    <>
      <Text style={d.emoji}>{icon}</Text>
      <Text style={[d.h1, { textAlign: "center" }]}>{title}</Text>
      <Text style={[d.sub, { textAlign: "center" }]}>{children}</Text>
      <Cta label="続ける" onPress={onNext} />
    </>
  );
}

// 顔を出さない相棒＝匿名シルエット（頭＋肩）
function Avatar({ dark }: { dark?: boolean }) {
  const c = dark ? "#fff" : OC.accent2;
  return (
    <View style={[d.avc, dark ? d.avcDark : d.avcLight]}>
      <View style={[d.avHead, { backgroundColor: c }]} />
      <View style={[d.avBody, { backgroundColor: c }]} />
    </View>
  );
}

function BarRow({
  label,
  labelColor,
  value,
  valueColor,
  pct,
  color,
  colors,
}: {
  label: string;
  labelColor: string;
  value: string;
  valueColor: string;
  pct: number;
  color?: string;
  colors?: string[];
}) {
  return (
    <View>
      <View style={d.bl}>
        <Text style={[d.blLabel, { color: labelColor }]}>{label}</Text>
        <Text style={[d.blValue, { color: valueColor }]}>{value}</Text>
      </View>
      <AnimatedBar pct={pct} color={color} colors={colors} />
    </View>
  );
}

function AnimatedBar({ pct, color, colors }: { pct: number; color?: string; colors?: string[] }) {
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(w, {
      toValue: pct,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [w, pct]);
  const width = w.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] });
  return (
    <View style={d.btk}>
      <Animated.View style={{ width, height: "100%" }}>
        {colors ? (
          <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={d.barFill} />
        ) : (
          <View style={[d.barFill, { backgroundColor: color ?? OC.ok }]} />
        )}
      </Animated.View>
    </View>
  );
}

const ITEM = 40;

function Drum({
  min,
  max,
  value,
  onChange,
  step = 0.5,
}: {
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  const items = useMemo(() => {
    const arr: number[] = [];
    for (let v = min; v <= max + 1e-6; v = Math.round((v + step) * 10) / 10) {
      arr.push(Math.round(v * 10) / 10);
    }
    return arr;
  }, [min, max, step]);

  const ref = useRef<ScrollView>(null);
  const lastIdx = useRef(-1);
  const initIdx = Math.max(0, Math.min(items.length - 1, Math.round((value - min) / step)));

  useEffect(() => {
    const id = setTimeout(() => ref.current?.scrollTo({ y: initIdx * ITEM, animated: false }), 0);
    return () => clearTimeout(id);
    // マウント時のみ初期位置へ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  const handle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    let i = Math.round(e.nativeEvent.contentOffset.y / ITEM);
    i = Math.max(0, Math.min(items.length - 1, i));
    if (i !== lastIdx.current) {
      lastIdx.current = i;
      onChange(items[i]);
    }
  };

  return (
    <View style={d.drumWrap}>
      <View style={d.band} />
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={handle}
        onMomentumScrollEnd={handle}
        contentContainerStyle={{ paddingVertical: 60 }}
      >
        {items.map((v, k) => (
          <View key={k} style={d.wiWrap}>
            <Text style={[d.wi, Math.abs(v - value) < 1e-6 && d.wiMid]}>{v.toFixed(1)}</Text>
          </View>
        ))}
      </ScrollView>
      <LinearGradient colors={["#ffffff", "rgba(255,255,255,0)"]} style={d.fadeTop} pointerEvents="none" />
      <LinearGradient colors={["rgba(255,255,255,0)", "#ffffff"]} style={d.fadeBottom} pointerEvents="none" />
    </View>
  );
}

// 体重計（現在）＝光沢のあるアナログ筐体＋緑発光ディスプレイ
function RealScale({ value }: { value: number }) {
  return (
    <LinearGradient colors={["#fdfdff", "#e9edf3"]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={d.scaleReal}>
      <LinearGradient
        colors={["rgba(255,255,255,0.85)", "rgba(255,255,255,0)"]}
        style={d.scaleGloss}
        pointerEvents="none"
      />
      <View style={d.dispDark}>
        <Text style={d.dispGreen}>
          {value.toFixed(1)}
          <Text style={d.dispGreenUnit}> kg</Text>
        </Text>
      </View>
      <View style={d.feet}>
        <View style={d.foot} />
        <View style={d.foot} />
      </View>
    </LinearGradient>
  );
}

// 体重計（目標）＝暗い筐体＋回転するグラデリング（ネイティブドライバ）
function FutureScale({ value }: { value: number }) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 8000, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  return (
    <LinearGradient colors={["#232d4d", "#111528"]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={d.scaleFuture}>
      <Animated.View style={[d.ring, { transform: [{ rotate }] }]}>
        <LinearGradient
          colors={["#ff5a3c", "#ff8a4b", "#6a8bff", "#ff5a3c"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={d.ringGrad}
        />
      </Animated.View>
      <View style={d.ringMask} />
      <View style={d.futureDisp}>
        <Text style={d.futureNum}>{value.toFixed(1)}</Text>
        <Text style={d.futureUnit}>KG</Text>
      </View>
    </LinearGradient>
  );
}

/* ---- スタイル ---- */

const d = StyleSheet.create({
  root: { flex: 1, backgroundColor: OC.bg, paddingHorizontal: 26 },
  top: { flexDirection: "row", alignItems: "center", gap: 10, height: 20, marginBottom: 20 },
  backBtn: { width: 20 },
  backChevron: { fontSize: 26, color: "#c3c8d2", lineHeight: 26 },
  prog: { flex: 1, flexDirection: "row", gap: 4 },
  progSeg: { flex: 1, height: 5, borderRadius: 3, backgroundColor: "#eceef3" },
  progSegDone: { backgroundColor: OC.accent },
  body: { flex: 1 },

  h1: { fontSize: 27, fontWeight: "800", letterSpacing: -0.6, lineHeight: 35, color: OC.ink },
  sub: { fontSize: 14, color: OC.sub, marginTop: 9, lineHeight: 22 },
  multi: { fontSize: 12, color: OC.faint, fontWeight: "700", marginTop: 16 },
  good: { color: OC.ok, fontSize: 12.5, fontWeight: "700", marginTop: 8, minHeight: 16 },
  src: { fontSize: 11, color: OC.faint, marginTop: 6, lineHeight: 16 },
  fine: { fontSize: 11, color: OC.faint, textAlign: "center", marginTop: 12, lineHeight: 16 },
  bold: { color: OC.ink, fontWeight: "700" },
  emoji: { fontSize: 50, textAlign: "center", marginTop: 8, marginBottom: 4 },

  // ボタン
  btn: {
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 12,
  },
  btnText: { fontSize: 16, fontWeight: "800" },
  cta: { backgroundColor: OC.cta, marginTop: "auto" },
  ctaDisabled: { backgroundColor: OC.disabled },
  apple: { backgroundColor: "#0d0f14", marginTop: 14 },
  google: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: OC.line },

  // 18歳チェック
  check: { flexDirection: "row", alignItems: "flex-start", gap: 9, marginTop: 16 },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.6,
    borderColor: "#c3c8d2",
    alignItems: "center",
    justifyContent: "center",
  },
  checkBoxOn: { backgroundColor: OC.accent, borderColor: OC.accent },
  checkMark: { color: "#fff", fontSize: 14, fontWeight: "800" },
  checkLabel: { flex: 1, fontSize: 12.5, color: OC.ink, fontWeight: "600", lineHeight: 19 },

  // ヒーロー（認証）
  badge: { alignItems: "center", marginBottom: 4 },
  badgeText: { fontSize: 17, fontWeight: "800", color: OC.ink },
  hero: { flex: 1, alignItems: "center", justifyContent: "center" },
  hcard: {
    width: 200,
    height: 200,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  avp: { flexDirection: "row", alignItems: "flex-end" },
  avc: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  avcLight: { backgroundColor: "#fff" },
  avcDark: { backgroundColor: "#0d0f14", marginLeft: -20 },
  avHead: { width: 28, height: 28, borderRadius: 14, marginBottom: 3 },
  avBody: { width: 50, height: 30, borderTopLeftRadius: 25, borderTopRightRadius: 25 },
  qm: {
    position: "absolute",
    top: -2,
    left: "50%",
    marginLeft: -15,
    backgroundColor: "#fff",
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  tagTop: { position: "absolute", top: 12, left: 10, backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  tagBottom: { position: "absolute", bottom: 22, right: 8, backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  tagText: { fontSize: 11, fontWeight: "700", color: OC.ink },
  tagTextAccent: { fontSize: 11, fontWeight: "700", color: OC.accent },

  // オプション（悩み）
  opts: { marginTop: 20, gap: 10 },
  opt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 15,
    backgroundColor: OC.card,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  optSel: { backgroundColor: OC.soft, borderColor: OC.accent },
  optIc: { width: 22, textAlign: "center", fontSize: 17 },
  optLabel: { flex: 1, fontSize: 14.5, fontWeight: "600", color: OC.ink },
  optCk: { color: "transparent", fontWeight: "800", fontSize: 15 },

  // 性別セグメント
  seg: { flexDirection: "row", gap: 10, marginTop: 24 },
  segO: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    backgroundColor: OC.card,
    borderWidth: 1.5,
    borderColor: "transparent",
    alignItems: "center",
  },
  segOSel: { backgroundColor: OC.soft, borderColor: OC.accent },
  segText: { fontWeight: "700", fontSize: 16, color: OC.ink },

  // 大きな数値（身長）
  valRow: { flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 26, marginBottom: 6 },
  valNum: { fontSize: 46, fontWeight: "800", letterSpacing: -1, color: OC.ink },
  valUnit: { fontSize: 16, color: OC.sub, fontWeight: "600", marginBottom: 8 },

  // バー
  bars: { marginVertical: 26, gap: 16 },
  bl: { flexDirection: "row", justifyContent: "space-between", marginBottom: 7 },
  blLabel: { fontSize: 13, fontWeight: "700" },
  blValue: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  btk: { height: 15, backgroundColor: "#eef0f4", borderRadius: 10, overflow: "hidden" },
  barFill: { flex: 1, borderRadius: 10 },

  // ご褒美
  rewardLead: { color: OC.accent, fontWeight: "800", fontSize: 13 },
  megaRow: { flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginVertical: 10 },
  mega: { fontSize: 52, fontWeight: "800", letterSpacing: -2, color: OC.ok },
  megaUnit: { fontSize: 22, fontWeight: "800", color: OC.ok, marginBottom: 6 },

  // ¥1,500
  echo: { backgroundColor: OC.card, borderRadius: 16, padding: 15, marginVertical: 14 },
  echoLabel: { fontSize: 11, color: OC.sub, fontWeight: "700", marginBottom: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: OC.accent, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { color: OC.selInk, fontSize: 12, fontWeight: "700" },
  priceRow: { flexDirection: "row", alignItems: "flex-end", marginTop: 8 },
  price: { fontSize: 42, fontWeight: "800", letterSpacing: -1.5, color: OC.ink },
  priceSmall: { fontSize: 14, color: OC.sub, fontWeight: "600", marginBottom: 6 },
  choco: { backgroundColor: OC.soft, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 11, marginVertical: 12 },
  chocoText: { color: OC.selInk, fontSize: 12.5, fontWeight: "600", lineHeight: 19 },
  warnlink: { alignSelf: "flex-start", backgroundColor: "#f2f3f6", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9 },
  warnlinkText: { color: OC.sub, fontSize: 12.5, fontWeight: "700" },

  // カード（約束・ルール）
  card2: { backgroundColor: OC.card, borderRadius: 16, padding: 16, marginTop: 16, gap: 10 },
  card2Line: { fontSize: 13, color: OC.sub, lineHeight: 20 },

  // ルールモーダル
  overlay: { flex: 1, backgroundColor: "rgba(13,15,20,0.55)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 24, paddingTop: 26, paddingBottom: 40 },

  // ドラム
  drumWrap: { height: 160, marginTop: 2, justifyContent: "center", overflow: "hidden" },
  band: { position: "absolute", top: 60, left: 14, right: 14, height: 40, borderRadius: 12, backgroundColor: OC.soft },
  wiWrap: { height: ITEM, alignItems: "center", justifyContent: "center" },
  wi: { fontSize: 22, fontWeight: "700", color: OC.sub },
  wiMid: { color: OC.accent, fontSize: 26, fontWeight: "800" },
  fadeTop: { position: "absolute", top: 0, left: 0, right: 0, height: 56 },
  fadeBottom: { position: "absolute", bottom: 0, left: 0, right: 0, height: 56 },

  // 体重計（現在）
  scaleWrap: { alignItems: "center", justifyContent: "center", minHeight: 200 },
  scaleReal: {
    width: 184,
    height: 184,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  scaleGloss: { position: "absolute", top: 14, left: 14, right: 14, height: 54, borderRadius: 18 },
  dispDark: { backgroundColor: "#0e1512", borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12 },
  dispGreen: {
    fontFamily: "Courier New",
    fontSize: 40,
    fontWeight: "800",
    color: "#6dfca0",
    letterSpacing: 2,
    textShadowColor: "rgba(80,252,150,0.55)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  dispGreenUnit: { color: "#3f9c63", fontSize: 14, fontWeight: "700" },
  feet: { position: "absolute", bottom: -8, left: 28, right: 28, flexDirection: "row", justifyContent: "space-between" },
  foot: { width: 34, height: 8, backgroundColor: "#c3c9d4", borderBottomLeftRadius: 7, borderBottomRightRadius: 7 },

  // 体重計（目標・未来）
  scaleFuture: {
    width: 184,
    height: 184,
    borderRadius: 92,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  ring: { position: "absolute", top: 10, left: 10, right: 10, bottom: 10, borderRadius: 82, overflow: "hidden" },
  ringGrad: { flex: 1 },
  ringMask: { position: "absolute", top: 20, left: 20, right: 20, bottom: 20, borderRadius: 72, backgroundColor: "#141830" },
  futureDisp: { alignItems: "center" },
  futureNum: {
    fontFamily: "Courier New",
    fontSize: 44,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 2,
    textShadowColor: "rgba(255,120,90,0.85)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  futureUnit: { color: "#9db0e0", fontSize: 12, fontWeight: "700", letterSpacing: 3, marginTop: 2 },
});
