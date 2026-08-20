import { z } from "zod";
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
  Palette,
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
import { GameOverOverlay, type GameOutcome } from "@/components/chess/GameOverOverlay";
import { useChessGame } from "@/lib/chess/useChessGame";
import {
  ALL_BOARD_THEMES,
  ALL_PIECE_SETS,
  BOARD_THEME_META,
  PIECE_SET_META,
  flipBoard,
  setAnalyticsMode,
  setBoardTheme,
  setPieceSet,
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
  preloadEngine,
  type Evaluation,
} from "@/lib/chess/engine";
import { BOTS, BOT_ORDER, chooseBotMove, botThinkingDelay, type BotId } from "@/lib/chess/bots";
import { recordRatedGame } from "@/lib/chess/rating";
import { playSound } from "@/lib/chess/sounds";
import {
  accuracyFromQualities,
  classifyMove,
  qualityMeta,
  type MoveQuality,
} from "@/lib/chess/moveQuality";
import { findHangingPieces } from "@/lib/chess/hangingPieces";
import { recordGameStat } from "@/lib/chess/gameTrend";
import { Chess } from "chess.js";

const searchSchema = z.object({
  bot: z.enum(["rookie", "apprentice", "challenger", "strategist", "oracle", "tactician", "grandmaster"]).optional(),
  rated: z.boolean().optional(),
});

export const Route = createFileRoute("/play")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Play — ChessMentor" },
      {
        name: "description",
        content:
          "Play seven personality bots or a friend with live move quality, accuracy, and win-probability.",
      },
      { property: "og:title", content: "Play — ChessMentor" },
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

