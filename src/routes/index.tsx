import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Bot,
  BookOpen,
  LineChart,
  Puzzle,
  Sparkles,
  Swords,
  Target,
  Timer,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AmbientBoard } from "@/components/chess/AmbientBoard";
import { ScrollReveal } from "@/components/chess/ScrollReveal";
import { DailyChallenge } from "@/components/chess/DailyChallenge";
import { AppCardLink } from "@/components/ui/AppCard";
import { BOT_ORDER, BOTS, type BotId } from "@/lib/chess/bots";
import { useInView } from "@/hooks/useInView";

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

function CountUp({
  target,
  suffix = "",
  start,
}: {
  target: number;
  suffix?: string;
  start: boolean;
}) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!start) return;
    const t0 = performance.now();
    const dur = 1400;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, start]);
  return (
    <span className="font-data tabular-nums">
      {n.toLocaleString()}
      {suffix}
    </span>
  );
}

const BOT_TIER: Record<BotId, "muted" | "amber" | "teal"> = {
  rookie: "muted",
  challenger: "muted",
  strategist: "amber",
  tactician: "amber",
  grandmaster: "teal",
};

function Index() {
  const stats = useInView<HTMLDivElement>();
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-background via-background to-secondary/30">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-14 pb-16 sm:px-6 md:grid-cols-[1.05fr_1fr] md:pt-20 md:pb-24">
          <div className="flex flex-col justify-center">
            <div className="label-caps inline-flex w-fit items-center gap-2 rounded-full border bg-card px-3 py-1 text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" />
              Phases 1–20 live
            </div>
            <h1 className="mt-6 text-5xl font-semibold md:text-6xl">
              Learn chess the way it{" "}
              <span className="text-primary">actually clicks.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              A polished board, five personality bots, a probability-driven coach,
              and live analytics — in one warm, minimal place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/learn"
                className="group inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground shadow-e2 transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-e3"
              >
                Start learning
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/play"
                className="inline-flex h-12 items-center gap-2 rounded-lg border bg-card px-6 text-sm font-medium transition-all hover:-translate-y-0.5 hover:bg-secondary"
              >
                <Swords className="h-4 w-4" /> Play now
              </Link>
            </div>
            <div
              ref={stats.ref}
              className="mt-10 grid grid-cols-3 gap-4 text-sm"
            >
              <Stat icon={BookOpen} label="Lessons">
                <CountUp target={8} start={stats.inView} />
              </Stat>
              <Stat icon={Puzzle} label="Puzzles solved">
                <CountUp target={132} start={stats.inView} />
              </Stat>
              <Stat icon={Zap} label="Streak">
                <CountUp target={5} suffix=" days" start={stats.inView} />
              </Stat>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <AmbientBoard />
          </div>
        </div>
      </section>

      {/* Daily challenge */}
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <ScrollReveal>
          <DailyChallenge />
        </ScrollReveal>
      </div>

      {/* Bot quick-launch — Phase 18 redesign */}
      <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
        <ScrollReveal>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="flex items-center gap-2 font-display text-2xl font-semibold">
              <Bot className="h-5 w-5 text-primary" /> Play a bot
            </h2>
            <span className="label-caps text-muted-foreground">
              Choose your challenger
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {BOT_ORDER.map((id) => {
              const b = BOTS[id];
              return (
                <AppCardLink
                  key={id}
                  to="/play"
                  search={{ bot: id }}
                  tier={BOT_TIER[id]}
                  className="text-center"
                >
                  <img
                    src={b.avatar}
                    alt={b.name}
                    width={96}
                    height={96}
                    loading="lazy"
                    className="bot-avatar mx-auto h-20 w-20 rounded-full object-cover ring-2 ring-transparent transition-all group-hover:ring-primary/30"
                  />
                  <div className="mt-3 font-medium">{b.name}</div>
                  <div className="font-data text-xs text-muted-foreground">
                    {b.rating}
                  </div>
                  <p className="mt-2 line-clamp-2 min-h-[2.2em] text-xs text-muted-foreground/90">
                    {b.tagline}
                  </p>
                </AppCardLink>
              );
            })}
          </div>
        </ScrollReveal>
      </section>

      {/* Feature cards */}
      <section
        className="mx-auto max-w-6xl px-4 pb-24 sm:px-6"
        style={{ contentVisibility: "auto" }}
      >
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Timer,
              title: "Puzzle Rush & Storm",
              body: "Timed puzzle sprints with personal bests and a survival time bank.",
              href: "/rush" as const,
              tier: "amber" as const,
            },
            {
              icon: Target,
              title: "Trainer hub",
              body: "Tactics, endgame, coordinate, opening, and vision — one cohesive place.",
              href: "/trainer" as const,
              tier: "teal" as const,
            },
            {
              icon: LineChart,
              title: "Live analytics",
              body: "Win probability, move quality, and hanging pieces update ply-by-ply.",
              href: "/profile" as const,
              tier: "teal" as const,
            },
          ].map((c, i) => (
            <ScrollReveal key={c.title} delay={i * 80}>
              <AppCardLink to={c.href} tier={c.tier} className="h-full">
                <c.icon className="h-5 w-5 text-primary transition-transform" />
                <h3 className="mt-4 font-display text-lg font-semibold">
                  {c.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {c.body}
                </p>
              </AppCardLink>
            </ScrollReveal>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof BookOpen;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card/60 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold">{children}</div>
    </div>
  );
}
