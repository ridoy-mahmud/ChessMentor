// Phase 15: Win / Loss / Draw celebration overlay.
// Respects prefers-reduced-motion. Auto-dismisses after 4s, click anywhere to dismiss.

import { useEffect, useState } from "react";
import { Crown, Handshake, Sparkles, TrendingDown, X } from "lucide-react";
import { Confetti } from "./Confetti";
import type { BotProfile } from "@/lib/chess/bots";

export type GameOutcome = {
  kind: "win" | "loss" | "draw";
  method: string; // "checkmate" | "resignation" | "time" | ...
  bot?: BotProfile;
  onReview?: () => void;
  onNewGame?: () => void;
};

type Props = {
  outcome: GameOutcome | null;
  onDismiss: () => void;
};

export function GameOverOverlay({ outcome, onDismiss }: Props) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!outcome) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 4500);
    return () => clearTimeout(t);
  }, [outcome]);

  useEffect(() => {
    if (!visible && outcome) {
      // Small delay before parent clears
      const t = setTimeout(() => onDismiss(), 200);
      return () => clearTimeout(t);
    }
  }, [visible, outcome, onDismiss]);

  if (!outcome) return null;

  const isWin = outcome.kind === "win";
  const isLoss = outcome.kind === "loss";
  const isDraw = outcome.kind === "draw";

  const botLine = outcome.bot
    ? isWin
      ? outcome.bot.onLoss
      : isLoss
      ? outcome.bot.onWin
      : outcome.bot.onDraw
    : null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onClick={() => setVisible(false)}
      role="dialog"
      aria-live="polite"
    >
      <Confetti active={isWin && visible} />
      <div
        className={`relative mx-4 w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-e3 transition-transform duration-300 ${
          visible ? "scale-100" : "scale-95"
        } ${
          isWin
            ? "border-primary/40"
            : isLoss
            ? "border-muted-foreground/20"
            : "border-amber/40"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setVisible(false)}
          aria-label="Dismiss"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div
          className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${
            isWin
              ? "bg-primary/10 text-primary"
              : isLoss
              ? "bg-muted text-muted-foreground"
              : "bg-amber/10 text-amber"
          }`}
        >
          {isWin && <Crown className="h-8 w-8" />}
          {isLoss && <TrendingDown className="h-8 w-8" />}
          {isDraw && <Handshake className="h-8 w-8" />}
        </div>

        <h2 className="mt-5 font-display text-3xl font-semibold">
          {isWin && "You Win!"}
          {isLoss && "Good fight"}
          {isDraw && "Drawn game"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {isWin && `by ${outcome.method}`}
          {isLoss && "Let's see what to learn from this."}
          {isDraw && "Balanced from both sides."}
        </p>

        {outcome.bot && (
          <div className="mt-5 flex items-center gap-3 rounded-lg border bg-background/60 p-3 text-left">
            <img
              src={outcome.bot.avatar}
              alt={outcome.bot.name}
              width={40}
              height={40}
              className="h-10 w-10 rounded-full object-cover"
              loading="lazy"
            />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold">{outcome.bot.name}</div>
              <div className="text-xs italic text-muted-foreground">
                "{botLine}"
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {outcome.onReview && (
            <button
              onClick={outcome.onReview}
              className="inline-flex h-11 items-center gap-1.5 rounded-md border bg-background px-4 text-xs font-medium hover:bg-secondary"
            >
              <Sparkles className="h-3.5 w-3.5" /> Review this game
            </button>
          )}
          {outcome.onNewGame && (
            <button
              onClick={outcome.onNewGame}
              className="inline-flex h-11 items-center gap-1.5 rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              New game
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
