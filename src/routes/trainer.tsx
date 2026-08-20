// Phase 20: Trainer hub — one landing page for all skill drills. Unified
// stats strip on top, five sub-mode cards (Tactics, Endgame, Coordinate,
// Opening, Vision) sharing the Phase 19 card system.

import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ActivitySquare,
  BookOpenCheck,
  Dumbbell,
  Crosshair,
  Eye,
  Flame,
  Sparkles,
  Swords,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { AppCardLink } from "@/components/ui/AppCard";
import { useProgress } from "@/lib/chess/progress";

export const Route = createFileRoute("/trainer")({
  head: () => ({
    meta: [
      { title: "Trainer — ChessMentor" },
      {
        name: "description",
        content:
          "Sharpen every skill in one hub: tactics, endgame, coordinate, opening, and vision drills with combined progress tracking.",
      },
      { property: "og:title", content: "Trainer hub — ChessMentor" },
      {
        property: "og:description",
        content:
          "Five purposeful drills, one cohesive hub. Track accuracy, streak, and speed across every trainer.",
      },
    ],
  }),
  component: TrainerHub,
});

const MODES: Array<{
  to:
    | "/puzzles"
    | "/coordinate"
    | "/trainer/opening"
    | "/trainer/vision"
    | "/trainer/practice";
  icon: typeof Target;
  title: string;
  blurb: string;
  tier: "teal" | "amber";
  category: string;
}> = [
  {
    to: "/puzzles",
    icon: Target,
    title: "Tactics Trainer",
    blurb: "Themed puzzle sets — forks, pins, discovered attacks.",
    tier: "teal",
    category: "Pattern",
  },
  {
    to: "/trainer/practice",
    icon: BookOpenCheck,
    title: "Endgame Trainer",
    blurb: "K+P vs K, opposition, rook endings — from position to result.",
    tier: "teal",
    category: "Technique",
  },
  {
    to: "/coordinate",
    icon: Crosshair,
    title: "Coordinate Trainer",
    blurb: "See a square, click it fast. Board vision under time pressure.",
    tier: "amber",
    category: "Vision",
  },
  {
    to: "/trainer/opening",
    icon: Swords,
    title: "Opening Trainer",
    blurb: "Drill opening lines with spaced repetition — never forget a move.",
    tier: "teal",
    category: "Repertoire",
  },
  {
    to: "/trainer/vision",
    icon: Eye,
    title: "Vision Trainer",
    blurb: "Flash drills: count attackers/defenders, spot attacked pieces.",
    tier: "amber",
    category: "Speed",
  },
  {
    to: "/trainer/practice",
    icon: Dumbbell,
    title: "Guided Practice",
    blurb: "Untimed, theme-grouped exercises — repeat until the pattern sticks.",
    tier: "teal",
    category: "Guided",
  },
];

function TrainerHub() {
  const progress = useProgress();
  const completed = Object.values(progress).filter((p) => p.completed).length;
  const stars = Object.values(progress).reduce((s, p) => s + (p.stars ?? 0), 0);

  // Aggregated stats — combined across trainer modes (mocked from progress data)
  const accuracy = Math.min(99, 62 + completed * 4);
  const streak = Math.min(30, 3 + completed);
  const speed = Math.max(2.4, 6.2 - completed * 0.2);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
      <header className="mb-8">
        <div className="label-caps mb-2 inline-flex items-center gap-1.5 text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Trainer hub
        </div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          One place to sharpen every skill.
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Five focused drills — combined progress, one cohesive experience.
        </p>
      </header>

      {/* Unified stats strip */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={TrendingUp} label="Combined accuracy" value={`${accuracy}%`} />
        <StatTile icon={Flame} label="Trainer streak" value={`${streak}d`} />
        <StatTile icon={Zap} label="Avg. solve time" value={`${speed.toFixed(1)}s`} />
        <StatTile icon={ActivitySquare} label="Stars earned" value={`${stars}`} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODES.map((m) => (
          <AppCardLink key={m.title} to={m.to} tier={m.tier}>
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <m.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="label-caps text-muted-foreground">{m.category}</div>
                <h3 className="mt-0.5 font-display text-lg font-semibold">{m.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{m.blurb}</p>
              </div>
            </div>
          </AppCardLink>
        ))}
      </div>

      <div className="mt-10 rounded-xl border bg-card/60 p-5">
        <div className="flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-medium">Where to go next</span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          New to the Trainer? Start with{" "}
          <Link to="/coordinate" className="story-link text-primary">
            Coordinate
          </Link>{" "}
          for a quick warm-up, then move to{" "}
          <Link to="/trainer/vision" className="story-link text-primary">
            Vision
          </Link>{" "}
          drills to build pattern speed.
        </p>
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Target;
  label: string;
  value: string;
}) {
  return (
    <div className="app-card px-4 py-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 font-data text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
