import { useSyncExternalStore } from "react";
import { setMuted } from "./sounds";

export type Theme = "light" | "dark";
export type BoardTheme =
  | "warm"
  | "slate"
  | "emerald"
  | "walnut"
  | "glass"
  | "coral"
  | "midnight"
  | "classic"
  | "sandstone"
  | "ocean";
export type PieceSet =
  | "minimal"
  | "classic"
  | "neo"
  | "wood"
  | "marble"
  | "accessibility";
export type PlayAnalyticsMode = "learning" | "competitive";

export type Settings = {
  theme: Theme;
  muted: boolean;
  showCoords: boolean;
  boardOrientation: "white" | "black";
  boardTheme: BoardTheme;
  pieceSet: PieceSet;
  socratic: boolean;
  analyticsMode: PlayAnalyticsMode;
  showThreatRadar: boolean;
  reducedMotion: boolean;
};

const DEFAULTS: Settings = {
  theme: "light",
  muted: false,
  showCoords: true,
  boardOrientation: "white",
  boardTheme: "warm",
  pieceSet: "minimal",
  socratic: false,
  analyticsMode: "learning",
  showThreatRadar: true,
  reducedMotion: false,
};

const KEY = "chessmentor:settings:v3";
const ALL_THEMES: BoardTheme[] = [
  "warm", "slate", "emerald", "walnut", "glass", "coral", "midnight", "classic", "sandstone", "ocean",
];
const ALL_PIECES: PieceSet[] = ["minimal", "classic", "neo", "wood", "marble", "accessibility"];

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
    const body = document.body;
    if (body) {
      ALL_THEMES.forEach((t) => body.classList.remove(`board-theme-${t}`));
      body.classList.add(`board-theme-${state.boardTheme}`);
      ALL_PIECES.forEach((p) => body.classList.remove(`pieces-${p}`));
      body.classList.add(`pieces-${state.pieceSet}`);
      body.classList.toggle("reduced-motion", state.reducedMotion);
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
export function setPieceSet(p: PieceSet) {
  updateSettings({ pieceSet: p });
}
export function toggleThreatRadar() {
  updateSettings({ showThreatRadar: !state.showThreatRadar });
}
export function toggleReducedMotion() {
  updateSettings({ reducedMotion: !state.reducedMotion });
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

export const BOARD_THEME_META: Record<BoardTheme, { label: string; blurb: string }> = {
  warm: { label: "Walnut Warm", blurb: "Default warm-neutral pair." },
  slate: { label: "Slate", blurb: "Cool blue-grey." },
  emerald: { label: "Emerald", blurb: "Muted green." },
  walnut: { label: "Walnut", blurb: "Rich brown wood tones." },
  glass: { label: "Glass", blurb: "Frosted, translucent feel." },
  coral: { label: "Coral Reef", blurb: "Warm coral & cream." },
  midnight: { label: "Midnight", blurb: "Deep indigo for night play." },
  classic: { label: "Classic Tournament", blurb: "Traditional green & cream." },
  sandstone: { label: "Sandstone", blurb: "Warm desert palette." },
  ocean: { label: "Ocean", blurb: "Cool blue depth." },
};

export const PIECE_SET_META: Record<PieceSet, { label: string; blurb: string }> = {
  minimal: { label: "Minimal Line", blurb: "Clean modern outlines." },
  classic: { label: "Classic Staunton", blurb: "Traditional silhouette." },
  neo: { label: "Neo", blurb: "Bold geometric modern." },
  wood: { label: "Wood-textured", blurb: "Subtle grain, still flat." },
  marble: { label: "Marble", blurb: "Cool stone finish." },
  accessibility: { label: "Accessibility", blurb: "Thick outlines, high contrast." },
};

export const ALL_BOARD_THEMES = ALL_THEMES;
export const ALL_PIECE_SETS = ALL_PIECES;
