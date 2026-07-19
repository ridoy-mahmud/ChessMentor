import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Chess } from "chess.js";
import { RotateCcw, Trash2 } from "lucide-react";
import { Chessboard } from "react-chessboard";
import { useSettings } from "@/lib/chess/settings";

export const Route = createFileRoute("/editor")({
  head: () => ({
    meta: [
      { title: "Board editor — ChessMentor" },
      { name: "description", content: "Set up any chess position and analyze it." },
    ],
  }),
  component: EditorPage,
});

const PIECES = ["wK", "wQ", "wR", "wB", "wN", "wP", "bK", "bQ", "bR", "bB", "bN", "bP"];

function EditorPage() {
  const { showCoords } = useSettings();
  const [board, setBoard] = useState<Record<string, string>>(() => startingBoard());
  const [side, setSide] = useState<"w" | "b">("w");
  const [selected, setSelected] = useState<string | null>(null);

  const fen = useMemo(() => buildFen(board, side), [board, side]);
  const legal = useMemo(() => {
    try {
      const g = new Chess(fen);
      return { ok: true, turn: g.turn(), inCheck: g.inCheck() };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }, [fen]);

  const clear = () => setBoard({});
  const reset = () => setBoard(startingBoard());

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold">Board editor</h1>
        <p className="mt-1 text-muted-foreground">
          Drop pieces onto squares, then analyze the position or play from it.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="mx-auto w-full max-w-[min(80vh,640px)]">
          <div className="overflow-hidden rounded-xl border bg-card shadow-e2">
            <Chessboard
              options={{
                id: "editor-board",
                position: fen,
                showNotation: showCoords,
                animationDurationInMs: 0,
                lightSquareStyle: { backgroundColor: "var(--board-light)" },
                darkSquareStyle: { backgroundColor: "var(--board-dark)" },
                onSquareClick: ({ square }) => {
                  const sq = square as string;
                  if (selected) {
                    setBoard((b) => ({ ...b, [sq]: selected }));
                    return;
                  }
                  setBoard((b) => {
                    const nb = { ...b };
                    delete nb[sq];
                    return nb;
                  });
                },
              }}
            />
          </div>
          <p className="mt-3 font-data text-xs text-muted-foreground break-all">FEN: {fen}</p>
          {!legal.ok && (
            <p className="mt-1 text-xs text-destructive">Illegal position: {legal.error}</p>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <div className="rounded-xl border bg-card p-4 shadow-e1">
            <div className="label-caps mb-2 text-muted-foreground">Piece palette</div>
            <div className="grid grid-cols-6 gap-1">
              {PIECES.map((p) => (
                <button
                  key={p}
                  onClick={() => setSelected(p)}
                  className={`h-11 rounded-md border font-data text-sm ${
                    selected === p
                      ? "border-primary bg-primary/10 text-primary"
                      : "bg-background hover:bg-secondary"
                  }`}
                  title={p}
                >
                  {glyph(p)}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Pick a piece, then click a square to place. Click a square with no
              piece selected to clear it.
            </p>
          </div>

          <div className="rounded-xl border bg-card p-4 shadow-e1">
            <div className="label-caps mb-2 text-muted-foreground">Side to move</div>
            <div className="grid grid-cols-2 gap-2">
              {(["w", "b"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSide(s)}
                  className={`h-11 rounded-md border text-xs font-medium ${
                    side === s
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background hover:bg-secondary"
                  }`}
                >
                  {s === "w" ? "White" : "Black"}
                </button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={clear}
                className="inline-flex h-11 items-center gap-1.5 rounded-md border bg-background px-3 text-xs font-medium hover:bg-secondary"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </button>
              <button
                onClick={reset}
                className="inline-flex h-11 items-center gap-1.5 rounded-md border bg-background px-3 text-xs font-medium hover:bg-secondary"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function startingBoard(): Record<string, string> {
  const b: Record<string, string> = {};
  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const back = ["R", "N", "B", "Q", "K", "B", "N", "R"];
  files.forEach((f, i) => {
    b[`${f}1`] = "w" + back[i];
    b[`${f}2`] = "wP";
    b[`${f}7`] = "bP";
    b[`${f}8`] = "b" + back[i];
  });
  return b;
}

function buildFen(board: Record<string, string>, side: "w" | "b"): string {
  const ranks: string[] = [];
  for (let r = 8; r >= 1; r--) {
    let row = "";
    let empty = 0;
    for (const f of ["a", "b", "c", "d", "e", "f", "g", "h"]) {
      const p = board[`${f}${r}`];
      if (!p) {
        empty++;
        continue;
      }
      if (empty > 0) {
        row += empty;
        empty = 0;
      }
      const letter = p[1];
      row += p[0] === "w" ? letter.toUpperCase() : letter.toLowerCase();
    }
    if (empty > 0) row += empty;
    ranks.push(row);
  }
  return `${ranks.join("/")} ${side} - - 0 1`;
}

function glyph(p: string): string {
  const map: Record<string, string> = {
    wK: "♔", wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙",
    bK: "♚", bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟",
  };
  return map[p] ?? p;
}
