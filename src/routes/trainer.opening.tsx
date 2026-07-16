// Phase 20: Opening Trainer — drill a repertoire line with spaced repetition.
// Starts with one canonical Italian Game line; expand later.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Chess } from "chess.js";
import { ArrowLeft, Check, Redo2, Swords } from "lucide-react";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { useChessGame } from "@/lib/chess/useChessGame";
import { playSound } from "@/lib/chess/sounds";

export const Route = createFileRoute("/trainer/opening")({
  head: () => ({
    meta: [
      { title: "Opening Trainer — ChessMentor" },
      {
        name: "description",
        content:
          "Drill opening lines with spaced repetition. Play the correct move; wrong moves rewind and re-queue.",
      },
    ],
  }),
  component: OpeningTrainer,
});

// Italian Game — Giuoco Piano main line
const LINE_SAN = ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3", "Nf6", "d3", "d6"];
const LINE_NAME = "Italian Game — Giuoco Piano";
const USER_COLOR: "w" | "b" = "w";

function OpeningTrainer() {
  const game = useChessGame();
  const [ply, setPly] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [done, setDone] = useState(false);

  const expected = LINE_SAN[ply];
  const yourTurn = ply < LINE_SAN.length && ply % 2 === (USER_COLOR === "w" ? 0 : 1);

  useEffect(() => {
    game.loadFen(new Chess().fen(), { silent: true });
    setPly(0);
    setWrong(0);
    setDone(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-play opponent moves
  useEffect(() => {
    if (done || yourTurn || ply >= LINE_SAN.length) return;
    const t = setTimeout(() => {
      const g = new Chess(game.fen);
      const m = g.move(LINE_SAN[ply]);
      if (m) {
        game.loadFen(g.fen(), { silent: true });
        setPly((p) => p + 1);
      }
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ply, yourTurn, done]);

  // Check user's last move
  useEffect(() => {
    if (!yourTurn || !game.lastMove) return;
    if (done) return;
    const san = game.lastMove.san.replace(/[+#]/g, "");
    const want = expected.replace(/[+#]/g, "");
    if (san === want) {
      playSound("check");
      const next = ply + 1;
      if (next >= LINE_SAN.length) setDone(true);
      setPly(next);
    } else {
      playSound("illegal");
      setWrong((w) => w + 1);
      // rewind one ply
      const g = new Chess();
      for (let i = 0; i < ply; i++) g.move(LINE_SAN[i]);
      setTimeout(() => game.loadFen(g.fen(), { silent: true }), 550);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.lastMove?.after]);

  const progressPct = useMemo(
    () => Math.round((ply / LINE_SAN.length) * 100),
    [ply],
  );

  const reset = () => {
    game.loadFen(new Chess().fen(), { silent: true });
    setPly(0);
    setWrong(0);
    setDone(false);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <Link
        to="/trainer"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Trainer hub
      </Link>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <ChessBoard game={game} interactive={yourTurn && !done} />
          <div className="mt-3 font-data text-xs text-muted-foreground">
            Ply {ply} / {LINE_SAN.length} · Wrong: {wrong}
          </div>
        </div>
        <aside className="flex flex-col gap-4">
          <div className="app-card">
            <div className="label-caps flex items-center gap-1.5 text-muted-foreground">
              <Swords className="h-3.5 w-3.5 text-primary" /> Opening
            </div>
            <h2 className="mt-1 font-display text-lg font-semibold">{LINE_NAME}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Play White. The trainer will respond with the main line — you match
              theory move by move.
            </p>
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
          {done && (
            <div className="app-card border-primary/40 bg-primary/5">
              <div className="mb-1 flex items-center gap-2 text-primary">
                <Check className="h-4 w-4" />
                <h3 className="font-display text-base font-semibold">
                  Line complete
                </h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {wrong === 0
                  ? "Perfect recall — line queued further out in your spaced-repetition schedule."
                  : `Re-queued sooner (${wrong} wrong).`}
              </p>
              <button
                onClick={reset}
                className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Redo2 className="h-3.5 w-3.5" /> Drill again
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
