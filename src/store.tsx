import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { dstr, type Profile, type Pair, type Cycle, type WeightRecord } from "./logic.ts";

const KEY = "pairdiet_state_v1";

export interface AppState {
  profile: Profile | null;
  pair: Pair | null;
  cycle: Cycle | null;
  records: WeightRecord[];
  claps: Record<string, number>;   // date -> 相棒へ送った👏数
  settings: { graceDays: number };
  debugDayOffset: number;          // 開発用：日付を進める
}

// デモ初期状態（オンボード実装までの土台。実装後はnullプロフィールから開始）
function seed(): AppState {
  const today = new Date();
  const start = new Date(today.getTime() - 42 * 864e5); // 42日前にペア開始
  const startStr = dstr(start);
  const records: WeightRecord[] = [];
  for (let i = 0; i <= 42; i++) {
    const d = new Date(start.getTime() + i * 864e5);
    if (i % 7 === 6) continue; // 週1回サボり
    records.push({ date: dstr(d), ts: d.getTime(), weightKg: +(70 - i * 0.06).toFixed(1), retakes: i % 5 === 0 ? 1 : 0 });
  }
  return {
    profile: { nickname: "たかや", sex: "m", height: 172, weight: 70, goal: 63, cycleTarget: 2 },
    pair: { name: "モカ", emoji: "🐻", reason: "結婚式で昔の服を着たい。", status: "active", startDate: startStr },
    cycle: { startDate: dstr(new Date(today.getTime() - 12 * 864e5)), startWeight: 68.2, targetLoss: 2, judged: false },
    records,
    claps: {},
    settings: { graceDays: 3 },
    debugDayOffset: 0,
  };
}

interface Ctx {
  state: AppState;
  set: (patch: Partial<AppState>) => void;
  today: () => string;
  reset: () => void;
}
const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(seed);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (raw) { try { setState(JSON.parse(raw)); } catch {} }
      setLoaded(true);
    });
  }, []);
  useEffect(() => {
    if (loaded) AsyncStorage.setItem(KEY, JSON.stringify(state));
  }, [state, loaded]);

  const set = useCallback((patch: Partial<AppState>) => setState((s) => ({ ...s, ...patch })), []);
  const today = useCallback(() => dstr(new Date(Date.now() + state.debugDayOffset * 864e5)), [state.debugDayOffset]);
  const reset = useCallback(() => setState(seed()), []);

  return <StoreContext.Provider value={{ state, set, today, reset }}>{children}</StoreContext.Provider>;
}

export function useStore(): Ctx {
  const c = useContext(StoreContext);
  if (!c) throw new Error("useStore must be used within StoreProvider");
  return c;
}
