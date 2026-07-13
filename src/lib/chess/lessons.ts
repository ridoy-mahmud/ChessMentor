export type LessonCategory = "fundamentals" | "tactics" | "endgames";

export type LessonStep = {
  fen: string;
  prompt: string;
  // Accepted moves in SAN. First entry is the "best" one shown as hint arrow.
  bestMoves: string[];
  hint: string;
  explanation?: string;
};

export type Lesson = {
  id: string;
  title: string;
  category: LessonCategory;
  blurb: string;
  requires?: string[];
  steps: LessonStep[];
};

export const CATEGORIES: {
  key: LessonCategory;
  title: string;
  description: string;
}[] = [
  {
    key: "fundamentals",
    title: "Fundamentals",
    description: "Opening principles and safe development.",
  },
  {
    key: "tactics",
    title: "Tactics",
    description: "Forks, pins, and simple combinations.",
  },
  {
    key: "endgames",
    title: "Endgames",
    description: "Mating patterns and pawn technique.",
  },
];

export const LESSONS: Lesson[] = [
  {
    id: "center-control",
    title: "Control the center",
    category: "fundamentals",
    blurb: "Claim central squares with your first move.",
    steps: [
      {
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        prompt: "White to move. Occupy the center with a pawn.",
        bestMoves: ["e4", "d4"],
        hint: "Push a central pawn two squares to claim e4 or d4.",
        explanation:
          "Central pawns fight for e4/d4/e5/d5 — the squares that give pieces the most mobility.",
      },
      {
        fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
        prompt: "Develop a knight toward the center.",
        bestMoves: ["Nf3", "Nc3"],
        hint: "Knights belong on f3 or c3 — they defend the center and prepare castling.",
      },
    ],
  },
  {
    id: "develop-castle",
    title: "Develop and castle",
    category: "fundamentals",
    blurb: "Get your king to safety early.",
    requires: ["center-control"],
    steps: [
      {
        fen: "rnbqk2r/pppp1ppp/3b1n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
        prompt: "You've developed two pieces. Tuck the king away.",
        bestMoves: ["O-O"],
        hint: "Castle kingside — king to g1, rook to f1.",
        explanation:
          "Castling gets the king off the center and connects the rooks in one move.",
      },
    ],
  },
  {
    id: "capture-hanging",
    title: "Take what's free",
    category: "tactics",
    blurb: "Spot undefended pieces and capture them.",
    steps: [
      {
        fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
        prompt: "Is anything hanging? White to move.",
        bestMoves: ["Nxe5"],
        hint: "The e5 pawn is defended only once and attacked twice.",
        explanation:
          "Nxe5 wins the pawn — Black's knight defends it but White's knight attacks it and the pawn is only worth 1.",
      },
    ],
  },
  {
    id: "knight-fork",
    title: "Knight forks",
    category: "tactics",
    blurb: "Attack two pieces with one knight jump.",
    requires: ["capture-hanging"],
    steps: [
      {
        fen: "r3k2r/ppp2ppp/2n1b3/3q4/3P4/2N2N2/PPP2PPP/R2QK2R w KQkq - 0 1",
        prompt: "White to move. Find the knight fork.",
        bestMoves: ["Nxd5"],
        hint: "One knight can win the queen for free.",
        explanation:
          "Nxd5 removes Black's queen — nothing defends it and the knight is safe.",
      },
      {
        fen: "r1bqk2r/pppp1ppp/2n2n2/4p3/1bB1P3/2N2N2/PPPP1PPP/R1BQ1RK1 b kq - 5 5",
        prompt: "Black to move. Find the forking square for the knight.",
        bestMoves: ["Nd4"],
        hint: "A knight jump to d4 attacks two undefended pieces.",
      },
    ],
  },
  {
    id: "mate-in-one",
    title: "Mate in one",
    category: "tactics",
    blurb: "Deliver checkmate with a single move.",
    requires: ["knight-fork"],
    steps: [
      {
        fen: "6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1",
        prompt: "White to move. Deliver mate.",
        bestMoves: ["Re8#"],
        hint: "Back-rank weakness. The rook can slide all the way in.",
        explanation: "Re8# — the king is trapped by its own pawns.",
      },
      {
        fen: "6k1/6pp/8/8/8/8/5PPP/3Q2K1 w - - 0 1",
        prompt: "White to move. Mate in one.",
        bestMoves: ["Qd8#"],
        hint: "Queen to the back rank.",
      },
    ],
  },
  {
    id: "king-and-queen-mate",
    title: "King & queen mate",
    category: "endgames",
    blurb: "Corral the lone king with king and queen.",
    steps: [
      {
        fen: "4k3/8/4K3/4Q3/8/8/8/8 w - - 0 1",
        prompt: "White to move. Deliver mate in one.",
        bestMoves: ["Qe7#"],
        hint: "Move the queen next to the king — your king covers the escape.",
        explanation:
          "Qe7# — the king protects the queen and the enemy king has no squares.",
      },
    ],
  },
  {
    id: "opposition",
    title: "The opposition",
    category: "endgames",
    blurb: "Use your king to outmaneuver the opponent's.",
    requires: ["king-and-queen-mate"],
    steps: [
      {
        fen: "8/8/3k4/8/3K4/8/8/8 w - - 0 1",
        prompt:
          "Take the opposition — face the enemy king with one square between.",
        bestMoves: ["Ke4", "Kc4", "Kd3"],
        hint: "Any king move that keeps you one square from Black's king along a file or rank works.",
        explanation:
          "Holding the opposition forces the enemy king to step back — the fundamental idea in king-and-pawn endings.",
      },
    ],
  },
  {
    id: "pawn-promotion",
    title: "Promote the pawn",
    category: "endgames",
    blurb: "Push the passed pawn to the eighth rank.",
    requires: ["opposition"],
    steps: [
      {
        fen: "8/P7/8/8/8/8/8/4K2k w - - 0 1",
        prompt: "White to move. Make a new queen.",
        bestMoves: ["a8=Q", "a8=Q+"],
        hint: "Push the pawn to a8 and promote to a queen.",
      },
    ],
  },
];

export function getLesson(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}

export function isLessonUnlocked(
  lesson: Lesson,
  completed: Set<string>,
): boolean {
  if (!lesson.requires || lesson.requires.length === 0) return true;
  return lesson.requires.every((r) => completed.has(r));
}
