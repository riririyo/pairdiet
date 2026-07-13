// ペナルティ状態機械＋判定（純粋関数）— 要件定義書 §6-3 / §3-3
export const GRACE = 3;
export type PState = "active" | "warning" | "last_chance" | "dissolved";
export function penaltyState(missed: number, grace = GRACE): PState {
  if (missed > grace) return "dissolved";
  if (missed === grace) return "last_chance";
  if (missed === grace - 1) return "warning";
  return "active";
}
export function progressRate(startKg: number, currentKg: number, targetLossKg: number): number {
  return Math.max(0, Math.min(1.5, (startKg - currentKg) / targetLossKg));
}
// 接近率→割引率をベース価格に適用（¥50丸め）。base=1500(新規) or 2000(更新)
export function discountFor(rate: number, base: number) {
  const r = rate >= 1 ? 1 : rate >= 0.8 ? 0.5 : rate >= 0.5 ? 0.3 : rate >= 0.2 ? 0.1 : 0;
  return { rate: r, price: Math.round((base * (1 - r)) / 50) * 50 };
}
