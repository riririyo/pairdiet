-- PairDiet D1 スキーマ（要件定義書 §7）
CREATE TABLE IF NOT EXISTS users(
  id TEXT PRIMARY KEY, auth_sub TEXT UNIQUE, nickname TEXT, sex TEXT,
  over18 INTEGER, height_cm REAL, weight_start_kg REAL, goal_weight_kg REAL,
  reason_text TEXT, tz TEXT, created_at INTEGER, status TEXT DEFAULT 'active');
CREATE TABLE IF NOT EXISTS tickets(
  id TEXT PRIMARY KEY, user_id TEXT, type TEXT, price_yen INTEGER,
  discount_rate REAL, store_receipt_id TEXT, state TEXT DEFAULT 'unused',
  expires_at INTEGER, created_at INTEGER);
CREATE TABLE IF NOT EXISTS match_queue(
  user_id TEXT PRIMARY KEY, sex TEXT, over18 INTEGER, height_cm REAL,
  weight_kg REAL, cycle_target_kg REAL, enqueued_at INTEGER);
CREATE TABLE IF NOT EXISTS pairs(
  id TEXT PRIMARY KEY, user_a TEXT, user_b TEXT, status TEXT,
  started_at INTEGER, expires_at INTEGER, dissolved_at INTEGER, dissolve_loser_id TEXT);
CREATE TABLE IF NOT EXISTS cycles(
  id TEXT PRIMARY KEY, pair_id TEXT, user_id TEXT, day_count INTEGER DEFAULT 30,
  start_weight_kg REAL, target_loss_kg REAL, end_weight_kg REAL,
  progress_rate REAL, result TEXT, started_at INTEGER, ended_at INTEGER);
CREATE TABLE IF NOT EXISTS records(
  id TEXT PRIMARY KEY, cycle_id TEXT, user_id TEXT, date TEXT, ts INTEGER,
  photo_key TEXT, weight_kg REAL, on_time INTEGER, UNIQUE(cycle_id, user_id, date));
CREATE TABLE IF NOT EXISTS claps(pair_id TEXT, from_id TEXT, date TEXT, n INTEGER, PRIMARY KEY(pair_id, from_id, date));
CREATE TABLE IF NOT EXISTS messages(id TEXT PRIMARY KEY, pair_id TEXT, sender_id TEXT, body TEXT, created_at INTEGER);
CREATE TABLE IF NOT EXISTS reports(id TEXT PRIMARY KEY, reporter_id TEXT, target_id TEXT, message_id TEXT, reason TEXT, created_at INTEGER, resolved INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS blocks(user_id TEXT, blocked_id TEXT, PRIMARY KEY(user_id, blocked_id));
CREATE TABLE IF NOT EXISTS penalty_log(id TEXT PRIMARY KEY, user_id TEXT, cycle_id TEXT, consecutive_missed INTEGER, state TEXT, created_at INTEGER);
