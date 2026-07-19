// Phase 20 — short animated concept intro for each Learn topic.
// Reuses the react-chessboard engine (same as hero/watch mode) to play a
// tiny sequence of moves with captions before the drill begins.

import { useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { Play, SkipForward } from "lucide-react";
import type { LessonIntro } from "@/lib/chess/lessons";

type Props = {
  intro: LessonIntro;
  onDone: () => void;
};

export function ConceptIntro({ intro, onDone }: Props) {
  const gameRef = useRef(new Chess(intro.fen));
  const [fen, setFen] = useState(intro.fen);
  const [i, setI] = useState(-1); // -1 = title card
  const [done, setDone] = useState(false);

  // Reset when intro changes.
  useEffect(() => {
    gameRef.current = new Chess(intro.fen);
    setFen(intro.fen);
    setI(-1);
    setDone(false);
  }, [intro]);

  // Auto-advance the sequence.
  useEffect(() => {
    if (done) return;
    const total = intro.moves.length;
    const stepDelay = i === -1 ? 1200 : 1400;
    const t = setTimeout(() => {
      if (i < total - 1) {
        const next = i + 1;
        try {
          gameRef.current.move(intro.moves[next].san);
          setFen(gameRef.current.fen());
        } catch {
          /* ignore illegal move in intro data */
        }
        setI(next);
      } else if (i === total - 1) {
        // Hold on last frame then finish.
        setDone(true);
        setTimeout(onDone, 900);
      } else {
        setI(0);
      }
    }, stepDelay);
    return () => clearTimeout(t);
  }, [i, done, intro, onDone]);

  const caption = i >= 0 ? intro.moves[i].caption : intro.tagline;
  const total = intro.moves.length;
  const progress = i < 0 ? 0 : ((i + 1) / total) * 100;

  return (
    <div className="animate-page-in grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="relative mx-auto w-full max-w-[min(70vh,520px)]">
        <div className="hero-glow" />
        <div className="relative z-10 overflow-hidden rounded-xl border bg-card shadow-e3">
          <Chessboard
            options={{
              id: "concept-intro-board",
              position: fen,
              allowDragging: false,
              showNotation: false,
              animationDurationInMs: 700,
              lightSquareStyle: { backgroundColor: "var(--board-light)" },
              darkSquareStyle: { backgroundColor: "var(--board-dark)" },
            }}
          />
        </div>
      </div>
      <aside className="flex flex-col justify-center gap-4">
        <div>
          <div className="label-caps mb-2 flex items-center gap-1.5 text-primary">
            <Play className="h-3.5 w-3.5" />
            Concept
          </div>
          <h2 className="font-display text-2xl font-semibold leading-tight">
            {intro.headline}
          </h2>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-e1">
          <p className="text-sm leading-relaxed">{caption}</p>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <button
          onClick={() => {
            setDone(true);
            onDone();
          }}
          className="inline-flex h-10 items-center justify-center gap-1.5 self-start rounded-md border bg-background px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <SkipForward className="h-3.5 w-3.5" />
          Skip intro — go to drill
        </button>
      </aside>
    </div>
  );
}
