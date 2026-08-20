import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Dumbbell, RefreshCw, X } from "lucide-react";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { useChessGame } from "@/lib/chess/useChessGame";
import { MINI_PUZZLES, type MiniPuzzle } from "@/lib/chess/miniPuzzles";
import { playSound } from "@/lib/chess/sounds";

export const Route = createFileRoute("/trainer/practice")({
  head: () => ({
    meta: [
      { title: "Guided Practice — ChessMentor" },
      { name: "description", content: "Themed practice drills. Repeat positions grouped by tactic." },
    ],
  }),
  component: PracticePage,
});

const THEMES = [
  { key: "mate-in-1", label: "Back-rank & mate-in-1" },
  { key: "fork", label: "Forks" },
  { key: "capture", label: "Free captures" },
  { key: "promotion", label: "Promotions" },
  { key: "opposition", label: "Opposition" },
] as const;

type ThemeKey = (typeof THEMES)[number]["key"];

function PracticePage() {
  const game = useChessGame();
  const [theme, setTheme] = useState<ThemeKey>("mate-in-1");
  const [idx, setIdx] = useState(0);
  const [feedback, setFeedback] = useState<null | { ok: boolean }>(null);

  const pool: MiniPuzzle[] = MINI_PUZZLES.filter(
    (p) => p.theme === theme || (theme === "mate-in-1" && p.theme === "back-rank"),
  );
  const current = pool[idx % Math.max(1, pool.length)];

  useEffect(() => {
    if (current) game.loadFen(current.fen, { silent: true });
    setFeedback(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  useEffect(() => {
    if (!game.lastMove || !current) return;
    const played = game.lastMove.san.replace(/[+#]/g, "");
    const expected = current.solution.replace(/[+#]/g, "");
    const ok = played === expected;
    setFeedback({ ok });
    if (ok) playSound("win");
    else playSound("illegal");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.lastMove?.after]);

  const next = () => {
    setIdx((i) => i + 1);
  };
  const retry = () => {
    if (current) game.loadFen(current.fen, { silent: true });
    setFeedback(null);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 font-display text-3xl font-semibold">
          <Dumbbell className="h-6 w-6 text-primary" /> Practice
        </h1>
        <p className="mt-1 text-muted-foreground">
          Repeatable themed drills — quicker than full lessons, structured unlike raw puzzles.
        </p>
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        {THEMES.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTheme(t.key);
              setIdx(0);
            }}
            className={`inline-flex h-11 items-center rounded-md border px-3 text-xs font-medium transition-colors ${
              theme === t.key
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-background hover:bg-secondary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <ChessBoard game={game} interactive={!feedback?.ok} />
          <p className="mt-3 text-sm text-muted-foreground">
            {current?.prompt ?? "No puzzle in this theme yet."}
          </p>
        </div>
        <aside className="flex flex-col gap-4">
          {feedback && (
            <div
              className={`rounded-xl border p-4 shadow-e1 ${
                feedback.ok
                  ? "border-primary/40 bg-primary/5 text-primary"
                  : "border-destructive/40 bg-destructive/5 text-destructive"
              }`}
            >
              <div className="flex items-center gap-1.5 text-sm font-medium">
                {feedback.ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                {feedback.ok ? "Solved!" : "Not quite — try again."}
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={retry}
              className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-md border bg-background text-xs font-medium hover:bg-secondary"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
            <button
              onClick={next}
              className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-md bg-primary text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              Next
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
