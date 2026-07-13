import { createFileRoute } from "@tanstack/react-router";
import {
  Bot,
  Clock,
  Eye,
  EyeOff,
  FlagTriangleRight,
  FlipVertical2,
  GraduationCap,
  Handshake,
  Redo2,
  RotateCcw,
  Swords,
  Undo2,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChessBoard, type BoardArrow, type SquareHighlight } from "@/components/chess/ChessBoard";
import { EvalBar } from "@/components/chess/EvalBar";
import { AccuracyMeter } from "@/components/chess/AccuracyMeter";
import { WinProbSparkline } from "@/components/chess/WinProbSparkline";
import { ThreatRadar } from "@/components/chess/ThreatRadar";
import { useChessGame } from "@/lib/chess/useChessGame";
import {
  flipBoard,
  setAnalyticsMode,
  toggleCoords,
  toggleThreatRadar,
  updateSettings,
  useSettings,
} from "@/lib/chess/settings";
import {
  formatClock,
  TIME_CONTROLS,
  useChessClock,
  type TimeControl,
} from "@/lib/chess/clock";
import {
  analyze,
  chooseEngineMove,
  engineSkillProfile,
  preloadEngine,
  type Evaluation,
  type EngineSkill,
} from "@/lib/chess/engine";
import { playSound } from "@/lib/chess/sounds";
import {
  accuracyFromQualities,
  classifyMove,
  qualityMeta,
  type MoveQuality,
} from "@/lib/chess/moveQuality";
import { findHangingPieces } from "@/lib/chess/hangingPieces";
import { recordGameStat } from "@/lib/chess/gameTrend";

export const Route = createFileRoute("/play")({
  head: () => ({
    meta: [
      { title: "Play — ChessMentor" },
      {
        name: "description",
        content:
          "Play Stockfish or a friend with live move quality, accuracy, win-probability, and a threat radar.",
      },
      { property: "og:title", content: "Play — ChessMentor" },
      {
        property: "og:description",
        content: "Play chess with live analytics, clocks, and a Stockfish opponent.",
      },
    ],
  }),
  component: PlayPage,
});

type Mode = "local" | "ai";
type PlayerColor = "w" | "b";
type ManualEnd =
  | null
  | { kind: "resign"; winner: PlayerColor }
  | { kind: "draw-agreed" }
  | { kind: "flag"; winner: PlayerColor };

const SKILLS: EngineSkill[] = [1, 2, 3, 4, 5];

