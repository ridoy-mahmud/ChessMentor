// Persistent per-game trend log (Phase 11): stores last N games' accuracy,
// blunders, and time management.

import { useSyncExternalStore } from "react";

export type GameStat = {
  playedAt: number; // epoch ms
  accuracy: number; // 0-100
  blunders: number;
  mistakes: number;
  inaccuracies: number;
  avgSecPerMove: number;
  result: "win" | "loss" | "draw";
};

const KEY = "chessmentor:trend:v1";
const MAX = 30;

let state: GameStat[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded) return;
  loaded = true;
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) state = JSON.parse(raw) as GameStat[];
  } catch {
    /* noop */
  }
}

function persist() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* noop */
  }
}

export function recordGameStat(s: GameStat) {
  load();
  state = [...state, s].slice(-MAX);
  persist();
  listeners.forEach((l) => l());
}

export function useGameTrend(): GameStat[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => {
      load();
      return state;
    },
    () => [],
  );
}
