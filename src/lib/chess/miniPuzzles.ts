// Small hand-picked puzzle bank (FEN + SAN solution) used by Rush, Storm,
// and Practice. Each puzzle is a single-move solution for simplicity.

export type MiniPuzzle = {
  id: string;
  fen: string;
  solution: string; // SAN
  theme: "fork" | "mate-in-1" | "capture" | "back-rank" | "promotion" | "opposition";
  prompt: string;
};

export const MINI_PUZZLES: MiniPuzzle[] = [
  {
    id: "p1",
    fen: "6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1",
    solution: "Re8#",
    theme: "back-rank",
    prompt: "White to move. Mate in one.",
  },
  {
    id: "p2",
    fen: "6k1/6pp/8/8/8/8/5PPP/3Q2K1 w - - 0 1",
    solution: "Qd8#",
    theme: "back-rank",
    prompt: "White to move. Mate in one.",
  },
  {
    id: "p3",
    fen: "r3k2r/ppp2ppp/2n1b3/3q4/3P4/2N2N2/PPP2PPP/R2QK2R w KQkq - 0 1",
    solution: "Nxd5",
    theme: "fork",
    prompt: "White to move. Win the queen.",
  },
  {
    id: "p4",
    fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
    solution: "Nxe5",
    theme: "capture",
    prompt: "White to move. Take the free pawn.",
  },
  {
    id: "p5",
    fen: "8/P7/8/8/8/8/8/4K2k w - - 0 1",
    solution: "a8=Q",
    theme: "promotion",
    prompt: "White to move. Make a queen.",
  },
  {
    id: "p6",
    fen: "4k3/8/4K3/4Q3/8/8/8/8 w - - 0 1",
    solution: "Qe7#",
    theme: "mate-in-1",
    prompt: "White to move. Mate in one.",
  },
  {
    id: "p7",
    fen: "r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4",
    solution: "gxf7",
    theme: "capture",
    prompt: "Black to move. Take the intruder.",
  },
  {
    id: "p8",
    fen: "8/8/3k4/8/3K4/8/8/8 w - - 0 1",
    solution: "Ke4",
    theme: "opposition",
    prompt: "White to move. Take the opposition.",
  },
];

export function samplePuzzle(seed?: number): MiniPuzzle {
  const idx =
    seed !== undefined
      ? Math.abs(seed) % MINI_PUZZLES.length
      : Math.floor(Math.random() * MINI_PUZZLES.length);
  return MINI_PUZZLES[idx];
}
