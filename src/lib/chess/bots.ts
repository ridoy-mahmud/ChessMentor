// Phase 15: probability-weighted bot move selection.
// Uses Stockfish (via engine.ts) to gather candidate moves; falls back to
// legal moves when the engine isn't available. Higher-temperature bots
// sample more loosely around the best move.

import { Chess } from "chess.js";
import { analyze } from "./engine";
import rookieImg from "@/assets/bot-rookie.jpg";
import challengerImg from "@/assets/bot-challenger.jpg";
import strategistImg from "@/assets/bot-strategist.jpg";
import tacticianImg from "@/assets/bot-tactician.jpg";
import grandmasterImg from "@/assets/bot-grandmaster.jpg";

export type BotId =
  | "rookie"
  | "challenger"
  | "strategist"
  | "tactician"
  | "grandmaster";

export type BotProfile = {
  id: BotId;
  name: string;
  rating: string;
  tagline: string;
  avatar: string;
  // Higher temperature → more likely to pick a suboptimal move.
  temperature: number;
  // Stockfish search depth.
  depth: number;
  // Bias 0..1 favoring captures (Rookie mimics beginner impulse).
  captureBias: number;
  // Bias 0..1 favoring sharp/attacking moves (Tactician).
  aggressionBias: number;
  // Line spoken when the human wins.
  onLoss: string;
  // Line spoken when the human loses.
  onWin: string;
  // Line spoken on a draw.
  onDraw: string;
};

export const BOTS: Record<BotId, BotProfile> = {
  rookie: {
    id: "rookie",
    name: "Rookie",
    rating: "~500",
    tagline: "Learning the ropes, drops pieces sometimes.",
    avatar: rookieImg,
    temperature: 1.4,
    depth: 4,
    captureBias: 0.35,
    aggressionBias: 0,
    onLoss: "Nice game — I need to study more!",
    onWin: "I got lucky! Rematch?",
    onDraw: "A draw against you feels like a win to me.",
  },
  challenger: {
    id: "challenger",
    name: "Challenger",
    rating: "~900",
    tagline: "Solid basics, occasional tactical slip.",
    avatar: challengerImg,
    temperature: 0.9,
    depth: 6,
    captureBias: 0.1,
    aggressionBias: 0.1,
    onLoss: "Well played — you saw more than I did.",
    onWin: "Careful play won that one.",
    onDraw: "Even game — both sides held together.",
  },
  strategist: {
    id: "strategist",
    name: "Strategist",
    rating: "~1300",
    tagline: "Positional player, punishes obvious errors.",
    avatar: strategistImg,
    temperature: 0.55,
    depth: 10,
    captureBias: 0,
    aggressionBias: 0.05,
    onLoss: "Your plan came together nicely.",
    onWin: "Small edges added up.",
    onDraw: "A patient draw — no complaints.",
  },
  tactician: {
    id: "tactician",
    name: "Tactician",
    rating: "~1700",
    tagline: "Sharp calculation, punishes tactics fast.",
    avatar: tacticianImg,
    temperature: 0.3,
    depth: 14,
    captureBias: 0,
    aggressionBias: 0.35,
    onLoss: "Sharp finish. Respect.",
    onWin: "The tactics were there for the taking.",
    onDraw: "Neither of us blinked.",
  },
  grandmaster: {
    id: "grandmaster",
    name: "Grandmaster",
    rating: "~2100",
    tagline: "Near-optimal play. Minimal human-like error.",
    avatar: grandmasterImg,
    temperature: 0.12,
    depth: 18,
    captureBias: 0,
    aggressionBias: 0.1,
    onLoss: "A remarkable game. Well earned.",
    onWin: "Study the middlegame — that's where it turned.",
    onDraw: "A hard-fought draw against sound defence.",
  },
};

export const BOT_ORDER: BotId[] = [
  "rookie",
  "challenger",
  "strategist",
  "tactician",
  "grandmaster",
];

