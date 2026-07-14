import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import { Target, Timer, Trophy } from "lucide-react";
import { useSettings } from "@/lib/chess/settings";
import { playSound } from "@/lib/chess/sounds";

export const Route = createFileRoute("/coordinate")({
  head: () => ({
    meta: [
      { title: "Coordinate Trainer — ChessMentor" },
      { name: "description", content: "Board-vision drill. Click the named square as fast as you can." },
    ],
  }),
  component: CoordPage,
});

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const DURATION = 30;
const KEY = "chessmentor:coord:best";

function randomSquare(): string {
  const f = FILES[Math.floor(Math.random() * 8)];
  const r = Math.floor(Math.random() * 8) + 1;
  return `${f}${r}`;
}

function CoordPage() {
  const { showCoords } = useSettings();
  const [target, setTarget] = useState<string>("");
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [running, setRunning] = useState(false);
  const [ended, setEnded] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [best, setBest] = useState(0);
  const [flash, setFlash] = useState<{ sq: string; ok: boolean } | null>(null);
  const startAt = useRef(0);

  useEffect(() => {
    try {
      setBest(Number(localStorage.getItem(KEY) ?? 0));
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const e = (Date.now() - startAt.current) / 1000;
      setElapsed(e);
      if (e >= DURATION) end();
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const start = () => {
    setScore(0);
    setMisses(0);
    setElapsed(0);
    setEnded(false);
    setRunning(true);
    startAt.current = Date.now();
    setTarget(randomSquare());
  };

  const end = () => {
    setRunning(false);
    setEnded(true);
    if (score > best) {
      setBest(score);
      try {
        localStorage.setItem(KEY, String(score));
      } catch {
        /* noop */
      }
    }
  };

  const onClickSquare = (sq: string) => {
    if (!running) return;
    if (sq === target) {
      setScore((s) => s + 1);
      setFlash({ sq, ok: true });
      playSound("move");
      setTimeout(() => setFlash(null), 200);
      setTarget(randomSquare());
    } else {
      setMisses((m) => m + 1);
      setFlash({ sq, ok: false });
      playSound("illegal");
      setTimeout(() => setFlash(null), 300);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-display text-3xl font-semibold">
            <Target className="h-6 w-6 text-primary" /> Coordinate Trainer
          </h1>
          <p className="mt-1 text-muted-foreground">
            30 seconds. Click the named square as fast as you can.
          </p>
        </div>
        <div className="text-right">
          <div className="label-caps text-muted-foreground">Best</div>
          <div className="font-data text-2xl font-semibold">{best}</div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div className="mx-auto w-full max-w-[min(80vh,640px)]">
            <div className="mb-3 text-center">
              <div className="label-caps text-muted-foreground">Find square</div>
              <div className="font-data text-5xl font-bold tracking-tight text-primary">
                {running ? target : "—"}
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border bg-card shadow-e2">
              <Chessboard
                options={{
                  id: "coord-board",
                  position: "8/8/8/8/8/8/8/8 w - - 0 1",
                  allowDragging: false,
                  showNotation: showCoords,
                  animationDurationInMs: 0,
                  lightSquareStyle: { backgroundColor: "var(--color-board-light)" },
                  darkSquareStyle: { backgroundColor: "var(--color-board-dark)" },
                  squareStyles: flash
                    ? {
                        [flash.sq]: {
                          background: flash.ok
                            ? "rgba(15, 118, 110, 0.55)"
                            : "rgba(220, 38, 38, 0.55)",
                        },
                      }
                    : {},
                  onSquareClick: ({ square }) => onClickSquare(square as string),
                }}
              />
            </div>
          </div>
        </div>
        <aside className="flex flex-col gap-4">
          <Stat label="Score" value={score} />
          <Stat
            label="Time"
            value={`${Math.max(0, DURATION - elapsed).toFixed(1)}s`}
            icon={<Timer className="h-4 w-4" />}
          />
          <Stat label="Misses" value={misses} />
          {!running && (
            <button
              onClick={start}
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Trophy className="h-4 w-4" /> {ended ? "Try again" : "Start"}
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-e1">
      <div className="label-caps flex items-center gap-1.5 text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 font-data text-2xl font-semibold">{value}</div>
    </div>
  );
}
