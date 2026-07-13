import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Chess } from "chess.js";
import { Check, ChevronRight, X } from "lucide-react";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { useChessGame } from "@/lib/chess/useChessGame";

export const Route = createFileRoute("/guess")({
  head: () => ({
    meta: [
      { title: "Guess the move — ChessMentor" },
      { name: "description", content: "Step through a classic chess game and guess each move." },
    ],
  }),
  component: GuessPage,
});

// A short excerpt from a famous game: Morphy Opera Game
const GAME_MOVES = [
  "e4", "e5", "Nf3", "d6", "d4", "Bg4", "dxe5", "Bxf3", "Qxf3", "dxe5",
  "Bc4", "Nf6", "Qb3", "Qe7", "Nc3", "c6", "Bg5", "b5", "Nxb5",
];

function GuessPage() {
  const game = useChessGame();
  const [ply, setPly] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [feedback, setFeedback] = useState<null | { ok: boolean; expected: string; got: string }>(null);
  const [done, setDone] = useState(false);

  // On mount reset to start
  useEffect(() => {
    game.loadFen(new Chess().fen(), { silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const expected = GAME_MOVES[ply];

  // Detect user move
  useEffect(() => {
    if (done) return;
    if (!game.lastMove) return;
    if (feedback) return;
    const played = game.lastMove.san.replace(/[+#]/g, "");
    const target = (expected ?? "").replace(/[+#]/g, "");
    const ok = played === target;
    setFeedback({ ok, expected: expected ?? "", got: game.lastMove.san });
    if (ok) setCorrect((c) => c + 1);
    setTimeout(() => {
      // If wrong, replay the correct move; either way advance.
      if (!ok) {
        game.undo();
        try {
          const g = new Chess(game.fen);
          g.move(expected);
          game.loadFen(g.fen(), { silent: true });
        } catch {
          /* noop */
        }
      }
      setFeedback(null);
      const nextPly = ply + 1;
      if (nextPly >= GAME_MOVES.length) {
        setDone(true);
      } else {
        setPly(nextPly);
      }
    }, 900);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.lastMove?.after]);

  // If it's the opponent's ply (in this excerpt we let the user guess every ply),
  // don't auto-play — user guesses each move.

  const restart = () => {
    game.loadFen(new Chess().fen(), { silent: true });
    setPly(0);
    setCorrect(0);
    setFeedback(null);
    setDone(false);
  };

  const scoreText = useMemo(
    () => `${correct} / ${Math.min(ply + (done ? 0 : 0), GAME_MOVES.length)}`,
    [correct, ply, done],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold">Guess the move</h1>
        <p className="mt-1 text-muted-foreground">
          Morphy vs. Duke of Brunswick, 1858. Play each move and see how you match up.
        </p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <ChessBoard game={game} interactive={!done && !feedback} />
        </div>
        <aside className="flex flex-col gap-4">
          <div className="rounded-xl border bg-card p-4 shadow-e1">
            <div className="label-caps mb-1 text-muted-foreground">Progress</div>
            <div className="font-display text-2xl font-semibold">
              {scoreText}
              <span className="ml-1 text-sm text-muted-foreground">correct</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Move {Math.min(ply + 1, GAME_MOVES.length)} of {GAME_MOVES.length}
            </p>
          </div>
          {feedback && (
            <div
              className={`rounded-xl border p-4 shadow-e1 ${
                feedback.ok
                  ? "border-primary/30 bg-primary/5 text-primary"
                  : "border-destructive/30 bg-destructive/5 text-destructive"
              }`}
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                {feedback.ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                {feedback.ok ? "Match!" : `Played ${feedback.got}, actual: ${feedback.expected}`}
              </div>
            </div>
          )}
          {done && (
            <div className="rounded-xl border bg-card p-4 shadow-e1">
              <h3 className="font-display text-base font-semibold">Game finished</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                You matched {correct} of {GAME_MOVES.length}.
              </p>
              <button
                onClick={restart}
                className="mt-3 inline-flex h-11 items-center gap-1.5 rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                <ChevronRight className="h-3.5 w-3.5" /> Try again
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