function PlayPage() {
  const game = useChessGame();
  const { showCoords, boardOrientation, analyticsMode, showThreatRadar } = useSettings();

  const [mode, setMode] = useState<Mode>("ai");
  const [playerColor, setPlayerColor] = useState<PlayerColor>("w");
  const [skill, setSkill] = useState<EngineSkill>(2);
  const [tc, setTc] = useState<TimeControl>(TIME_CONTROLS[4]);
  const [manualEnd, setManualEnd] = useState<ManualEnd>(null);
  const [drawOffered, setDrawOffered] = useState<PlayerColor | null>(null);

  // Live analytics state
  const [cpHistory, setCpHistory] = useState<(number | null)[]>([0]);
  const [qualities, setQualities] = useState<MoveQuality[]>([]); // per ply
  const [moveTimes, setMoveTimes] = useState<number[]>([]); // seconds per ply
  const lastMoveStartRef = useRef<number>(performance.now());
  const prevEvalRef = useRef<Evaluation | null>(null);
  const prevMoveCountRef = useRef<number>(0);

  const status = game.status;
  const naturalGameOver = status.kind !== "playing";
  const gameOver = naturalGameOver || manualEnd !== null;

  const activeColor = gameOver ? null : status.kind === "playing" ? status.turn : null;
  const moveCount = game.history.length;

  const handleFlag = useCallback((color: PlayerColor) => {
    setManualEnd({ kind: "flag", winner: color === "w" ? "b" : "w" });
    playSound("win");
  }, []);
  const clock = useChessClock({
    tc,
    activeColor,
    moveNumber: moveCount,
    onFlag: handleFlag,
  });

  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  useEffect(() => {
    preloadEngine();
  }, []);
  useEffect(() => {
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
  }, [game.fen]);

  // Live per-move classification — runs when a new move lands and eval finishes.
  useEffect(() => {
    if (!evaluation) return;
    if (moveCount === prevMoveCountRef.current) return;
    // A new move just happened; evaluate delta between prevEval and current.
    const prev = prevEvalRef.current;
    const mover = game.lastMove?.color as PlayerColor | undefined;
    if (mover && prev) {
      const prevMoveUci = game.lastMove
        ? game.lastMove.from + game.lastMove.to + (game.lastMove.promotion ?? "")
        : "";
      const wasBest = !!(prev.bestMove && prev.bestMove === prevMoveUci);
      const q = classifyMove({
        mover,
        cpBefore: prev.cp,
        cpAfter: evaluation.cp,
        wasBookOrEarly: moveCount <= 6,
        wasEngineBest: wasBest,
      });
      setQualities((qs) => [...qs, q]);
    }
    setCpHistory((h) => [...h, evaluation.cp]);
    // record move time
    const now = performance.now();
    const secs = (now - lastMoveStartRef.current) / 1000;
    setMoveTimes((t) => [...t, secs]);
    lastMoveStartRef.current = now;
    prevMoveCountRef.current = moveCount;
    prevEvalRef.current = evaluation;
  }, [evaluation, moveCount, game.lastMove]);

  // AI move loop
  const thinkingRef = useRef(false);
  const [thinking, setThinking] = useState(false);
  useEffect(() => {
    if (mode !== "ai") return;
    if (gameOver) return;
    if (status.kind !== "playing") return;
    if (status.turn === playerColor) return;
    if (thinkingRef.current) return;
    thinkingRef.current = true;
    setThinking(true);
    const fen = game.fen;
    const t = setTimeout(async () => {
      try {
        const uci = await chooseEngineMove(fen, skill);
        if (uci) {
          const from = uci.slice(0, 2) as never;
          const to = uci.slice(2, 4) as never;
          const promo = uci[4] as "q" | "r" | "b" | "n" | undefined;
          game.tryMove(from, to, promo);
        }
      } finally {
        thinkingRef.current = false;
        setThinking(false);
      }
    }, 300);
    return () => {
      clearTimeout(t);
      thinkingRef.current = false;
      setThinking(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.fen, mode, playerColor, skill, gameOver, status.kind]);

  useEffect(() => {
    if (mode === "ai") {
      updateSettings({ boardOrientation: playerColor === "w" ? "white" : "black" });
    }
  }, [mode, playerColor]);

  const bestArrow = useMemo<BoardArrow[]>(() => {
    if (analyticsMode === "competitive" && !gameOver) return [];
    if (!evaluation?.bestMove) return [];
    if (gameOver) return [];
    if (mode === "ai" && status.kind === "playing" && status.turn !== playerColor) return [];
    const from = evaluation.bestMove.slice(0, 2);
    const to = evaluation.bestMove.slice(2, 4);
    return [{ from, to, color: "rgba(120, 120, 120, 0.32)" }];
  }, [evaluation, gameOver, mode, status, playerColor, analyticsMode]);

  const hangingHighlights = useMemo<SquareHighlight[]>(() => {
    if (analyticsMode === "competitive" && !gameOver) return [];
    if (!showThreatRadar) return [];
    const pieces = findHangingPieces(game.fen);
    return pieces.map((p) => ({
      square: p.square,
      color: "rgba(220, 38, 38, 0.65)",
      ring: true,
    }));
  }, [game.fen, showThreatRadar, analyticsMode, gameOver]);

  // Player accuracy: qualities from the human player's moves only
  const playerQualities = useMemo(() => {
    if (mode === "local") return qualities; // all moves are "player"
    return qualities.filter((_, i) => {
      // ply i (0-indexed): white played on even, black on odd
      const mover: PlayerColor = i % 2 === 0 ? "w" : "b";
      return mover === playerColor;
    });
  }, [qualities, mode, playerColor]);

  const playerAccuracy = accuracyFromQualities(playerQualities);
  const blunders = playerQualities.filter((q) => q === "blunder").length;
  const mistakes = playerQualities.filter((q) => q === "mistake").length;
  const inaccuracies = playerQualities.filter((q) => q === "inaccuracy").length;
  const avgSecPerMove = moveTimes.length
    ? moveTimes.reduce((a, b) => a + b, 0) / moveTimes.length
    : 0;

  const resetAll = useCallback(() => {
    game.reset();
    setManualEnd(null);
    setDrawOffered(null);
    setCpHistory([0]);
    setQualities([]);
    setMoveTimes([]);
    prevEvalRef.current = null;
    prevMoveCountRef.current = 0;
    lastMoveStartRef.current = performance.now();
  }, [game]);

  const startNewGame = useCallback(
    (nextMode: Mode = mode, color: PlayerColor = playerColor) => {
      setMode(nextMode);
      setPlayerColor(color);
      resetAll();
    },
    [mode, playerColor, resetAll],
  );

  // Record trend on game end
  const recordedRef = useRef(false);
  useEffect(() => {
    if (!gameOver || recordedRef.current || qualities.length === 0) return;
    recordedRef.current = true;
    let result: "win" | "loss" | "draw" = "draw";
    if (manualEnd?.kind === "resign") {
      result = manualEnd.winner === playerColor ? "win" : "loss";
    } else if (manualEnd?.kind === "flag") {
      result = manualEnd.winner === playerColor ? "win" : "loss";
    } else if (manualEnd?.kind === "draw-agreed") {
      result = "draw";
    } else if (game.status.kind === "checkmate") {
      result = game.status.winner === playerColor ? "win" : "loss";
    }
    recordGameStat({
      playedAt: Date.now(),
      accuracy: playerAccuracy,
      blunders,
      mistakes,
      inaccuracies,
      avgSecPerMove,
      result,
    });
  }, [gameOver, qualities.length, manualEnd, game.status, playerColor, playerAccuracy, blunders, mistakes, inaccuracies, avgSecPerMove]);

  useEffect(() => {
    if (!gameOver) recordedRef.current = false;
  }, [gameOver]);

  const humanCanAct = !gameOver && (mode === "local" || status.turn === playerColor);

  const onResign = () => {
    if (gameOver) return;
    const loser: PlayerColor = mode === "ai" ? playerColor : status.kind === "playing" ? status.turn : "w";
    setManualEnd({ kind: "resign", winner: loser === "w" ? "b" : "w" });
    playSound("win");
  };

  const onOfferDraw = () => {
    if (gameOver) return;
    if (mode === "local") {
      setManualEnd({ kind: "draw-agreed" });
      playSound("draw");
      return;
    }
    const cp = evaluation?.cp ?? null;
    const halfMoves = game.history.length;
    const evalCloseToZero = cp !== null && Math.abs(cp) <= 40;
    if (halfMoves >= 20 && evalCloseToZero && evaluation?.mate == null) {
      setManualEnd({ kind: "draw-agreed" });
      playSound("draw");
    } else {
      setDrawOffered(playerColor);
      setTimeout(() => setDrawOffered(null), 2400);
    }
  };

  // Move list w/ quality tags (Phase 11)
  const paired: {
    n: number;
    w?: { san: string; q?: MoveQuality; t?: number };
    b?: { san: string; q?: MoveQuality; t?: number };
  }[] = [];
  for (let i = 0; i < game.history.length; i += 2) {
    paired.push({
      n: i / 2 + 1,
      w: game.history[i]
        ? { san: game.history[i].san, q: qualities[i], t: moveTimes[i] }
        : undefined,
      b: game.history[i + 1]
        ? { san: game.history[i + 1].san, q: qualities[i + 1], t: moveTimes[i + 1] }
        : undefined,
    });
  }

  const outcomeText = getOutcomeText(game, manualEnd);
  const statusLine = gameOver
    ? outcomeText ?? "Game over"
    : `${status.kind === "playing" ? (status.turn === "w" ? "White" : "Black") : ""} to move${
        status.kind === "playing" && status.inCheck ? " · Check" : ""
      }${mode === "ai" && thinking && status.kind === "playing" && status.turn !== playerColor ? " · Thinking…" : ""}`;

  const topColor: PlayerColor = boardOrientation === "white" ? "b" : "w";
  const bottomColor: PlayerColor = topColor === "w" ? "b" : "w";

  const analyticsVisible = analyticsMode === "learning" || gameOver;
  const hangingPieces = useMemo(() => findHangingPieces(game.fen), [game.fen]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
      <div className="grid gap-6 lg:grid-cols-[24px_minmax(0,1fr)_360px]">
        <div className="hidden h-[min(80vh,640px)] lg:block">
          <EvalBar
            evaluation={analyticsVisible ? evaluation : null}
            loading={analyzing && analyticsVisible}
            orientation={boardOrientation}
          />
        </div>

        <div className="min-w-0">
          <ClockRow
            color={topColor}
            ms={topColor === "w" ? clock.white : clock.black}
            active={!clock.unlimited && !gameOver && activeColor === topColor}
            unlimited={clock.unlimited}
            label={playerLabelFor(topColor, mode, playerColor)}
          />
          <div className="my-2">
            <ChessBoard
              game={game}
              arrows={bestArrow}
              highlights={hangingHighlights}
              interactive={humanCanAct}
            />
          </div>
          <ClockRow
            color={bottomColor}
            ms={bottomColor === "w" ? clock.white : clock.black}
            active={!clock.unlimited && !gameOver && activeColor === bottomColor}
            unlimited={clock.unlimited}
            label={playerLabelFor(bottomColor, mode, playerColor)}
          />

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <ActionButton onClick={onResign} disabled={gameOver} tone="danger">
              <FlagTriangleRight className="h-4 w-4" /> Resign
            </ActionButton>
            <ActionButton onClick={onOfferDraw} disabled={gameOver}>
              <Handshake className="h-4 w-4" /> {mode === "local" ? "Agree draw" : "Offer draw"}
            </ActionButton>
            <IconButton onClick={game.undo} disabled={!game.canUndo || gameOver} label="Undo">
              <Undo2 className="h-4 w-4" />
            </IconButton>
            <IconButton onClick={game.redo} disabled={!game.canRedo || gameOver} label="Redo">
              <Redo2 className="h-4 w-4" />
            </IconButton>
            <IconButton onClick={flipBoard} label="Flip board">
              <FlipVertical2 className="h-4 w-4" />
            </IconButton>
            <IconButton onClick={() => startNewGame()} label="New game">
              <RotateCcw className="h-4 w-4" />
            </IconButton>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="font-data">{statusLine}</span>
            {drawOffered && (
              <span className="rounded-md bg-secondary px-2 py-0.5 font-data">
                Draw declined
              </span>
            )}
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={showCoords}
                onChange={toggleCoords}
                className="h-3.5 w-3.5 accent-[color:var(--color-primary)]"
              />
              Coordinates
            </label>
          </div>

          {/* Phase 11 live analytics panel */}
          {analyticsVisible && (
            <div className="mt-5 grid gap-3 rounded-xl border bg-card p-4 shadow-e1 sm:grid-cols-[auto_1fr]">
              <AccuracyMeter value={playerAccuracy} />
              <div className="min-w-0">
                <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="label-caps">Win probability</span>
                  <span className="font-data">
                    {qualities.length} plies · {moveTimes.length > 0 ? `${avgSecPerMove.toFixed(1)}s / move` : "—"}
                  </span>
                </div>
                <WinProbSparkline cps={cpHistory} />
                <div className="mt-2 flex flex-wrap gap-2 font-data text-[11px]">
                  <QualityChip q="blunder" count={blunders} />
                  <QualityChip q="mistake" count={mistakes} />
                  <QualityChip q="inaccuracy" count={inaccuracies} />
                </div>
              </div>
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          {/* Learning vs Competitive toggle */}
          <div className="rounded-xl border bg-card p-4 shadow-e1">
            <div className="label-caps mb-2 text-muted-foreground">Analytics mode</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setAnalyticsMode("learning")}
                className={`inline-flex h-11 items-center justify-center gap-1.5 rounded-md border text-xs font-medium transition-colors ${
                  analyticsMode === "learning"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background hover:bg-secondary"
                }`}
              >
                <GraduationCap className="h-4 w-4" />
                Learning
              </button>
              <button
                onClick={() => setAnalyticsMode("competitive")}
                className={`inline-flex h-11 items-center justify-center gap-1.5 rounded-md border text-xs font-medium transition-colors ${
                  analyticsMode === "competitive"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background hover:bg-secondary"
                }`}
              >
                <Swords className="h-4 w-4" />
                Competitive
              </button>
            </div>
            <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={showThreatRadar}
                onChange={toggleThreatRadar}
                className="h-3.5 w-3.5 accent-[color:var(--color-primary)]"
              />
              {showThreatRadar ? (
                <><Eye className="h-3.5 w-3.5" /> Threat radar</>
              ) : (
                <><EyeOff className="h-3.5 w-3.5" /> Threat radar</>
              )}
            </label>
          </div>

          <div className="rounded-xl border bg-card p-4 shadow-e1">
            <div className="label-caps mb-3 text-muted-foreground">Game setup</div>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <ModeTile
                active={mode === "ai"}
                onClick={() => startNewGame("ai", playerColor)}
                icon={<Bot className="h-4 w-4" />}
                label="vs Computer"
              />
              <ModeTile
                active={mode === "local"}
                onClick={() => startNewGame("local", playerColor)}
                icon={<Users className="h-4 w-4" />}
                label="Pass & play"
              />
            </div>

            {mode === "ai" && (
              <>
                <div className="mb-1 text-xs text-muted-foreground">Play as</div>
                <div className="mb-3 grid grid-cols-2 gap-2">
                  <ColorTile active={playerColor === "w"} onClick={() => startNewGame("ai", "w")}>
                    White
                  </ColorTile>
                  <ColorTile active={playerColor === "b"} onClick={() => startNewGame("ai", "b")}>
                    Black
                  </ColorTile>
                </div>
                <div className="mb-1 text-xs text-muted-foreground">Engine difficulty</div>
                <div className="mb-3 grid grid-cols-5 gap-1">
                  {SKILLS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSkill(s)}
                      className={`h-11 rounded-md border text-xs font-medium transition-colors ${
                        skill === s
                          ? "border-primary bg-primary text-primary-foreground"
                          : "bg-background hover:bg-secondary"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <p className="mb-3 font-data text-[11px] text-muted-foreground">
                  {engineSkillProfile(skill).label} · {engineSkillProfile(skill).rating} · depth{" "}
                  {engineSkillProfile(skill).depth}
                </p>
              </>
            )}

            <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> Time control
            </div>
            <div className="grid grid-cols-4 gap-1">
              {TIME_CONTROLS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTc(t);
                    resetAll();
                  }}
                  className={`h-11 rounded-md border px-1.5 text-[11px] font-medium transition-colors ${
                    tc.id === t.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background hover:bg-secondary"
                  }`}
                  title={`${t.category} · ${t.label}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {analyticsVisible && <ThreatRadar pieces={hangingPieces} />}

          {gameOver && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 shadow-e2">
              <h3 className="font-display text-base font-semibold">Game over</h3>
              <p className="mt-1 text-sm text-muted-foreground">{outcomeText}</p>
              <button
                onClick={() => startNewGame()}
                className="mt-3 inline-flex h-11 items-center gap-1.5 rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                <RotateCcw className="h-3.5 w-3.5" /> New game
              </button>
            </div>
          )}

          <div className="flex min-h-[220px] flex-col rounded-xl border bg-card shadow-e1">
            <div className="border-b px-4 py-3">
              <h2 className="font-display text-sm font-semibold">Moves</h2>
            </div>
            <div className="max-h-[420px] flex-1 overflow-y-auto p-2 font-data text-sm">
              {paired.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                  No moves yet.
                </p>
              ) : (
                <ol className="space-y-0.5">
                  {paired.map((row) => (
                    <li
                      key={row.n}
                      className="grid grid-cols-[2rem_1fr_1fr] items-center gap-2 rounded-md px-2 py-1 hover:bg-secondary/60"
                    >
                      <span className="text-xs text-muted-foreground">{row.n}.</span>
                      <MoveCell m={row.w} showQuality={analyticsVisible} />
                      <MoveCell m={row.b} muted showQuality={analyticsVisible} />
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function MoveCell({
  m,
  muted,
  showQuality,
}: {
  m?: { san: string; q?: MoveQuality; t?: number };
  muted?: boolean;
  showQuality: boolean;
}) {
  if (!m) return <span />;
  const meta = m.q ? qualityMeta(m.q) : null;
  return (
    <span className={`flex items-center gap-1.5 ${muted ? "text-muted-foreground" : ""}`}>
      <span>{m.san}</span>
      {showQuality && meta && meta.short && (
        <span
          className="text-[10px] font-semibold"
          style={{ color: meta.colorVar }}
          title={meta.label}
        >
          {meta.short}
        </span>
      )}
    </span>
  );
}

function QualityChip({ q, count }: { q: MoveQuality; count: number }) {
  const meta = qualityMeta(q);
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5"
      style={{ borderColor: meta.colorVar, color: meta.colorVar }}
    >
      <span className="tabular-nums">{count}</span>
      <span>{meta.label}</span>
    </span>
  );
}

function playerLabelFor(color: PlayerColor, mode: Mode, playerColor: PlayerColor): string {
  if (mode === "local") return color === "w" ? "White" : "Black";
  if (color === playerColor) return "You";
  return "Stockfish";
}

function getOutcomeText(
  game: ReturnType<typeof useChessGame>,
  manualEnd: ManualEnd,
): string | null {
  if (manualEnd) {
    if (manualEnd.kind === "resign")
      return `${manualEnd.winner === "w" ? "White" : "Black"} wins by resignation`;
    if (manualEnd.kind === "flag")
      return `${manualEnd.winner === "w" ? "White" : "Black"} wins on time`;
    if (manualEnd.kind === "draw-agreed") return "Draw by agreement";
  }
  const s = game.status;
  if (s.kind === "checkmate") return `Checkmate — ${s.winner === "w" ? "White" : "Black"} wins`;
  if (s.kind === "stalemate") return "Draw — stalemate";
  if (s.kind === "draw") return `Draw — ${s.reason}`;
  return null;
}

function ClockRow({
  color,
  ms,
  active,
  unlimited,
  label,
}: {
  color: PlayerColor;
  ms: number;
  active: boolean;
  unlimited: boolean;
  label: string;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-4 py-2.5 transition-colors ${
        active ? "border-primary bg-primary/5 shadow-e1" : "bg-card"
      }`}
    >
      <div className="flex items-center gap-2 text-sm">
        <span
          className={`inline-block h-3 w-3 rounded-full border ${
            color === "w" ? "bg-white" : "bg-black"
          }`}
        />
        <span className="font-medium">{label}</span>
      </div>
      <div
        className={`font-data text-xl tabular-nums ${
          active ? "text-foreground" : "text-muted-foreground"
        } ${!unlimited && ms < 10000 && active ? "text-destructive" : ""}`}
      >
        {unlimited ? "∞" : formatClock(ms)}
      </div>
    </div>
  );
}

function ModeTile({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex h-11 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-background hover:bg-secondary"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function ColorTile({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`h-11 rounded-md border text-xs font-medium transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-background hover:bg-secondary"
      }`}
    >
      {children}
    </button>
  );
}

function ActionButton({
  onClick,
  disabled,
  tone,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  tone?: "danger";
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-11 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        tone === "danger"
          ? "border-destructive/40 text-destructive hover:bg-destructive/10"
          : "bg-background hover:bg-secondary"
      }`}
    >
      {children}
    </button>
  );
}

function IconButton({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="grid h-11 w-11 place-items-center rounded-md border bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
