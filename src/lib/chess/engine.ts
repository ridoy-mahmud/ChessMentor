// Chess engine adapter. Tries to load Stockfish from CDN in a Web Worker;
// falls back to a small material-based 2-ply search so the UI still works.
//
// Public API: analyze(fen, { depth }) -> Promise<Evaluation>
// Evaluation cp is always from White's perspective (positive = White better).

import { Chess } from "chess.js";

export type Evaluation = {
  cp: number | null; // centipawns, White perspective. null if mate is set.
  mate: number | null; // moves to mate, from White perspective (positive = White mates)
  bestMove: string | null; // UCI: "e2e4", "e7e8q"
  pv: string[]; // principal variation (UCI moves)
  depth: number;
  source: "stockfish" | "fallback";
};

const STOCKFISH_CDN =
  "https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.js";

let workerPromise: Promise<Worker | null> | null = null;
let busy: Promise<unknown> = Promise.resolve();

function loadWorker(): Promise<Worker | null> {
  if (workerPromise) return workerPromise;
  workerPromise = new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(null);
      return;
    }
    try {
      const src = `self.importScripts(${JSON.stringify(STOCKFISH_CDN)});`;
      const url = URL.createObjectURL(
        new Blob([src], { type: "application/javascript" }),
      );
      const w = new Worker(url);
      let uciok = false;
      const timer = setTimeout(() => {
        if (!uciok) {
          try {
            w.terminate();
          } catch {
            /* noop */
          }
          resolve(null);
        }
      }, 8000);
      const onMsg = (e: MessageEvent) => {
        const line = typeof e.data === "string" ? e.data : "";
        if (!uciok && line.includes("uciok")) {
          uciok = true;
          clearTimeout(timer);
          w.removeEventListener("message", onMsg);
          resolve(w);
        }
      };
      w.addEventListener("message", onMsg);
      w.onerror = () => {
        clearTimeout(timer);
        try {
          w.terminate();
        } catch {
          /* noop */
        }
        resolve(null);
      };
      w.postMessage("uci");
    } catch {
      resolve(null);
    }
  });
  return workerPromise;
}

export function preloadEngine() {
  void loadWorker();
}

function runStockfish(
  worker: Worker,
  fen: string,
  depth: number,
  turn: "w" | "b",
): Promise<Evaluation> {
  return new Promise((resolve) => {
    let cp: number | null = 0;
    let mate: number | null = null;
    let pv: string[] = [];
    let d = 0;
    const handler = (e: MessageEvent) => {
      const line = typeof e.data === "string" ? e.data : "";
      if (line.startsWith("info")) {
        const dm = /\bdepth (\d+)/.exec(line);
        if (dm) d = +dm[1];
        const cm = /\bscore cp (-?\d+)/.exec(line);
        if (cm) {
          cp = +cm[1];
          mate = null;
        }
        const mm = /\bscore mate (-?\d+)/.exec(line);
        if (mm) {
          mate = +mm[1];
          cp = null;
        }
        const pvm = /\bpv ([^\n]+?)(?:\s+bmc\b|$)/.exec(line);
        if (pvm) pv = pvm[1].trim().split(/\s+/);
      } else if (line.startsWith("bestmove")) {
        worker.removeEventListener("message", handler);
        const best = line.split(/\s+/)[1] || null;
        // Convert to White perspective
        const sign = turn === "w" ? 1 : -1;
        resolve({
          cp: cp == null ? null : cp * sign,
          mate: mate == null ? null : mate * sign,
          bestMove: best && best !== "(none)" ? best : null,
          pv,
          depth: d,
          source: "stockfish",
        });
      }
    };
    worker.addEventListener("message", handler);
    worker.postMessage("ucinewgame");
    worker.postMessage("position fen " + fen);
    worker.postMessage("go depth " + depth);
  });
}

// --- Fallback: material + tiny mobility, 2-ply search --------------------

const PIECE_VAL: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0,
};

function evalMaterial(game: Chess): number {
  const board = game.board();
  let score = 0;
  for (const row of board) {
    for (const sq of row) {
      if (!sq) continue;
      const v = PIECE_VAL[sq.type];
      score += sq.color === "w" ? v : -v;
    }
  }
  // small mobility term
  const turn = game.turn();
  const mobility = game.moves().length;
  score += (turn === "w" ? 1 : -1) * mobility * 2;
  return score;
}

