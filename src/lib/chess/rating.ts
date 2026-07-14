// Phase 16: Competitive rating store (localStorage-based) with
// Elo update, seasons, and anti-tilt tracking. Separate from casual play.

import { useSyncExternalStore } from "react";

export type RatingState = {
  rating: number;
  peak: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  seasonId: string;
  seasonStart: number;
  seasonPeak: number;
  seasonGames: number;
  history: { at: number; rating: number; delta: number; result: "win" | "loss" | "draw"; opponent: string }[];
  consecutiveLosses: number;
  lastResultAt: number;
};

const DEFAULTS: RatingState = {
  rating: 1200,
  peak: 1200,
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  seasonId: currentSeasonId(),
  seasonStart: Date.now(),
  seasonPeak: 1200,
  seasonGames: 0,
  history: [],
  consecutiveLosses: 0,
  lastResultAt: 0,
};

const KEY = "chessmentor:rating:v1";
let state: RatingState = { ...DEFAULTS };
const listeners = new Set<() => void>();

function currentSeasonId(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function read(): RatingState {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<RatingState>) };
    // Season rollover
    if (parsed.seasonId !== currentSeasonId()) {
      // Soft compression back toward 1500
      const compressed = Math.round(parsed.rating * 0.85 + 1500 * 0.15);
      return {
        ...parsed,
        rating: compressed,
        seasonId: currentSeasonId(),
        seasonStart: Date.now(),
        seasonPeak: compressed,
        seasonGames: 0,
      };
    }
    return parsed;
  } catch {
    return { ...DEFAULTS };
  }
}

function persist() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* noop */
  }
}

export function initRating() {
  state = read();
  listeners.forEach((l) => l());
}

function eloDelta(mine: number, opp: number, score: number, k = 24): number {
  const expected = 1 / (1 + Math.pow(10, (opp - mine) / 400));
  return Math.round(k * (score - expected));
}

export function recordRatedGame(opts: {
  opponentRating: number;
  opponentName: string;
  result: "win" | "loss" | "draw";
}) {
  const score = opts.result === "win" ? 1 : opts.result === "draw" ? 0.5 : 0;
  const delta = eloDelta(state.rating, opts.opponentRating, score);
  const nextRating = state.rating + delta;
  const consecutiveLosses = opts.result === "loss" ? state.consecutiveLosses + 1 : 0;
  state = {
    ...state,
    rating: nextRating,
    peak: Math.max(state.peak, nextRating),
    seasonPeak: Math.max(state.seasonPeak, nextRating),
    gamesPlayed: state.gamesPlayed + 1,
    seasonGames: state.seasonGames + 1,
    wins: state.wins + (opts.result === "win" ? 1 : 0),
    losses: state.losses + (opts.result === "loss" ? 1 : 0),
    draws: state.draws + (opts.result === "draw" ? 1 : 0),
    history: [
      { at: Date.now(), rating: nextRating, delta, result: opts.result, opponent: opts.opponentName },
      ...state.history,
    ].slice(0, 50),
    consecutiveLosses,
    lastResultAt: Date.now(),
  };
  persist();
  listeners.forEach((l) => l());
  return { delta, newRating: nextRating };
}

export function resetTiltCounter() {
  state = { ...state, consecutiveLosses: 0 };
  persist();
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useRating(): RatingState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => DEFAULTS,
  );
}

export function getRating(): RatingState {
  return state;
}
