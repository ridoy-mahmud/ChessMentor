import { Link } from "@tanstack/react-router";
import { CalendarDays, Puzzle, Target, Trophy } from "lucide-react";

type Challenge = {
  kind: "puzzle" | "guess" | "endgame";
  title: string;
  body: string;
  cta: string;
  href: string;
  fen?: string;
};

const CHALLENGES: Challenge[] = [
  {
    kind: "puzzle",
    title: "Mate in one",
    body: "Find the back-rank mate. One move, one shot.",
    cta: "Solve puzzle",
    href: "/learn?lesson=mate-in-one",
  },
  {
    kind: "guess",
    title: "Guess the move",
    body: "Step through a classic game move-by-move.",
    cta: "Start guessing",
    href: "/guess",
  },
  {
    kind: "endgame",
    title: "K+P vs K",
    body: "Promote the passed pawn against a lone king.",
    cta: "Enter drill",
    href: "/learn?lesson=pawn-promotion",
  },
];

const ICONS = { puzzle: Puzzle, guess: Target, endgame: Trophy };

export function DailyChallenge() {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
  );
  const c = CHALLENGES[dayOfYear % CHALLENGES.length];
  const Icon = ICONS[c.kind];
  return (
    <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-amber/10 p-6 shadow-e2">
      <div className="label-caps mb-2 flex items-center gap-1.5 text-primary">
        <CalendarDays className="h-3.5 w-3.5" />
        Today's challenge
      </div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-xl font-semibold">{c.title}</h3>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">{c.body}</p>
          <Link
            to={c.href}
            className="mt-4 inline-flex h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-e1 transition-colors hover:bg-primary/90"
          >
            {c.cta}
          </Link>
        </div>
        <div className="grid h-14 w-14 place-items-center rounded-xl bg-primary/15 text-primary">
          <Icon className="h-7 w-7" />
        </div>
      </div>
    </div>
  );
}