function fallback(fen: string): Evaluation {
  const g = new Chess(fen);
  if (g.isCheckmate()) {
    return {
      cp: null,
      mate: g.turn() === "w" ? -0 : 0,
      bestMove: null,
      pv: [],
      depth: 0,
      source: "fallback",
    };
  }
  const moves = g.moves({ verbose: true });
  if (moves.length === 0) {
    return { cp: 0, mate: null, bestMove: null, pv: [], depth: 0, source: "fallback" };
  }
  const turn = g.turn();
  let bestScore = turn === "w" ? -Infinity : Infinity;
  let bestUci: string | null = null;
  for (const m of moves) {
    const child = new Chess(fen);
    child.move({ from: m.from, to: m.to, promotion: m.promotion ?? "q" });
    // 1-ply reply
    const replies = child.moves({ verbose: true });
    let replyScore: number;
    if (replies.length === 0) {
      replyScore = child.isCheckmate()
        ? child.turn() === "w"
          ? -100000
          : 100000
        : 0;
    } else {
      replyScore = turn === "w" ? Infinity : -Infinity;
      for (const r of replies) {
        const gc = new Chess(child.fen());
        gc.move({ from: r.from, to: r.to, promotion: r.promotion ?? "q" });
        const s = evalMaterial(gc);
        if (turn === "w") replyScore = Math.min(replyScore, s);
        else replyScore = Math.max(replyScore, s);
      }
    }
    if (turn === "w" ? replyScore > bestScore : replyScore < bestScore) {
      bestScore = replyScore;
      bestUci = m.from + m.to + (m.promotion ?? "");
    }
  }
  return {
    cp: Math.max(-1500, Math.min(1500, bestScore)),
    mate: null,
    bestMove: bestUci,
    pv: bestUci ? [bestUci] : [],
    depth: 2,
    source: "fallback",
  };
}

export async function analyze(
  fen: string,
  opts: { depth?: number } = {},
): Promise<Evaluation> {
  const depth = opts.depth ?? 12;
  const g = new Chess(fen);
  const turn = g.turn();
  const worker = await loadWorker();
  if (!worker) return fallback(fen);
  // Serialize analyses to avoid mixing UCI streams
  const run = busy.then(() => runStockfish(worker, fen, depth, turn));
  busy = run.catch(() => undefined);
  try {
    return await run;
  } catch {
    return fallback(fen);
  }
}

// Convert cp (White perspective) to White win probability %.
// Formula from the prompt: 50 + 50 * (2 / (1 + e^(-0.00368 * cp)) - 1)
export function winProbability(cp: number): number {
  const p = 50 + 50 * (2 / (1 + Math.exp(-0.00368 * cp)) - 1);
  return Math.max(0, Math.min(100, p));
}

// ---- AI opponent: pick a move at a given skill level (1..5) ----

export type EngineSkill = 1 | 2 | 3 | 4 | 5;

const SKILL_PROFILES: Record<
  EngineSkill,
  { depth: number; randomChance: number; label: string; rating: string }
> = {
  1: { depth: 2, randomChance: 0.7, label: "Beginner", rating: "~800" },
  2: { depth: 4, randomChance: 0.35, label: "Casual", rating: "~1200" },
  3: { depth: 8, randomChance: 0.12, label: "Club", rating: "~1600" },
  4: { depth: 12, randomChance: 0.03, label: "Strong", rating: "~2000" },
  5: { depth: 16, randomChance: 0, label: "Master", rating: "~2400" },
};

export function engineSkillProfile(skill: EngineSkill) {
  return SKILL_PROFILES[skill];
}

export async function chooseEngineMove(
  fen: string,
  skill: EngineSkill,
): Promise<string | null> {
  const profile = SKILL_PROFILES[skill];
  const g = new Chess(fen);
  const legal = g.moves({ verbose: true }) as Array<{
    from: string;
    to: string;
    promotion?: string;
  }>;
  if (legal.length === 0) return null;

  // Randomness for weaker levels: pick a random legal move.
  if (profile.randomChance > 0 && Math.random() < profile.randomChance) {
    const m = legal[Math.floor(Math.random() * legal.length)];
    return m.from + m.to + (m.promotion ?? "");
  }

  const evalResult = await analyze(fen, { depth: profile.depth });
  if (evalResult.bestMove) return evalResult.bestMove;
  const m = legal[Math.floor(Math.random() * legal.length)];
  return m.from + m.to + (m.promotion ?? "");
}

