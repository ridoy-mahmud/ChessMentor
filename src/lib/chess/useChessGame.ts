import { Chess, type Move, type Square } from "chess.js";
import { useCallback, useMemo, useRef, useState } from "react";
import { playSound } from "./sounds";

export type GameStatus =
  | { kind: "playing"; turn: "w" | "b"; inCheck: boolean }
  | { kind: "checkmate"; winner: "w" | "b" }
  | { kind: "stalemate" }
  | { kind: "draw"; reason: string };

export type LegalTarget = { to: Square; capture: boolean };

export function useChessGame() {
  const gameRef = useRef(new Chess());
  const [, setTick] = useState(0);
  const bump = useCallback(() => setTick((t) => t + 1), []);
  // Redo stack for undone moves (verbose move objects, replayed via SAN).
  const redoRef = useRef<Move[]>([]);

  const status: GameStatus = useMemo(() => {
    const g = gameRef.current;
    if (g.isCheckmate()) return { kind: "checkmate", winner: g.turn() === "w" ? "b" : "w" };
    if (g.isStalemate()) return { kind: "stalemate" };
    if (g.isDraw()) {
      let reason = "draw";
      if (g.isInsufficientMaterial()) reason = "insufficient material";
      else if (g.isThreefoldRepetition()) reason = "threefold repetition";
      else reason = "50-move rule";
      return { kind: "draw", reason };
    }
    return { kind: "playing", turn: g.turn(), inCheck: g.inCheck() };
  }, [gameRef.current.fen()]); // eslint-disable-line react-hooks/exhaustive-deps

  const history = gameRef.current.history({ verbose: true }) as Move[];
  const lastMove = history[history.length - 1];

  const kingSquare = useCallback((color: "w" | "b"): Square | null => {
    const board = gameRef.current.board();
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const p = board[r][f];
        if (p && p.type === "k" && p.color === color) return p.square;
      }
    }
    return null;
  }, []);

  const legalTargets = useCallback((from: Square): LegalTarget[] => {
    const moves = gameRef.current.moves({ square: from, verbose: true }) as Move[];
    return moves.map((m) => ({ to: m.to as Square, capture: !!m.captured || m.flags.includes("e") }));
  }, []);

  const finalizeStatusSound = useCallback((prevInCheck: boolean) => {
    const g = gameRef.current;
    if (g.isCheckmate()) {
      playSound("win");
      return;
    }
    if (g.isStalemate() || g.isDraw()) {
      playSound("draw");
      return;
    }
    if (g.inCheck() && !prevInCheck) playSound("check");
  }, []);

  const tryMove = useCallback(
    (from: Square, to: Square, promotion?: "q" | "r" | "b" | "n"): Move | null => {
      const g = gameRef.current;
      const prevInCheck = g.inCheck();
      let move: Move | null = null;
      try {
        move = g.move({ from, to, promotion: promotion ?? "q" }) as Move | null;
      } catch {
        move = null;
      }
      if (!move) {
        playSound("illegal");
        return null;
      }
      redoRef.current = [];
      // Sound: prioritize special events, otherwise capture > move.
      if (move.flags.includes("p")) playSound("promotion");
      else if (move.flags.includes("k") || move.flags.includes("q")) playSound("castle");
      else if (move.captured) playSound("capture");
      else playSound("move");
      finalizeStatusSound(prevInCheck);
      bump();
      return move;
    },
    [bump, finalizeStatusSound],
  );

  const reset = useCallback(() => {
    gameRef.current = new Chess();
    redoRef.current = [];
    playSound("gameStart");
    bump();
  }, [bump]);

  const loadFen = useCallback(
    (fen: string, opts: { silent?: boolean } = {}) => {
      gameRef.current = new Chess(fen);
      redoRef.current = [];
      if (!opts.silent) playSound("gameStart");
      bump();
    },
    [bump],
  );

  const undo = useCallback(() => {
    const undone = gameRef.current.undo();
    if (undone) {
      redoRef.current.push(undone as Move);
      playSound("move");
      bump();
    }
  }, [bump]);

  const redo = useCallback(() => {
    const next = redoRef.current.pop();
    if (!next) return;
    const g = gameRef.current;
    const prevInCheck = g.inCheck();
    try {
      const m = g.move(next.san);
      if (m) {
        if (m.captured) playSound("capture");
        else playSound("move");
        finalizeStatusSound(prevInCheck);
        bump();
      }
    } catch {
      /* noop */
    }
  }, [bump, finalizeStatusSound]);

  return {
    fen: gameRef.current.fen(),
    pgn: gameRef.current.pgn(),
    turn: gameRef.current.turn(),
    status,
    history,
    lastMove,
    legalTargets,
    kingSquare,
    tryMove,
    reset,
    loadFen,
    undo,
    redo,
    canUndo: history.length > 0,
    canRedo: redoRef.current.length > 0,
  };
}