function PlayPage() {
  const search = Route.useSearch();
  const game = useChessGame();
  const {
    showCoords,
    boardOrientation,
    analyticsMode,
    showThreatRadar,
    boardTheme,
    pieceSet,
  } = useSettings();

  const [mode, setMode] = useState<Mode>("ai");
  const [playerColor, setPlayerColor] = useState<PlayerColor>("w");
  const [botId, setBotId] = useState<BotId>(search.bot ?? "challenger");
  const [rated, setRated] = useState<boolean>(!!search.rated);
  const [tc, setTc] = useState<TimeControl>(TIME_CONTROLS[4]);
  const [manualEnd, setManualEnd] = useState<ManualEnd>(null);
  const [drawOffered, setDrawOffered] = useState<PlayerColor | null>(null);
  const [outcome, setOutcome] = useState<GameOutcome | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Live analytics
  const [cpHistory, setCpHistory] = useState<(number | null)[]>([0]);
  const [qualities, setQualities] = useState<MoveQuality[]>([]);
  const [moveTimes, setMoveTimes] = useState<number[]>([]);
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

  useEffect(() => {
    if (!evaluation) return;
    if (moveCount === prevMoveCountRef.current) return;
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
    const now = performance.now();
    const secs = (now - lastMoveStartRef.current) / 1000;
    setMoveTimes((t) => [...t, secs]);
    lastMoveStartRef.current = now;
    prevMoveCountRef.current = moveCount;
    prevEvalRef.current = evaluation;
  }, [evaluation, moveCount, game.lastMove]);

  // Bot move loop
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
    const legalCount = new Chess(fen).moves().length;
    const delay = botThinkingDelay(botId, legalCount);
    const t = setTimeout(async () => {
      try {
        const uci = await chooseBotMove(fen, botId);
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
    }, delay);
    return () => {
      clearTimeout(t);
      thinkingRef.current = false;
      setThinking(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.fen, mode, playerColor, botId, gameOver, status.kind]);

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

  const playerQualities = useMemo(() => {
    if (mode === "local") return qualities;
    return qualities.filter((_, i) => {
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
    setOutcome(null);
    setCpHistory([0]);
    setQualities([]);
    setMoveTimes([]);
    prevEvalRef.current = null;
    prevMoveCountRef.current = 0;
    lastMoveStartRef.current = performance.now();
  }, [game]);

  const startNewGame = useCallback(
    (nextMode: Mode = mode, color: PlayerColor = playerColor, bot: BotId = botId) => {
      setMode(nextMode);
      setPlayerColor(color);
      setBotId(bot);
      resetAll();
    },
    [mode, playerColor, botId, resetAll],
  );

  // Outcome + rating on game end
  const recordedRef = useRef(false);
  useEffect(() => {
    if (!gameOver || recordedRef.current || (qualities.length === 0 && moveCount === 0)) return;
    recordedRef.current = true;
    let result: "win" | "loss" | "draw" = "draw";
    let method = "checkmate";
    if (manualEnd?.kind === "resign") {
      result = manualEnd.winner === playerColor ? "win" : "loss";
      method = "resignation";
    } else if (manualEnd?.kind === "flag") {
      result = manualEnd.winner === playerColor ? "win" : "loss";
      method = "time";
    } else if (manualEnd?.kind === "draw-agreed") {
      result = "draw";
      method = "agreement";
    } else if (game.status.kind === "checkmate") {
      result = game.status.winner === playerColor ? "win" : "loss";
      method = "checkmate";
    } else if (game.status.kind === "stalemate") {
      result = "draw";
      method = "stalemate";
    } else if (game.status.kind === "draw") {
      result = "draw";
      method = game.status.reason;
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
    if (mode === "ai" && rated) {
      const oppRating = Number(BOTS[botId].rating.replace(/[^\d]/g, "")) || 1200;
      recordRatedGame({
        opponentName: BOTS[botId].name,
        opponentRating: oppRating,
        result,
      });
    }
    setOutcome({
      kind: result,
      method,
      bot: mode === "ai" ? BOTS[botId] : undefined,
      onReview: () => setOutcome(null),
      onNewGame: () => startNewGame(),
    });
    if (result === "win") playSound("win");
    else if (result === "loss") playSound("lose");
    else playSound("draw");
  }, [gameOver, qualities.length, moveCount, manualEnd, game.status, playerColor, playerAccuracy, blunders, mistakes, inaccuracies, avgSecPerMove, mode, botId, rated, startNewGame]);

  useEffect(() => {
    if (!gameOver) recordedRef.current = false;
  }, [gameOver]);

  const humanCanAct = !gameOver && (mode === "local" || status.turn === playerColor);

  const onResign = () => {
    if (gameOver) return;
    const loser: PlayerColor = mode === "ai" ? playerColor : status.kind === "playing" ? status.turn : "w";
    setManualEnd({ kind: "resign", winner: loser === "w" ? "b" : "w" });
  };

  const onOfferDraw = () => {
    if (gameOver) return;
    if (mode === "local") {
      setManualEnd({ kind: "draw-agreed" });
      return;
    }
    const cp = evaluation?.cp ?? null;
    const halfMoves = game.history.length;
    const evalCloseToZero = cp !== null && Math.abs(cp) <= 40;
    if (halfMoves >= 20 && evalCloseToZero && evaluation?.mate == null) {
      setManualEnd({ kind: "draw-agreed" });
    } else {
      setDrawOffered(playerColor);
      setTimeout(() => setDrawOffered(null), 2400);
    }
  };

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

  const statusLine = gameOver
    ? "Game over"
    : `${status.kind === "playing" ? (status.turn === "w" ? "White" : "Black") : ""} to move${
        status.kind === "playing" && status.inCheck ? " · Check" : ""
      }${mode === "ai" && thinking ? ` · ${BOTS[botId].name} is thinking…` : ""}`;

  const topColor: PlayerColor = boardOrientation === "white" ? "b" : "w";
  const bottomColor: PlayerColor = topColor === "w" ? "b" : "w";
  const analyticsVisible = analyticsMode === "learning" || gameOver;
  const hangingPieces = useMemo(() => findHangingPieces(game.fen), [game.fen]);

  const currentBot = BOTS[botId];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
      <GameOverOverlay outcome={outcome} onDismiss={() => setOutcome(null)} />

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
            label={playerLabelFor(topColor, mode, playerColor, currentBot.name)}
            bot={mode === "ai" && topColor !== playerColor ? currentBot : null}
            thinking={thinking && topColor !== playerColor}
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
            label={playerLabelFor(bottomColor, mode, playerColor, currentBot.name)}
            bot={mode === "ai" && bottomColor !== playerColor ? currentBot : null}
            thinking={thinking && bottomColor !== playerColor}
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
            <IconButton onClick={() => setShowSettings((v) => !v)} label="Board settings">
              <Palette className="h-4 w-4" />
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

          {showSettings && (
            <div className="mt-4 grid gap-4 rounded-xl border bg-card p-4 shadow-e1">
              <div>
                <div className="label-caps mb-2 text-muted-foreground">Board theme</div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                  {ALL_BOARD_THEMES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setBoardTheme(t)}
                      title={BOARD_THEME_META[t].blurb}
                      className={`group rounded-md border p-2 text-left transition-colors ${
                        boardTheme === t ? "border-primary" : "hover:border-primary/40"
                      }`}
                    >
                      <MiniBoardPreview theme={t} />
                      <div className="mt-1 text-[11px] font-medium">{BOARD_THEME_META[t].label}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="label-caps mb-2 text-muted-foreground">Piece set</div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  {ALL_PIECE_SETS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPieceSet(p)}
                      title={PIECE_SET_META[p].blurb}
                      className={`rounded-md border p-2 text-xs font-medium transition-colors ${
                        pieceSet === p
                          ? "border-primary bg-primary/5 text-primary"
                          : "hover:border-primary/40"
                      }`}
                    >
                      {PIECE_SET_META[p].label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Piece variants are applied as visual filters over the base set — a full custom piece
                  library would need dedicated SVG assets.
                </p>
              </div>
            </div>
          )}

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

          {/* Post-game Insights (Phase 14) */}
          {gameOver && qualities.length > 0 && (
            <Insights
              qualities={qualities}
              moveTimes={moveTimes}
              playerColor={playerColor}
              mode={mode}
            />
          )}
        </div>

        <aside className="flex flex-col gap-4">
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
            <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={rated}
                onChange={(e) => setRated(e.target.checked)}
                className="h-3.5 w-3.5 accent-[color:var(--color-primary)]"
              />
              Rated (affects ladder)
            </label>
          </div>

          <div className="rounded-xl border bg-card p-4 shadow-e1">
            <div className="label-caps mb-3 text-muted-foreground">Game setup</div>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <ModeTile
                active={mode === "ai"}
                onClick={() => startNewGame("ai", playerColor, botId)}
                icon={<Bot className="h-4 w-4" />}
                label="vs Computer"
              />
              <ModeTile
                active={mode === "local"}
                onClick={() => startNewGame("local", playerColor, botId)}
                icon={<Users className="h-4 w-4" />}
                label="Pass & play"
              />
            </div>

            {mode === "ai" && (
              <>
                <div className="mb-1 text-xs text-muted-foreground">Opponent</div>
                <div className="mb-3 grid grid-cols-4 gap-1 sm:grid-cols-7">
                  {BOT_ORDER.map((id) => {
                    const b = BOTS[id];
                    return (
                      <button
                        key={id}
                        onClick={() => startNewGame("ai", playerColor, id)}
                        title={`${b.name} · ${b.rating} — ${b.tagline}`}
                        className={`overflow-hidden rounded-md border transition-all ${
                          botId === id ? "border-primary ring-2 ring-primary/30" : "hover:border-primary/40"
                        }`}
                      >
                        <img
                          src={b.avatar}
                          alt={b.name}
                          width={48}
                          height={48}
                          loading="lazy"
                          className="h-12 w-full bg-secondary/40 object-contain p-1"
                        />
                      </button>
                    );
                  })}
                </div>
                <p className="mb-3 rounded-md bg-secondary/60 p-2 text-[11px] leading-relaxed">
                  <span className="font-medium">{currentBot.name}</span> · {currentBot.rating}
                  <br />
                  <span className="text-muted-foreground">{currentBot.tagline}</span>
                </p>
                <div className="mb-1 text-xs text-muted-foreground">Play as</div>
                <div className="mb-3 grid grid-cols-2 gap-2">
                  <ColorTile active={playerColor === "w"} onClick={() => startNewGame("ai", "w", botId)}>
                    White
                  </ColorTile>
                  <ColorTile active={playerColor === "b"} onClick={() => startNewGame("ai", "b", botId)}>
                    Black
                  </ColorTile>
                </div>
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

          <div className="flex min-h-[220px] flex-col rounded-xl border bg-card shadow-e1">
            <div className="border-b px-4 py-3">
              <h2 className="font-display text-sm font-semibold">Moves</h2>
            </div>
            <div className="max-h-[420px] flex-1 overflow-y-auto p-2 font-data text-sm">
              {paired.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">No moves yet.</p>
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

function MiniBoardPreview({ theme }: { theme: string }) {
  // Render 4 squares showing the light/dark contrast for the theme.
  return (
    <div className={`board-theme-${theme} grid grid-cols-2 overflow-hidden rounded border`}>
      <div className="h-6" style={{ background: "var(--board-light)" }} />
      <div className="h-6" style={{ background: "var(--board-dark)" }} />
      <div className="h-6" style={{ background: "var(--board-dark)" }} />
      <div className="h-6" style={{ background: "var(--board-light)" }} />
    </div>
  );
}

function Insights({
  qualities,
  moveTimes,
  playerColor,
  mode,
}: {
  qualities: MoveQuality[];
  moveTimes: number[];
  playerColor: PlayerColor;
  mode: Mode;
}) {
  const insights: string[] = [];
  const third = Math.max(1, Math.floor(qualities.length / 3));
  const opening = qualities.slice(0, third);
  const middle = qualities.slice(third, third * 2);
  const end = qualities.slice(third * 2);
  const accOf = (q: MoveQuality[]) =>
    accuracyFromQualities(
      mode === "local"
        ? q
        : q.filter((_, i) => {
            const mover: PlayerColor = i % 2 === 0 ? "w" : "b";
            return mover === playerColor;
          }),
    );
  const acc = { opening: accOf(opening), middle: accOf(middle), end: accOf(end) };
  const phases = [
    { key: "opening" as const, label: "opening" },
    { key: "middle" as const, label: "middlegame" },
    { key: "end" as const, label: "endgame" },
  ];
  const best = phases.reduce((a, b) => (acc[a.key] >= acc[b.key] ? a : b));
  insights.push(`Your accuracy was highest in the ${best.label} (${acc[best.key].toFixed(0)}%).`);

  const total = moveTimes.reduce((a, b) => a + b, 0);
  if (total > 0) {
    const sorted = [...moveTimes].sort((a, b) => b - a).slice(0, 3);
    const heavy = sorted.reduce((a, b) => a + b, 0);
    const pct = Math.round((heavy / total) * 100);
    if (pct >= 30)
      insights.push(`You spent ${pct}% of your clock on 3 moves — consider trusting your first idea more.`);
  }

  const blunders = qualities.filter((q) => q === "blunder").length;
  if (blunders > 0) insights.push(`${blunders} blunder${blunders === 1 ? "" : "s"} — review the game to spot the pattern.`);

  return (
    <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div className="label-caps mb-2 text-primary">Insights</div>
      <ul className="space-y-1 text-sm">
        {insights.map((i, k) => (
          <li key={k}>• {i}</li>
        ))}
      </ul>
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

function playerLabelFor(
  color: PlayerColor,
  mode: Mode,
  playerColor: PlayerColor,
  botName: string,
): string {
  if (mode === "local") return color === "w" ? "White" : "Black";
  if (color === playerColor) return "You";
  return botName;
}

function ClockRow({
  color,
  ms,
  active,
  unlimited,
  label,
  bot,
  thinking,
}: {
  color: PlayerColor;
  ms: number;
  active: boolean;
  unlimited: boolean;
  label: string;
  bot?: { avatar: string; name: string } | null;
  thinking?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-4 py-2.5 transition-colors ${
        active ? "border-primary bg-primary/5 shadow-e1" : "bg-card"
      }`}
    >
      <div className="flex items-center gap-2 text-sm">
        {bot ? (
          <img
            src={bot.avatar}
            alt={bot.name}
            width={28}
            height={28}
            loading="lazy"
            className={`h-7 w-7 object-contain ${thinking ? "animate-pulse" : ""}`}
          />
        ) : (
          <span
            className={`inline-block h-3 w-3 rounded-full border ${
              color === "w" ? "bg-white" : "bg-black"
            }`}
          />
        )}
        <span className="font-medium">{label}</span>
        {thinking && <span className="text-xs text-muted-foreground">thinking…</span>}
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
