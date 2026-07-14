// Phase 13 hero: ambient looping chessboard. Plays a canonical short game
// on a loop with slow animations. Non-interactive, muted colors,
// respects prefers-reduced-motion.

import { useEffect, useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";

// Short famous excerpt (Morphy Opera Game opening) — loops.
const GAME = [
  "e4", "e5", "Nf3", "d6", "d4", "Bg4", "dxe5", "Bxf3", "Qxf3", "dxe5",
  "Bc4", "Nf6", "Qb3", "Qe7", "Nc3", "c6", "Bg5", "b5", "Nxb5",
];

export function AmbientBoard({ tilt = true }: { tilt?: boolean }) {
  const [fen, setFen] = useState(() => new Chess().fen());
  const [tiltX, setTiltX] = useState(0);
  const [tiltY, setTiltY] = useState(0);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const game = new Chess();
    let ply = 0;
    const advance = () => {
      if (ply >= GAME.length) {
        game.reset();
        ply = 0;
      } else {
        try {
          game.move(GAME[ply]);
          ply++;
        } catch {
          game.reset();
          ply = 0;
        }
      }
      setFen(game.fen());
    };
    const id = setInterval(advance, 1600);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!tilt) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const onMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 4; // ±2deg
      const ny = (e.clientY / window.innerHeight - 0.5) * 4;
      setTiltX(-ny);
      setTiltY(nx);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [tilt]);

  return (
    <div
      className="pointer-events-none relative aspect-square w-full max-w-[520px]"
      style={{
        transform: `perspective(1200px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
        transition: "transform 300ms ease-out",
      }}
      aria-hidden="true"
    >
      <div className="absolute inset-0 rounded-2xl opacity-70 mix-blend-multiply dark:mix-blend-normal dark:opacity-50">
        <Chessboard
          options={{
            id: "ambient-board",
            position: fen,
            allowDragging: false,
            showNotation: false,
            animationDurationInMs: 900,
            lightSquareStyle: { backgroundColor: "var(--color-board-light)" },
            darkSquareStyle: { backgroundColor: "var(--color-board-dark)" },
          }}
        />
      </div>
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-tr from-background/60 via-transparent to-background/30" />
    </div>
  );
}
