import { useSyncExternalStore } from "react";
import { setMuted } from "./sounds";

export type Theme = "light" | "dark";
export type BoardTheme = "warm" | "slate" | "emerald";
export type PlayAnalyticsMode = "learning" | "competitive";

export type Settings = {
  theme: Theme;
  muted: boolean;
  showCoords: boolean;
  boardOrientation: "white" | "black";
  boardTheme: BoardTheme;
  socratic: boolean;
  analyticsMode: PlayAnalyticsMode;
  showThreatRadar: boolean;
};

const DEFAULTS: Settings = {
  theme: "light",
  muted: false,
  showCoords: true,
  boardOrientation: "white",
  boardTheme: "warm",
  socratic: false,
  analyticsMode: "learning",
  showThreatRadar: true,
};

const KEY = "chessmentor:settings:v2";

let state: Settings = { ...DEFAULTS };
const listeners = new Set<() => void>();

function read(): Settings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
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

function applySideEffects() {
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("dark", state.theme === "dark");
    // Board theme class on body
    const body = document.body;
    if (body) {
      body.classList.remove("board-theme-warm", "board-theme-slate", "board-theme-emerald");
      body.classList.add(`board-theme-${state.boardTheme}`);
    }
  }
  setMuted(state.muted);
}

export function initSettings() {
  state = read();
  applySideEffects();
  listeners.forEach((l) => l());
}

export function updateSettings(patch: Partial<Settings>) {
  state = { ...state, ...patch };
  persist();
  applySideEffects();
  listeners.forEach((l) => l());
}

export function toggleTheme() {
  updateSettings({ theme: state.theme === "dark" ? "light" : "dark" });
}
export function toggleMute() {
  updateSettings({ muted: !state.muted });
}
export function toggleCoords() {
  updateSettings({ showCoords: !state.showCoords });
}
export function flipBoard() {
  updateSettings({
    boardOrientation: state.boardOrientation === "white" ? "black" : "white",
  });
}
export function toggleSocratic() {
  updateSettings({ socratic: !state.socratic });
}
export function setAnalyticsMode(m: PlayAnalyticsMode) {
  updateSettings({ analyticsMode: m });
}
export function setBoardTheme(t: BoardTheme) {
  updateSettings({ boardTheme: t });
}
export function toggleThreatRadar() {
  updateSettings({ showThreatRadar: !state.showThreatRadar });
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useSettings(): Settings {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => DEFAULTS,
  );
}
