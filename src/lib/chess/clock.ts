import { useEffect, useRef, useState } from "react";

export type TimeControl = {
  id: string;
  label: string;
  category: "bullet" | "blitz" | "rapid" | "classical" | "unlimited";
  initialSeconds: number; // 0 = unlimited
  incrementSeconds: number;
};

export const TIME_CONTROLS: TimeControl[] = [
  { id: "bullet-1-0", label: "1 min", category: "bullet", initialSeconds: 60, incrementSeconds: 0 },
  { id: "blitz-3-0", label: "3 min", category: "blitz", initialSeconds: 180, incrementSeconds: 0 },
  { id: "blitz-3-2", label: "3 | 2", category: "blitz", initialSeconds: 180, incrementSeconds: 2 },
  { id: "blitz-5-0", label: "5 min", category: "blitz", initialSeconds: 300, incrementSeconds: 0 },
  { id: "rapid-10-0", label: "10 min", category: "rapid", initialSeconds: 600, incrementSeconds: 0 },
  { id: "rapid-15-10", label: "15 | 10", category: "rapid", initialSeconds: 900, incrementSeconds: 10 },
  { id: "classical-30-0", label: "30 min", category: "classical", initialSeconds: 1800, incrementSeconds: 0 },
  { id: "unlimited", label: "Unlimited", category: "unlimited", initialSeconds: 0, incrementSeconds: 0 },
];

export function formatClock(ms: number): string {
  if (ms <= 0) return "0:00";
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m >= 20) return `${m}:${s.toString().padStart(2, "0")}`;
  // show tenths under 20s
  if (ms < 20000) {
    const secs = (ms / 1000).toFixed(1);
    return `${m}:${secs.padStart(4, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type Params = {
  tc: TimeControl;
  activeColor: "w" | "b" | null; // null = paused
  moveNumber: number; // increments on each ply, used to apply increment
  onFlag?: (color: "w" | "b") => void;
};

export function useChessClock({ tc, activeColor, moveNumber, onFlag }: Params) {
  const [white, setWhite] = useState<number>(tc.initialSeconds * 1000);
  const [black, setBlack] = useState<number>(tc.initialSeconds * 1000);
  const [flagged, setFlagged] = useState<"w" | "b" | null>(null);
  const lastTickRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const prevMoveRef = useRef<number>(0);
  const flaggedRef = useRef(false);

  // Reset when time control changes
  useEffect(() => {
    setWhite(tc.initialSeconds * 1000);
    setBlack(tc.initialSeconds * 1000);
    setFlagged(null);
    flaggedRef.current = false;
    prevMoveRef.current = 0;
    lastTickRef.current = null;
  }, [tc.id]);

  // Apply increment on ply change (after a move completed)
  useEffect(() => {
    if (tc.initialSeconds === 0) return;
    if (moveNumber === 0) {
      prevMoveRef.current = 0;
      return;
    }
    if (moveNumber > prevMoveRef.current && tc.incrementSeconds > 0) {
      // The side that JUST moved gets the increment.
      // After ply N, side to move alternates: if activeColor is 'b', white just moved.
      const moved = activeColor === "b" ? "w" : activeColor === "w" ? "b" : null;
      if (moved === "w") setWhite((t) => t + tc.incrementSeconds * 1000);
      else if (moved === "b") setBlack((t) => t + tc.incrementSeconds * 1000);
    }
    prevMoveRef.current = moveNumber;
  }, [moveNumber, activeColor, tc.incrementSeconds, tc.initialSeconds]);

  // Tick loop
  useEffect(() => {
    if (tc.initialSeconds === 0 || activeColor === null || flaggedRef.current) {
      lastTickRef.current = null;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    lastTickRef.current = performance.now();
    const tick = () => {
      const now = performance.now();
      const last = lastTickRef.current ?? now;
      const dt = now - last;
      lastTickRef.current = now;
      if (activeColor === "w") {
        setWhite((t) => {
          const nt = Math.max(0, t - dt);
          if (nt <= 0 && !flaggedRef.current) {
            flaggedRef.current = true;
            setFlagged("w");
            onFlag?.("w");
          }
          return nt;
        });
      } else {
        setBlack((t) => {
          const nt = Math.max(0, t - dt);
          if (nt <= 0 && !flaggedRef.current) {
            flaggedRef.current = true;
            setFlagged("b");
            onFlag?.("b");
          }
          return nt;
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [activeColor, tc.initialSeconds, onFlag]);

  return {
    white,
    black,
    flagged,
    unlimited: tc.initialSeconds === 0,
  };
}
