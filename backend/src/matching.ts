// マッチングアルゴリズム（純粋関数・テスト対象）— 要件定義書 §6-2
export type Sex = "m" | "f";
export interface QUser {
  id: string; sex: Sex; over18: boolean;
  heightCm: number; weightKg: number; cycleTargetKg: number;
  enqueuedAt: number;      // epoch ms
  blocked: string[];       // 通報でブロックした相手ID（§6-6 ブロック連動）
}
const H48 = 48 * 3600e3;
// 待つほど体重差の許容を +5kg（48hごと）、上限20kg
export function weightTolerance(waitMs: number): number {
  return Math.min(20, 10 + Math.floor(waitMs / H48) * 5);
}
export function eligible(a: QUser, b: QUser, now: number): boolean {
  if (a.id === b.id) return false;
  if (a.sex !== b.sex) return false;             // 同性のみ（出会い系規制対策）
  if (!a.over18 || !b.over18) return false;       // 双方18歳以上
  if (a.blocked.includes(b.id) || b.blocked.includes(a.id)) return false; // ブロック連動
  const tol = Math.max(weightTolerance(now - a.enqueuedAt), weightTolerance(now - b.enqueuedAt));
  return Math.abs(a.weightKg - b.weightKg) <= tol;
}
// 小さいほど良いスコア: 体重差 > 身長差 > 目標差 > 待ち時間（古いほど優先）
export function score(a: QUser, b: QUser): number {
  const wd = Math.abs(a.weightKg - b.weightKg);
  const hd = Math.abs(a.heightCm - b.heightCm);
  const td = Math.abs(a.cycleTargetKg - b.cycleTargetKg);
  return wd * 1000 + hd * 10 + td * 5 + b.enqueuedAt / 1e13;
}
export function pickMatch(a: QUser, queue: QUser[], now: number): QUser | null {
  const c = queue.filter((b) => eligible(a, b, now));
  if (!c.length) return null;
  c.sort((x, y) => score(a, x) - score(a, y));
  return c[0];
}
