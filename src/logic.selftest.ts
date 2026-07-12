// 純粋ロジックのユニットテスト。 `npm run test:logic` で実行（node --experimental-strip-types）。
import {
  discountFor, PRICE, PRICE_RENEW, pairDaysLeft, pairExpired,
  streak, consecutiveMissed, progressRate, penaltyState,
  cycleTargetCap, minGoalWeight, daysBetween, addDays,
  type WeightRecord, type Cycle,
} from "./logic.ts";

let pass = 0, fail = 0;
function eq(name: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { pass++; }
  else { fail++; console.error(`✗ ${name}\n   got ${g}\n   want ${w}`); }
}

// 割引（§3-3表と一致）
eq("達成=無料(1500)", discountFor(1.0, PRICE).price, 0);
eq("90%→50off(1500)", discountFor(0.9, PRICE).price, 750);
eq("60%→30off(1500)", discountFor(0.6, PRICE).price, 1050);
eq("30%→10off(1500)", discountFor(0.3, PRICE).price, 1350);
eq("10%→割引なし(1500)", discountFor(0.1, PRICE).price, 1500);
eq("達成=無料(2000)", discountFor(1.0, PRICE_RENEW).price, 0);
eq("90%→50off(2000)", discountFor(0.9, PRICE_RENEW).price, 1000);
eq("60%→30off(2000)", discountFor(0.6, PRICE_RENEW).price, 1400);
eq("30%→10off(2000)", discountFor(0.3, PRICE_RENEW).price, 1800);

// 満了カウントダウン
eq("開始日=あと90日", pairDaysLeft("2026-01-01", "2026-01-01"), 90);
eq("43日目=あと47日", pairDaysLeft("2026-01-01", "2026-02-13"), 47);
eq("90日でexpired", pairExpired("2026-01-01", addDays("2026-01-01", 90)), true);
eq("89日はまだ", pairExpired("2026-01-01", addDays("2026-01-01", 89)), false);

// ストリーク / 未記録
const recs: WeightRecord[] = [
  { date: "2026-03-01", ts: 0, weightKg: 70, retakes: 0 },
  { date: "2026-03-02", ts: 0, weightKg: 69.5, retakes: 0 },
  { date: "2026-03-03", ts: 0, weightKg: 69.4, retakes: 1 },
];
eq("連続3日", streak(recs, "2026-03-03"), 3);
eq("今日未記録でも直近まで数える", streak(recs, "2026-03-04"), 3);
eq("未記録2日", consecutiveMissed(recs, "2026-03-05", "2026-03-01"), 2);
eq("penalty:2日=warning", penaltyState(2), "warning");
eq("penalty:3日=last_chance", penaltyState(3), "last_chance");
eq("penalty:4日=dissolved", penaltyState(4), "dissolved");

// 接近率
const cyc: Cycle = { startDate: "2026-03-01", startWeight: 70, targetLoss: 2, judged: false };
eq("接近率50%", Math.round(progressRate(cyc, 69) * 100), 50);
eq("接近率は0未満にならない", progressRate(cyc, 71), 0);

// 安全ガード
eq("目標上限=体重4%", cycleTargetCap(70), 2.8);
eq("BMI18.5下限(170cm)", minGoalWeight(170), 53.5);

console.log(`\n${fail === 0 ? "✅ ALL PASS" : "❌ FAIL"}  pass=${pass} fail=${fail}`);
if (fail) process.exit(1);
