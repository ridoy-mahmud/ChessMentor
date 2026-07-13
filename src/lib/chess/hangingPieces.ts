import { Chess, type Square } from "chess.js";

export type HangingPiece = {
  square: Square;
  color: "w" | "b";
  type: string;
  value: number;
};

const VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/**
 * Find pieces that are attacked more times than defended, or attacked by a
 * lower-value piece — a lightweight "hanging" heuristic.
 * Uses chess.js's `attackers` API (>=1.4).
 */
export function findHangingPieces(fen: string): HangingPiece[] {
  const g = new Chess(fen);
  const result: HangingPiece[] = [];
  const board = g.board();
  for (const row of board) {
    for (const sq of row) {
      if (!sq) continue;
      if (sq.type === "k") continue;
      const enemy = sq.color === "w" ? "b" : "w";
      // chess.js attackers(square, color) => squares of that color attacking `square`
      const attackers = g.attackers(sq.square, enemy);
      if (attackers.length === 0) continue;
      const defenders = g.attackers(sq.square, sq.color);
      // Undefended and attacked = hanging
      if (defenders.length === 0) {
        result.push({
          square: sq.square,
          color: sq.color,
          type: sq.type,
          value: VAL[sq.type],
        });
        continue;
      }
      // Attacked by a lower-value piece = also effectively hanging
      const attackerValues = attackers.map((a) => {
        const p = g.get(a);
        return p ? VAL[p.type] : 99;
      });
      const minAttacker = Math.min(...attackerValues);
      if (minAttacker < VAL[sq.type]) {
        result.push({
          square: sq.square,
          color: sq.color,
          type: sq.type,
          value: VAL[sq.type],
        });
      }
    }
  }
  return result;
}