// Weighted sample from an array of items with numeric weights.
function weightedPick<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + Math.max(0, b), 0);
  if (total <= 0) return items[Math.floor(Math.random() * items.length)];
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= Math.max(0, weights[i]);
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

/**
 * Choose a move for the given bot at the given FEN.
 *
 * Strategy:
 *   1. Gather legal moves.
 *   2. Score each candidate = engine eval after that move (from mover's POV),
 *      approximated via a shallow eval on the resulting position.
 *   3. Convert scores → probability distribution using a Boltzmann-style
 *      softmax with bot-specific temperature.
 *   4. Apply capture / aggression tendencies as multiplicative nudges.
 *   5. Sample from the distribution.
 */
export async function chooseBotMove(
  fen: string,
  botId: BotId,
): Promise<string | null> {
  const bot = BOTS[botId];
  const g = new Chess(fen);
  const legal = g.moves({ verbose: true }) as Array<{
    from: string;
    to: string;
    promotion?: string;
    captured?: string;
    san: string;
    flags: string;
  }>;
  if (legal.length === 0) return null;
  if (legal.length === 1) {
    const m = legal[0];
    return m.from + m.to + (m.promotion ?? "");
  }

  const mover = g.turn();

  // For the top bot, just trust the engine's best move (fast path).
  if (bot.temperature < 0.15) {
    const ev = await analyze(fen, { depth: bot.depth });
    if (ev.bestMove) return ev.bestMove;
  }

  // Cap candidates for perf on branchy positions.
  // Prefer captures/checks first — cheap heuristic prefilter.
  const ordered = [...legal].sort((a, b) => {
    const av = (a.captured ? 100 : 0) + (a.flags.includes("c") ? 10 : 0);
    const bv = (b.captured ? 100 : 0) + (b.flags.includes("c") ? 10 : 0);
    return bv - av;
  });
  const candidates = ordered.slice(0, Math.min(8, ordered.length));

  // Score each candidate by evaluating the resulting position at low depth.
  const scores: number[] = [];
  for (const m of candidates) {
    const child = new Chess(fen);
    child.move({ from: m.from, to: m.to, promotion: m.promotion ?? "q" });
    // Shallow depth for candidate scoring. The engine returns White POV.
    const ev = await analyze(child.fen(), { depth: Math.max(4, Math.min(bot.depth - 4, 10)) });
    let s: number;
    if (ev.mate != null) {
      // Positive mate for White. Normalize to mover POV:
      s = (mover === "w" ? 1 : -1) * (ev.mate > 0 ? 9000 - ev.mate * 100 : -9000 - ev.mate * 100);
    } else {
      const cp = ev.cp ?? 0;
      s = mover === "w" ? cp : -cp;
    }
    scores.push(s);
  }

  // Boltzmann-softmax over scores, scaled by temperature (in "pawns" units).
  // Divide cp by ~120 so a full pawn shifts the softmax noticeably.
  const T = bot.temperature * 120;
  const maxS = Math.max(...scores);
  const weights = scores.map((s) => Math.exp((s - maxS) / T));

  // Apply tendency nudges.
  const nudged = weights.map((w, i) => {
    const m = candidates[i];
    let mult = 1;
    if (bot.captureBias > 0 && m.captured) mult *= 1 + bot.captureBias * 2;
    if (bot.aggressionBias > 0 && (m.flags.includes("c") || m.san.includes("+"))) {
      mult *= 1 + bot.aggressionBias * 1.5;
    }
    return w * mult;
  });

  const picked = weightedPick(candidates, nudged);
  return picked.from + picked.to + (picked.promotion ?? "");
}

// Small helper — returns a "thinking" delay (ms) proportional to bot strength
// and legal-move count so moves don't feel instant.
export function botThinkingDelay(botId: BotId, legalMoves: number): number {
  const base = { rookie: 400, challenger: 600, strategist: 900, tactician: 1200, grandmaster: 1600 }[
    botId
  ];
  const jitter = Math.random() * 400;
  const complexity = Math.min(1000, legalMoves * 20);
  return base + jitter + complexity;
}
