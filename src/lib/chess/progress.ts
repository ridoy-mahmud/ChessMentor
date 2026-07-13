import { useSyncExternalStore } from "react";

export type LessonProgress = {
  completed: boolean;
  attempts: number;
  hintsUsed: number;
  wrongMoves: number;
  stars: 0 | 1 | 2 | 3;
};

type ProgressMap = Record<string, LessonProgress>;

const KEY = "chessmentor:progress:v1";
let state: ProgressMap = {};
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded) return;
  loaded = true;
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) state = JSON.parse(raw) as ProgressMap;
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

function emit() {
  listeners.forEach((l) => l());
}

export function getLessonProgress(id: string): LessonProgress {
  load();
  return (
    state[id] ?? {
      completed: false,
      attempts: 0,
      hintsUsed: 0,
      wrongMoves: 0,
      stars: 0,
    }
  );
}

export function recordLessonResult(
  id: string,
  result: { wrongMoves: number; hintsUsed: number },
) {
  load();
  const prev = getLessonProgress(id);
  let stars: 0 | 1 | 2 | 3 = 3;
  if (result.hintsUsed > 0 || result.wrongMoves > 2) stars = 2;
  if (result.wrongMoves > 4 || result.hintsUsed > 2) stars = 1;
  const best: 0 | 1 | 2 | 3 = Math.max(prev.stars, stars) as 0 | 1 | 2 | 3;
  state = {
    ...state,
    [id]: {
      completed: true,
      attempts: prev.attempts + 1,
      hintsUsed: prev.hintsUsed + result.hintsUsed,
      wrongMoves: prev.wrongMoves + result.wrongMoves,
      stars: best,
    },
  };
  persist();
  emit();
}

export function resetAllProgress() {
  state = {};
  persist();
  emit();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useProgress(): ProgressMap {
  return useSyncExternalStore(
    subscribe,
    () => {
      load();
      return state;
    },
    () => ({}) as ProgressMap,
  );
}
