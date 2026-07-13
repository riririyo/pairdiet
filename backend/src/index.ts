// PairDiet API (Cloudflare Workers + D1 + R2). ロジック核: matching.ts / penalty.ts
import { pickMatch, type QUser } from "./matching.ts";
import { penaltyState } from "./penalty.ts";
export interface Env { DB: D1Database; PHOTOS: R2Bucket; ADMIN_TOKEN: string; }
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json" } });
const uid = () => crypto.randomUUID();
const today = (tz = "Asia/Tokyo") => new Date().toLocaleDateString("sv-SE", { timeZone: tz });

// --- 管理画面(別オリジンのCloudflare Pages)から叩くためのCORS + 認証 ---
const CORS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization,content-type",
  "access-control-allow-methods": "GET,POST,OPTIONS",
};
const ajson = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json", ...CORS } });
function isAdmin(req: Request, env: Env): boolean {
  const h = req.headers.get("authorization") || "";
  const t = h.replace(/^Bearer\s+/i, "");
  return !!env.ADMIN_TOKEN && t === env.ADMIN_TOKEN;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const p = new URL(req.url).pathname;
    try {
      // 管理系（/admin/*）: プリフライト→トークン認証→ルーティング
      if (p.startsWith("/admin")) {
        if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
        if (!isAdmin(req, env)) return ajson({ error: "unauthorized" }, 401);
        if (req.method === "GET" && p === "/admin/reports") return adminReports(env);
        if (req.method === "GET" && p === "/admin/users") return adminUsers(env);
        if (req.method === "POST" && p === "/admin/ban") return adminBan(req, env);
        if (req.method === "POST" && p === "/admin/unban") return adminUnban(req, env);
        if (req.method === "POST" && p === "/admin/resolve") return adminResolve(req, env);
        return ajson({ error: "not found" }, 404);
      }
      if (req.method === "POST" && p === "/register") return register(req, env);
      if (req.method === "POST" && p === "/queue") return enqueue(req, env);
      if (req.method === "POST" && p === "/record") return record(req, env);
      if (req.method === "POST" && p === "/clap") return clap(req, env);
      if (req.method === "POST" && p === "/report") return report(req, env);
      if (p === "/health") return json({ ok: true });
      return json({ error: "not found" }, 404);
    } catch (e) { return json({ error: String(e) }, 500); }
  },
  async scheduled(_c: ScheduledController, env: Env) { await dailyBatch(env); },
};
async function register(req: Request, env: Env) {
  const b = await req.json<any>(); const id = b.userId || uid();
  await env.DB.prepare(`INSERT OR REPLACE INTO users(id,nickname,sex,over18,height_cm,weight_start_kg,goal_weight_kg,tz,created_at,status) VALUES(?,?,?,?,?,?,?,?,?, 'active')`)
    .bind(id, b.nickname, b.sex, b.over18 ? 1 : 0, b.heightCm, b.weightKg, b.goalKg, b.tz || "Asia/Tokyo", Date.now()).run();
  return json({ userId: id });
}
async function enqueue(req: Request, env: Env) {
  const b = await req.json<any>(); const now = Date.now();
  // BANされたユーザーはマッチング不可
  const meRow = await env.DB.prepare(`SELECT status FROM users WHERE id=?`).bind(b.userId).first<any>();
  if (meRow && meRow.status === "banned") return json({ error: "banned" }, 403);
  const bl = await env.DB.prepare(`SELECT blocked_id FROM blocks WHERE user_id=?`).bind(b.userId).all();
  const me: QUser = { id: b.userId, sex: b.sex, over18: !!b.over18, heightCm: b.heightCm, weightKg: b.weightKg, cycleTargetKg: b.cycleTargetKg, enqueuedAt: now, blocked: bl.results.map((r: any) => r.blocked_id) };
  const qs = await env.DB.prepare(`SELECT * FROM match_queue WHERE user_id != ?`).bind(b.userId).all();
  const queue: QUser[] = qs.results.map((r: any) => ({ id: r.user_id, sex: r.sex, over18: !!r.over18, heightCm: r.height_cm, weightKg: r.weight_kg, cycleTargetKg: r.cycle_target_kg, enqueuedAt: r.enqueued_at, blocked: [] }));
  const m = pickMatch(me, queue, now);
  if (!m) { await env.DB.prepare(`INSERT OR REPLACE INTO match_queue VALUES(?,?,?,?,?,?,?)`).bind(me.id, me.sex, me.over18 ? 1 : 0, me.heightCm, me.weightKg, me.cycleTargetKg, now).run(); return json({ status: "waiting" }); }
  await env.DB.prepare(`DELETE FROM match_queue WHERE user_id IN (?,?)`).bind(me.id, m.id).run();
  const pairId = uid();
  await env.DB.prepare(`INSERT INTO pairs(id,user_a,user_b,status,started_at,expires_at) VALUES(?,?,?, 'icebreak',?,?)`).bind(pairId, me.id, m.id, now, now + 90 * 864e5).run();
  return json({ status: "matched", pairId, partnerId: m.id });
}
async function record(req: Request, env: Env) {
  const b = await req.json<any>(); const key = `${b.cycleId}/${b.userId}/${today()}.jpg`;
  if (b.photoBase64) await env.PHOTOS.put(key, Uint8Array.from(atob(b.photoBase64), c => c.charCodeAt(0)));
  await env.DB.prepare(`INSERT OR REPLACE INTO records(id,cycle_id,user_id,date,ts,photo_key,weight_kg) VALUES(?,?,?,?,?,?,?)`).bind(uid(), b.cycleId, b.userId, today(), Date.now(), key, b.weightKg ?? null).run();
  return json({ ok: true, photoKey: key });
}
async function clap(req: Request, env: Env) {
  const b = await req.json<any>();
  await env.DB.prepare(`INSERT INTO claps(pair_id,from_id,date,n) VALUES(?,?,?,1) ON CONFLICT(pair_id,from_id,date) DO UPDATE SET n=n+1`).bind(b.pairId, b.userId, today()).run();
  return json({ ok: true });
}
async function report(req: Request, env: Env) {
  const b = await req.json<any>();
  await env.DB.prepare(`INSERT INTO reports(id,reporter_id,target_id,message_id,reason,created_at) VALUES(?,?,?,?,?,?)`).bind(uid(), b.userId, b.targetId, b.messageId ?? null, b.reason ?? "", Date.now()).run();
  await env.DB.prepare(`INSERT OR IGNORE INTO blocks(user_id,blocked_id) VALUES(?,?),(?,?)`).bind(b.userId, b.targetId, b.targetId, b.userId).run();
  return json({ ok: true, blocked: true });
}

