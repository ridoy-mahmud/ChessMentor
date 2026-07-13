// Classify a move by its centipawn delta (from the moving side's perspective).
// Delta = eval-after (from mover's POV) minus eval-before (from mover's POV).
// A good move keeps delta near 0 or positive; a blunder loses lots of cp.

export type MoveQuality =
  | "brilliant"
  | "great"
  | "best"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "blunder"
  | "book";

export type QualityMeta = {
  label: string;
  short: string;
  colorVar: string; // css var
};

const META: Record<MoveQuality, QualityMeta> = {
  brilliant: { label: "Brilliant", short: "!!", colorVar: "var(--color-q-brilliant)" },
  great: { label: "Great", short: "!", colorVar: "var(--color-q-great)" },
  best: { label: "Best", short: "★", colorVar: "var(--color-q-good)" },
  good: { label: "Good", short: "", colorVar: "var(--color-muted-foreground)" },
  inaccuracy: { label: "Inaccuracy", short: "?!", colorVar: "var(--color-q-inaccuracy)" },
  mistake: { label: "Mistake", short: "?", colorVar: "var(--color-q-mistake)" },
  blunder: { label: "Blunder", short: "??", colorVar: "var(--color-q-blunder)" },
  book: { label: "Book", short: "", colorVar: "var(--color-muted-foreground)" },
};

export function qualityMeta(q: MoveQuality): QualityMeta {
  return META[q];
}

// mover: color who just moved. cpBefore/cpAfter are from WHITE perspective.
// Returns a rough quality label using thresholds similar to chess.com.
export function classifyMove(params: {
  mover: "w" | "b";
  cpBefore: number | null;
  cpAfter: number | null;
  wasBookOrEarly: boolean;
  wasEngineBest: boolean;
}): MoveQuality {
  if (params.wasBookOrEarly) return "book";
  if (params.cpBefore == null || params.cpAfter == null) return "good";
  // Convert to mover's POV: positive = good for mover.
  const sign = params.mover === "w" ? 1 : -1;
  const before = params.cpBefore * sign;
  const after = params.cpAfter * sign;
  const delta = after - before; // >0 means mover improved, <0 means worse

  // Clamp giant swings from mates
  const d = Math.max(-2000, Math.min(2000, delta));

  if (params.wasEngineBest) {
    // Best move — grade by absolute strength of position
    if (before < -200 && after > 100) return "brilliant"; // saved a bad position
    return "best";
  }
  if (d >= -20) return "good";
  if (d >= -60) return "inaccuracy";
  if (d >= -180) return "mistake";
  return "blunder";
}

// Rolling accuracy from a list of move qualities (0-100). Chess.com-like weighting.
export function accuracyFromQualities(qs: MoveQuality[]): number {
  if (qs.length === 0) return 100;
  const w: Record<MoveQuality, number> = {
    brilliant: 100,
    great: 98,
    best: 95,
    good: 88,
    book: 92,
    inaccuracy: 70,
    mistake: 45,
    blunder: 15,
  };
  const total = qs.reduce((s, q) => s + w[q], 0);
  return Math.round(total / qs.length);
}
