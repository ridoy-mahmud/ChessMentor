import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, LineChart, Sparkles, Swords } from "lucide-react";
import { DailyChallenge } from "@/components/chess/DailyChallenge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ChessMentor — Learn and play chess with a live coach" },
      {
        name: "description",
        content:
          "ChessMentor pairs a polished play experience with a probability-driven visual coach. Live move quality, threat radar, and adaptive lessons.",
      },
      { property: "og:title", content: "ChessMentor — Learn and play chess" },
      {
        property: "og:description",
        content: "A minimal, elegant chess app that teaches, visualizes, and plays.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <section className="pt-16 pb-10 md:pt-24">
        <div className="max-w-3xl">
          <div className="label-caps inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" />
            Phases 1–12 live
          </div>
          <h1 className="mt-6 text-5xl font-semibold md:text-6xl">
            Learn chess the way it{" "}
            <span className="text-primary">actually clicks.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            A polished chess board, a Stockfish opponent, a probability-driven
            coach, and live move-quality analytics — all in one warm, minimal
            place.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/play"
              className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground shadow-e2 transition-colors hover:bg-primary/90"
            >
              Play now
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/learn"
              className="inline-flex h-12 items-center gap-2 rounded-lg border bg-card px-6 text-sm font-medium transition-colors hover:bg-secondary"
            >
              Start learning
            </Link>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <DailyChallenge />
      </section>

      <section className="grid gap-4 pb-24 md:grid-cols-3">
        {[
          {
            icon: Swords,
            title: "Play with feel",
            body: "Stockfish opponent with 5 difficulty levels, configurable clocks, resign & draw, and crisp move sounds.",
            href: "/play",
          },
          {
            icon: BookOpen,
            title: "Adaptive lessons",
            body: "A skill tree with progressive hint ladders, Socratic prompts, and watch-me-calculate walkthroughs.",
            href: "/learn",
          },
          {
            icon: LineChart,
            title: "Live analytics",
            body: "See win probability, move quality, and hanging pieces update ply-by-ply as you play.",
            href: "/profile",
          },
        ].map((c) => (
          <Link
            key={c.title}
            to={c.href}
            className="group rounded-xl border bg-card p-6 shadow-e1 transition-all hover:border-primary/40 hover:shadow-e2"
          >
            <c.icon className="h-5 w-5 text-primary" />
            <h3 className="mt-4 font-display text-lg font-semibold group-hover:text-primary">
              {c.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {c.body}
            </p>
          </Link>
        ))}
      </section>
    </div>
  );
}
