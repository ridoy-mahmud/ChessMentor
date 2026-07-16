import { useEffect, useMemo, useRef, useState } from "react";
import { Chess, type Move } from "chess.js";
import {
  Check,
  Eye,
  Lightbulb,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ChessBoard, type BoardArrow, type SquareHighlight } from "@/components/chess/ChessBoard";
import { EvalBar } from "@/components/chess/EvalBar";
import { useChessGame } from "@/lib/chess/useChessGame";
import { analyze, preloadEngine, type Evaluation } from "@/lib/chess/engine";
import type { Lesson } from "@/lib/chess/lessons";
import { recordLessonResult } from "@/lib/chess/progress";
import { playSound } from "@/lib/chess/sounds";
import { useSettings, toggleSocratic } from "@/lib/chess/settings";

type Feedback =
  | { kind: "idle" }
  | { kind: "correct"; explanation?: string }
  | { kind: "wrong"; message: string }
  | { kind: "hint"; message: string; tier: 1 | 2 | 3 };

function arrowFromSan(fen: string, san: string): BoardArrow | null {
  try {
    const g = new Chess(fen);
    const m = g.move(san) as Move | null;
    if (!m) return null;
    return { from: m.from, to: m.to };
  } catch {
    return null;
  }
}

function squareOfSan(fen: string, san: string): string | null {
  const a = arrowFromSan(fen, san);
  return a ? a.from : null;
}

