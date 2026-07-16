import { Chessboard } from "react-chessboard";
import type { Square } from "chess.js";
import { useMemo, useState } from "react";
import { useSettings } from "@/lib/chess/settings";
import { BoardQuickSwitch } from "./BoardQuickSwitch";
import type { useChessGame } from "@/lib/chess/useChessGame";

type Game = ReturnType<typeof useChessGame>;

export type BoardArrow = {
  from: string;
  to: string;
  color?: string;
};

export type SquareHighlight = {
  square: string;
  color: string; // css color
  ring?: boolean;
};

type Props = {
  game: Game;
  arrows?: BoardArrow[];
  interactive?: boolean;
  highlights?: SquareHighlight[];
  /** Enable right-click circle annotations (Phase 12). Default true. */
  enableAnnotations?: boolean;
};

export function ChessBoard({
  game,
  arrows,
  interactive = true,
  highlights,
  enableAnnotations = true,
}: Props) {
  const { showCoords, boardOrientation } = useSettings();
  const [selected, setSelected] = useState<Square | null>(null);
  const [circles, setCircles] = useState<Set<string>>(new Set());

  const targets = useMemo(
    () => (selected ? game.legalTargets(selected) : []),
    [selected, game],
  );

  const squareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};

    // Last-move highlight
    if (game.lastMove) {
      styles[game.lastMove.from] = { background: "var(--color-board-lastmove)" };
      styles[game.lastMove.to] = { background: "var(--color-board-lastmove)" };
    }

    // External highlights (hanging pieces, etc.)
    if (highlights) {
      for (const h of highlights) {
        styles[h.square] = {
          ...styles[h.square],
          boxShadow: h.ring
            ? `inset 0 0 0 3px ${h.color}`
            : styles[h.square]?.boxShadow,
          background: h.ring
            ? styles[h.square]?.background
            : (h.color as string),
        };
      }
    }

    // Check highlight
    if (game.status.kind === "playing" && game.status.inCheck) {
      const ksq = game.kingSquare(game.status.turn);
      if (ksq) {
        styles[ksq] = {
          background:
            "radial-gradient(circle, var(--color-board-check) 0%, transparent 75%)",
        };
      }
    } else if (game.status.kind === "checkmate") {
      const loser = game.status.winner === "w" ? "b" : "w";
      const ksq = game.kingSquare(loser);
      if (ksq) {
        styles[ksq] = {
          background:
            "radial-gradient(circle, var(--color-board-check) 0%, transparent 75%)",
        };
      }
    }

    // User right-click circles
    for (const c of circles) {
      styles[c] = {
        ...styles[c],
        boxShadow: "inset 0 0 0 3px rgba(217, 119, 6, 0.85)",
      };
    }

    // Selected + legal targets
    if (selected) {
      styles[selected] = {
        ...styles[selected],
        background: "var(--color-board-highlight)",
      };
      for (const t of targets) {
        styles[t.to] = {
          ...styles[t.to],
          background: t.capture
            ? "radial-gradient(circle, transparent 55%, var(--color-board-highlight) 56%, var(--color-board-highlight) 68%, transparent 69%)"
            : "radial-gradient(circle, var(--color-board-highlight) 22%, transparent 24%)",
        };
      }
    }

    return styles;
  }, [game, selected, targets, highlights, circles]);

  const attemptMove = (from: Square, to: Square) => {
    const move = game.tryMove(from, to);
    setSelected(null);
    return !!move;
  };

  return (
    <div className="mx-auto w-full max-w-[min(80vh,640px)]">
      <div className="mb-2 flex justify-end">
        <BoardQuickSwitch />
      </div>
      <div className="overflow-hidden rounded-xl border bg-card shadow-e2">
        <Chessboard
          options={{
            id: "main-board",
            position: game.fen,
            boardOrientation,
            showNotation: showCoords,
            animationDurationInMs: 180,
            allowDrawingArrows: interactive || enableAnnotations,
            arrows: arrows?.map((a) => ({
              startSquare: a.from,
              endSquare: a.to,
              color: a.color ?? "rgba(15, 118, 110, 0.85)",
            })),
            lightSquareStyle: { backgroundColor: "var(--color-board-light)" },
            darkSquareStyle: { backgroundColor: "var(--color-board-dark)" },
            squareStyles,
            darkSquareNotationStyle: {
              color: "var(--color-board-light)",
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              opacity: 0.7,
            },
            lightSquareNotationStyle: {
              color: "var(--color-board-dark)",
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              opacity: 0.7,
            },
            onPieceDrop: ({ sourceSquare, targetSquare }) => {
              if (!interactive) return false;
              if (!targetSquare) return false;
              return attemptMove(sourceSquare as Square, targetSquare as Square);
            },
            onSquareClick: ({ square, piece }) => {
              // Clear annotations on any left-click
              if (circles.size > 0) setCircles(new Set());
              if (!interactive) return;
              const sq = square as Square;
              if (selected) {
                if (sq === selected) {
                  setSelected(null);
                  return;
                }
                const isTarget = targets.some((t) => t.to === sq);
                if (isTarget) {
                  attemptMove(selected, sq);
                  return;
                }
                if (piece && piece.pieceType[0] === game.turn) {
                  setSelected(sq);
                  return;
                }
                setSelected(null);
                return;
              }
              if (piece && piece.pieceType[0] === game.turn) {
                setSelected(sq);
              }
            },
          }}
        />
      </div>
    </div>
  );
}
