// PairDiet コアロジック（UI非依存・テスト可能な純粋関数のみ）
// プロトタイプ pairdiet_prototype_v3.html から移植。

export type Sex = "m" | "f";

export interface Profile {
  nickname: string;
  sex: Sex;
  height: number;      // cm
  weight: number;      // kg（スタート値）
  goal: number;        // 長期目標体重 kg
  cycleTarget: number; // 初回30日の目標減量 kg
}

export interface Pair {
  name: string;
  emoji: string;
  reason: string;
  status: "icebreak" | "active" | "dissolved";
  startDate: string;   // YYYY-MM-DD（3ヶ月満了の起点）
  renewMe?: boolean;   // 更新意思（未決はundefined）
}

export interface Cycle {
  startDate: string;
  startWeight: number;
  targetLoss: number;
  judged: boolean;
}

export interface WeightRecord {
  date: string;        // YYYY-MM-DD
  ts: number;
  weightKg: number | null;
  retakes: number;
}

// ---- 定数（要件定義書 §3 と一致）----
export const PRICE = 1500;         // 初回チケット（円）
export const PRICE_RENEW = 2000;   // 更新チケット（円）
export const PAIR_TERM = 90;       // ペア関係の期間（日）＝3ヶ月
export const GRACE_DAYS = 3;       // 未記録の猶予日数
export const CYCLE_DAYS = 30;      // 1クールの日数
export const MAX_LOSS_PCT = 0.04;  // クール目標上限＝体重の4%
export const MIN_BMI = 18.5;       // 長期目標体重の下限

// ---- 日付ヘルパー ----
export function dstr(d: Date): string {
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}
export function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) /
      864e5
  );
}
export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return dstr(d);
}

// ---- BMI / 体重ヘルパー ----
export function bmi(weightKg: number, heightCm: number): number {
  return weightKg / (heightCm / 100) ** 2;
}
export function stdWeight(heightCm: number): number {
  return Math.round(22 * (heightCm / 100) ** 2); // BMI22基準
}
export function minGoalWeight(heightCm: number): number {
  return Math.round(MIN_BMI * (heightCm / 100) ** 2 * 10) / 10;
}
/** クール目標の上限（体重の4%、最低0.5kg） */
export function cycleTargetCap(weightKg: number): number {
  return Math.max(0.5, Math.round(weightKg * MAX_LOSS_PCT * 10) / 10);
}

// ---- 割引（要件定義書 §3-3：率で定義し、ベース価格に適用）----
export interface Discount {
  rate: number;   // 0, .1, .3, .5, 1
  price: number;  // 支払額（円、¥50丸め）
  base: number;
  label: string;
}
export function discountFor(approachRate: number, base: number = PRICE): Discount {
  let rate: number;
  if (approachRate >= 1) rate = 1;
  else if (approachRate >= 0.8) rate = 0.5;
  else if (approachRate >= 0.5) rate = 0.3;
  else if (approachRate >= 0.2) rate = 0.1;
  else rate = 0;
  const price = Math.round((base * (1 - rate)) / 50) * 50;
  const label =
    rate >= 1
      ? "無料"
      : rate > 0
      ? `${Math.round(rate * 100)}%OFF（¥${price.toLocaleString()}）`
      : `割引なし（¥${base.toLocaleString()}）`;
  return { rate, price, base, label };
}

// ---- 記録から導くステータス ----
export function recordedOn(records: WeightRecord[], dateStr: string): boolean {
  return records.some((r) => r.date === dateStr);
}
/** 連続記録日数（today基準） */
export function streak(records: WeightRecord[], today: string): number {
  let c = 0;
  let d = new Date(today + "T00:00:00");
  if (!recordedOn(records, dstr(d))) d.setDate(d.getDate() - 1);
  while (recordedOn(records, dstr(d))) {
    c++;
    d.setDate(d.getDate() - 1);
  }
  return c;
}
/** 連続未記録日数（cycle開始より前は数えない） */
export function consecutiveMissed(
  records: WeightRecord[],
  today: string,
  cycleStart?: string
): number {
  let c = 0;
  let d = new Date(today + "T00:00:00");
  for (let i = 0; i < 400; i++) {
    const x = dstr(d);
    if (recordedOn(records, x)) break;
    if (cycleStart && x < cycleStart) break;
    c++;
    d.setDate(d.getDate() - 1);
  }
  return c;
}
export function lastWeight(records: WeightRecord[], fallback: number): number {
  const w = [...records].reverse().find((r) => r.weightKg != null);
  return w && w.weightKg != null ? w.weightKg : fallback;
}
/** 接近率＝max(0, (開始体重-現体重)/目標減量)、上限150% */
export function progressRate(cycle: Cycle, currentWeight: number): number {
  const lost = cycle.startWeight - currentWeight;
  return Math.max(0, Math.min(1.5, lost / cycle.targetLoss));
}

// ---- ペア満了（3ヶ月）----
export function pairDaysLeft(pairStart: string, today: string): number {
  return Math.max(0, PAIR_TERM - daysBetween(pairStart, today));
}
export function pairExpired(pairStart: string, today: string): boolean {
  return daysBetween(pairStart, today) >= PAIR_TERM;
}

// ---- ペナルティ状態機械（§6-3）----
export type PenaltyState = "active" | "warning" | "last_chance" | "dissolved";
export function penaltyState(missed: number, grace: number = GRACE_DAYS): PenaltyState {
  if (missed > grace) return "dissolved";
  if (missed === grace) return "last_chance";
  if (missed === grace - 1) return "warning";
  return "active";
}
