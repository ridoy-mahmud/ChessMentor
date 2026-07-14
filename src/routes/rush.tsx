import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { Timer, Trophy, Zap } from "lucide-react";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { useChessGame } from "@/lib/chess/useChessGame";
import { MINI_PUZZLES, type MiniPuzzle } from "@/lib/chess/miniPuzzles";
import { playSound } from "@/lib/chess/sounds";

export const Route = createFileRoute("/rush")({
  head: () => ({
    meta: [
      { title: "Puzzle Rush — ChessMentor" },
      { name: "description", content: "Timed puzzle sprint. Beat your personal best." },
    ],
  }),
  component: RushPage,
});

const DURATION_S = 180; // 3 minutes
const KEY = "chessmentor:rush:best";

function RushPage() {
  const game = useChessGame();
  const [running, setRunning] = useState(false);
  const [ended, setEnded] = useState(false);
  const [score, setScore] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [current, setCurrent] = useState<MiniPuzzle>(MINI_PUZZLES[0]);
  const [best, setBest] = useState(0);
  const startedAt = useRef(0);

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
      const e = (Date.now() - startedAt.current) / 1000;
      setElapsed(e);
      if (e >= DURATION_S) end();
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const start = () => {
    setScore(0);
    setStrikes(0);
    setElapsed(0);
    setEnded(false);
    setRunning(true);
    startedAt.current = Date.now();
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
    const puzzle = MINI_PUZZLES[Math.floor(Math.random() * MINI_PUZZLES.length)];
    setCurrent(puzzle);
    game.loadFen(puzzle.fen, { silent: true });
  };

  // Check answer on move
  useEffect(() => {
    if (!running) return;
    if (!game.lastMove) return;
    const played = game.lastMove.san.replace(/[+#]/g, "");
    const expected = current.solution.replace(/[+#]/g, "");
    if (played === expected) {
      setScore((s) => s + 1);
      playSound("win");
      setTimeout(next, 250);
    } else {
      setStrikes((s) => {
        const n = s + 1;
        if (n >= 3) end();
        return n;
      });
      playSound("illegal");
      setTimeout(next, 250);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.lastMove?.after]);

  const remaining = Math.max(0, DURATION_S - elapsed);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-display text-3xl font-semibold">
            <Zap className="h-6 w-6 text-primary" /> Puzzle Rush
          </h1>
          <p className="mt-1 text-muted-foreground">3 minutes. 3 strikes. How many can you solve?</p>
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
            {running ? current.prompt : ended ? "Time's up. Restart to try again." : "Press Start."}
          </p>
        </div>
        <aside className="flex flex-col gap-4">
          <Stat label="Score" value={score} />
          <Stat label="Time" value={`${Math.floor(remaining)}s`} icon={<Timer className="h-4 w-4" />} />
          <Stat label="Strikes" value={`${strikes}/3`} />
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

// Silence unused-import warning
export { Chess as _Chess };