export function LessonRunner({ lesson }: { lesson: Lesson }) {
  const game = useChessGame();
  const { boardOrientation, socratic } = useSettings();
  const [stepIndex, setStepIndex] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>({ kind: "idle" });
  const [hintTier, setHintTier] = useState<0 | 1 | 2 | 3>(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [hintCount, setHintCount] = useState(0);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [complete, setComplete] = useState(false);
  const [watchIndex, setWatchIndex] = useState<number | null>(null);
  const [watchNarration, setWatchNarration] = useState<string>("");
  const recordedRef = useRef(false);

  const step = lesson.steps[stepIndex];

  useEffect(() => {
    if (!step) return;
    game.loadFen(step.fen, { silent: true });
    setFeedback({ kind: "idle" });
    setHintTier(0);
    setWatchIndex(null);
    setWatchNarration("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, lesson.id]);

  useEffect(() => {
    preloadEngine();
  }, []);

  useEffect(() => {
    if (!step) return;
    let cancelled = false;
    setAnalyzing(true);
    analyze(game.fen, { depth: 12 }).then((e) => {
      if (!cancelled) {
        setEvaluation(e);
        setAnalyzing(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [game.fen, step]);

  useEffect(() => {
    if (!step || complete) return;
    if (!game.lastMove) return;
    if (game.fen === step.fen) return;
    const san = game.lastMove.san;
    const isCorrect = step.bestMoves.some(
      (m) => m.replace(/[+#]/g, "") === san.replace(/[+#]/g, ""),
    );
    if (isCorrect) {
      playSound("check");
      setFeedback({ kind: "correct", explanation: step.explanation });
      const isLast = stepIndex === lesson.steps.length - 1;
      if (isLast) {
        setComplete(true);
      } else {
        const t = setTimeout(() => setStepIndex((i) => i + 1), 1100);
        return () => clearTimeout(t);
      }
    } else {
      playSound("illegal");
      setWrongCount((c) => c + 1);
      setFeedback({
        kind: "wrong",
        message: `${san} isn't the move.`,
      });
      const t = setTimeout(() => {
        game.loadFen(step.fen, { silent: true });
      }, 700);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.lastMove?.after]);

  useEffect(() => {
    if (complete && !recordedRef.current) {
      recordedRef.current = true;
      recordLessonResult(lesson.id, {
        wrongMoves: wrongCount,
        hintsUsed: hintCount,
      });
      playSound("win");
    }
  }, [complete, lesson.id, wrongCount, hintCount]);

  const hintHighlights = useMemo<SquareHighlight[]>(() => {
    if (!step || hintTier < 2) return [];
    const sq = squareOfSan(step.fen, step.bestMoves[0]);
    if (!sq) return [];
    return [{ square: sq, color: "rgba(217, 119, 6, 0.7)", ring: true }];
  }, [step, hintTier]);

  const hintArrow = useMemo<BoardArrow[]>(() => {
    if (!step || hintTier < 3) return [];
    const a = arrowFromSan(step.fen, step.bestMoves[0]);
    return a ? [{ ...a, color: "rgba(15, 118, 110, 0.9)" }] : [];
  }, [step, hintTier]);

  const bestMoveArrow = useMemo<BoardArrow[]>(() => {
    if (!evaluation?.bestMove) return [];
    if (hintTier >= 3) return [];
    if (feedback.kind === "correct") return [];
    if (watchIndex !== null) return [];
    const from = evaluation.bestMove.slice(0, 2);
    const to = evaluation.bestMove.slice(2, 4);
    return [{ from, to, color: "rgba(120, 120, 120, 0.32)" }];
  }, [evaluation, hintTier, feedback, watchIndex]);

  const arrows = [...bestMoveArrow, ...hintArrow];

  const restart = () => {
    setStepIndex(0);
    setWrongCount(0);
    setHintCount(0);
    setComplete(false);
    recordedRef.current = false;
    setFeedback({ kind: "idle" });
    setHintTier(0);
  };

  const advanceHint = () => {
    if (!step) return;
    const nextTier = Math.min(3, hintTier + 1) as 1 | 2 | 3;
    setHintTier(nextTier);
    if (nextTier === hintTier) return;
    setHintCount((c) => c + 1);
    const messages: Record<1 | 2 | 3, string> = {
      1: step.hint.length > 0 ? step.hint : "Look for the most active piece.",
      2: `Focus on the highlighted square — the key piece is there.`,
      3: `Play ${step.bestMoves[0]}.`,
    };
    setFeedback({ kind: "hint", message: messages[nextTier], tier: nextTier });
  };

  // Watch me calculate: animate PV
  const watchMe = async () => {
    if (!evaluation?.pv || evaluation.pv.length === 0) return;
    const g = new Chess(step.fen);
    const pv = evaluation.pv.slice(0, 6);
    for (let i = 0; i < pv.length; i++) {
      const uci = pv[i];
      const move = g.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: (uci[4] as "q" | "r" | "b" | "n") ?? "q",
      });
      if (!move) break;
      setWatchIndex(i);
      game.loadFen(g.fen(), { silent: true });
      const narration =
        i === 0
          ? `The engine plays ${move.san} first — this is the strongest move.`
          : i % 2 === 0
            ? `Then ${move.san} — keeping the initiative.`
            : `Best defense: ${move.san}.`;
      setWatchNarration(narration);
      await new Promise((r) => setTimeout(r, 700));
    }
    // Reset to step position
    setTimeout(() => {
      game.loadFen(step.fen, { silent: true });
      setWatchIndex(null);
      setWatchNarration("");
    }, 1200);
  };

  const socraticPrompt = socratic && step && feedback.kind === "idle"
    ? "Before you move: what does the position ask for? Look at threats, active pieces, and undefended squares."
    : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[24px_minmax(0,1fr)_360px]">
      <div className="hidden h-[min(80vh,640px)] lg:block">
        <EvalBar
          evaluation={evaluation}
          loading={analyzing}
          orientation={boardOrientation}
        />
      </div>

      <div className="min-w-0">
        <ChessBoard
          game={game}
          arrows={arrows}
          highlights={hintHighlights}
          interactive={!complete && watchIndex === null}
        />
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="font-data">
            Step {Math.min(stepIndex + 1, lesson.steps.length)} of {lesson.steps.length}
          </span>
          <span className="font-data">
            Wrong: {wrongCount} · Hints: {hintCount}
          </span>
          <span className="ml-auto font-data">
            Engine: {evaluation?.source ?? "…"}
            {evaluation ? ` · d${evaluation.depth}` : ""}
          </span>
        </div>
        {watchNarration && (
          <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
            <span className="label-caps text-primary">Coach</span>
            <p className="mt-1">{watchNarration}</p>
          </div>
        )}
      </div>

      <aside className="flex flex-col gap-4">
        <div className="rounded-xl border bg-card p-5 shadow-e1">
          <div className="label-caps mb-2 flex items-center gap-1.5 text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Lesson
          </div>
          <h2 className="font-display text-lg font-semibold">{lesson.title}</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">{lesson.blurb}</p>
        </div>

        {step && !complete && (
          <div className="rounded-xl border bg-card p-5 shadow-e1">
            <p className="text-sm">{step.prompt}</p>
            {socraticPrompt && (
              <p className="mt-2 rounded-md bg-amber/10 p-2 text-xs text-amber-foreground/90 [color:var(--color-amber)]">
                {socraticPrompt}
              </p>
            )}
            <FeedbackBlock feedback={feedback} />
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={advanceHint}
                disabled={hintTier >= 3}
                className="inline-flex h-11 items-center gap-1.5 rounded-md border bg-background px-3 text-xs font-medium transition-colors hover:bg-secondary disabled:opacity-40"
              >
                {hintTier === 0 && <Lightbulb className="h-3.5 w-3.5" />}
                {hintTier === 1 && <Target className="h-3.5 w-3.5" />}
                {hintTier >= 2 && <Eye className="h-3.5 w-3.5" />}
                {hintTier === 0
                  ? "Hint (concept)"
                  : hintTier === 1
                    ? "Highlight square"
                    : hintTier === 2
                      ? "Show me the move"
                      : "Move revealed"}
              </button>
              <button
                onClick={watchMe}
                disabled={watchIndex !== null || !evaluation?.pv?.length}
                className="inline-flex h-11 items-center gap-1.5 rounded-md border bg-background px-3 text-xs font-medium transition-colors hover:bg-secondary disabled:opacity-40"
              >
                <Play className="h-3.5 w-3.5" />
                Watch me calculate
              </button>
              <button
                onClick={() => {
                  game.loadFen(step.fen, { silent: true });
                  setFeedback({ kind: "idle" });
                  setHintTier(0);
                }}
                className="inline-flex h-11 items-center gap-1.5 rounded-md border bg-background px-3 text-xs font-medium transition-colors hover:bg-secondary"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
            </div>
            <div className="mt-4 border-t pt-3">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={socratic}
                  onChange={toggleSocratic}
                  className="h-3.5 w-3.5 accent-[color:var(--color-primary)]"
                />
                Socratic mode — ask before telling
              </label>
            </div>
          </div>
        )}

        {complete && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 shadow-e2">
            <div className="mb-1 flex items-center gap-2 text-primary">
              <Check className="h-4 w-4" />
              <h3 className="font-display text-base font-semibold">Lesson complete</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {wrongCount === 0 && hintCount === 0
                ? "Perfect run — three stars."
                : hintCount === 0 && wrongCount <= 2
                  ? "Nicely done."
                  : "You got there — try again for a cleaner run."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={restart}
                className="inline-flex h-11 items-center gap-1.5 rounded-md border bg-background px-3 text-xs font-medium transition-colors hover:bg-secondary"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Try again
              </button>
              <Link
                to="/trainer"
                className="inline-flex h-11 items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-3 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
              >
                <Target className="h-3.5 w-3.5" />
                Drill this in Trainer
              </Link>
              <Link
                to="/learn"
                className="inline-flex h-11 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Back to lessons
              </Link>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function FeedbackBlock({ feedback }: { feedback: Feedback }) {
  if (feedback.kind === "idle") return null;
  if (feedback.kind === "correct") {
    return (
      <div className="mt-3 flex items-start gap-2 rounded-md bg-primary/10 p-3 text-sm text-primary">
        <Check className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          <span className="font-medium">Correct.</span>{" "}
          {feedback.explanation ?? "Nice move."}
        </span>
      </div>
    );
  }
  if (feedback.kind === "wrong") {
    return (
      <div className="mt-3 flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
        <X className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{feedback.message}</span>
      </div>
    );
  }
  return (
    <div className="mt-3 flex items-start gap-2 rounded-md bg-accent p-3 text-sm text-accent-foreground">
      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        <span className="label-caps mr-1.5">Tier {feedback.tier}</span>
        {feedback.message}
      </span>
    </div>
  );
}
