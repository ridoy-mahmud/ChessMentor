import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Cloud, Timer, Trophy } from "lucide-react";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { useChessGame } from "@/lib/chess/useChessGame";
import { MINI_PUZZLES, type MiniPuzzle } from "@/lib/chess/miniPuzzles";
import { playSound } from "@/lib/chess/sounds";

export const Route = createFileRoute("/storm")({
  head: () => ({
    meta: [
      { title: "Puzzle Storm — ChessMentor" },
      { name: "description", content: "Survival puzzles. Correct moves add time, wrong subtract." },
    ],
  }),
  component: StormPage,
});

const START_TIME = 60;
const KEY = "chessmentor:storm:best";

function StormPage() {
  const game = useChessGame();
  const [running, setRunning] = useState(false);
  const [ended, setEnded] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(START_TIME);
  const [best, setBest] = useState(0);
  const [current, setCurrent] = useState<MiniPuzzle>(MINI_PUZZLES[0]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      setBest(Number(localStorage.getItem(KEY) ?? 0));
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = (t - last) / 1000;
      last = t;
      setTimeLeft((s) => {
        const n = s - dt;
        if (n <= 0) {
          end();
          return 0;
        }
        return n;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const start = () => {
    setScore(0);
    setTimeLeft(START_TIME);
    setEnded(false);
    setRunning(true);
    const first = MINI_PUZZLES[Math.floor(Math.random() * MINI_PUZZLES.length)];
    setCurrent(first);
    game.loadFen(first.fen, { silent: true });
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
    playSound("gameStart");
  };

  const next = () => {
    const p = MINI_PUZZLES[Math.floor(Math.random() * MINI_PUZZLES.length)];
    setCurrent(p);
    game.loadFen(p.fen, { silent: true });
  };

  useEffect(() => {
    if (!running || !game.lastMove) return;
    const played = game.lastMove.san.replace(/[+#]/g, "");
    const expected = current.solution.replace(/[+#]/g, "");
    if (played === expected) {
      setScore((s) => s + 1);
      setTimeLeft((t) => Math.min(START_TIME + 30, t + 3));
      playSound("win");
    } else {
      setTimeLeft((t) => Math.max(0, t - 5));
      playSound("illegal");
    }
    setTimeout(next, 250);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.lastMove?.after]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-display text-3xl font-semibold">
            <Cloud className="h-6 w-6 text-primary" /> Puzzle Storm
          </h1>
          <p className="mt-1 text-muted-foreground">Time bank survival. +3s per solve, −5s per miss.</p>
        </div>
        <div className="text-right">
          <div className="label-caps text-muted-foreground">Personal best</div>
          <div className="font-data text-2xl font-semibold">{best}</div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <ChessBoard game={game} interactive={running} />
          <p className="mt-3 text-sm text-muted-foreground">
            {running ? current.prompt : ended ? "Storm over." : "Press Start."}
          </p>
        </div>
        <aside className="flex flex-col gap-4">
          <div className="rounded-xl border bg-card p-4 shadow-e1">
            <div className="label-caps flex items-center gap-1.5 text-muted-foreground">
              <Timer className="h-4 w-4" /> Time bank
            </div>
            <div
              className={`mt-1 font-data text-3xl font-semibold ${
                timeLeft < 10 ? "text-destructive" : ""
              }`}
            >
              {timeLeft.toFixed(1)}s
            </div>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-e1">
            <div className="label-caps text-muted-foreground">Solved</div>
            <div className="mt-1 font-data text-3xl font-semibold">{score}</div>
          </div>
          {!running && (
            <button
              onClick={start}
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Trophy className="h-4 w-4" /> {ended ? "Play again" : "Start"}
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}