// --- 管理ハンドラ（通報パトロール／BAN） ---
async function adminReports(env: Env) {
  const rs = await env.DB.prepare(
    `SELECT r.id, r.reporter_id, r.target_id, r.reason, r.created_at, r.resolved,
            ru.nickname AS reporter_name, tu.nickname AS target_name, tu.status AS target_status
       FROM reports r
       LEFT JOIN users ru ON ru.id = r.reporter_id
       LEFT JOIN users tu ON tu.id = r.target_id
      ORDER BY r.resolved ASC, r.created_at DESC LIMIT 200`
  ).all();
  return ajson({ reports: rs.results });
}
async function adminUsers(env: Env) {
  const rs = await env.DB.prepare(`SELECT id, nickname, status, created_at FROM users WHERE status='banned' ORDER BY created_at DESC LIMIT 200`).all();
  return ajson({ users: rs.results });
}
async function adminBan(req: Request, env: Env) {
  const b = await req.json<any>(); const id = b.targetId;
  if (!id) return ajson({ error: "targetId required" }, 400);
  await env.DB.prepare(`UPDATE users SET status='banned' WHERE id=?`).bind(id).run();
  await env.DB.prepare(`DELETE FROM match_queue WHERE user_id=?`).bind(id).run();
  await env.DB.prepare(`UPDATE reports SET resolved=1 WHERE target_id=?`).bind(id).run();
  return ajson({ ok: true, bannedId: id });
}
async function adminUnban(req: Request, env: Env) {
  const b = await req.json<any>(); const id = b.targetId;
  if (!id) return ajson({ error: "targetId required" }, 400);
  await env.DB.prepare(`UPDATE users SET status='active' WHERE id=?`).bind(id).run();
  return ajson({ ok: true, unbannedId: id });
}
async function adminResolve(req: Request, env: Env) {
  const b = await req.json<any>(); const id = b.reportId;
  if (!id) return ajson({ error: "reportId required" }, 400);
  await env.DB.prepare(`UPDATE reports SET resolved=1 WHERE id=?`).bind(id).run();
  return ajson({ ok: true, resolvedId: id });
}

async function dailyBatch(env: Env) {
  const pairs = await env.DB.prepare(`SELECT * FROM pairs WHERE status IN ('active','icebreak')`).all();
  for (const pr of pairs.results as any[]) {
    for (const u of [pr.user_a, pr.user_b]) {
      const missed = await consecutiveMissed(env, u);
      const st = penaltyState(missed);
      await env.DB.prepare(`INSERT INTO penalty_log(id,user_id,cycle_id,consecutive_missed,state,created_at) VALUES(?,?,?,?,?,?)`).bind(uid(), u, pr.id, missed, st, Date.now()).run();
      if (st === "dissolved") { await env.DB.prepare(`UPDATE pairs SET status='dissolved',dissolved_at=?,dissolve_loser_id=? WHERE id=?`).bind(Date.now(), u, pr.id).run(); break; }
    }
  }
}
async function consecutiveMissed(env: Env, userId: string): Promise<number> {
  const rows = await env.DB.prepare(`SELECT date FROM records WHERE user_id=? ORDER BY date DESC LIMIT 10`).bind(userId).all();
  const dates = new Set((rows.results as any[]).map(r => r.date));
  let c = 0; const d = new Date();
  for (let i = 0; i < 10; i++) { const s = d.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" }); if (dates.has(s)) break; c++; d.setDate(d.getDate() - 1); }
  return c;
}
