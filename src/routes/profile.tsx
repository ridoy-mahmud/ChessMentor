import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, Crown, Trophy, TrendingUp } from "lucide-react";
import { useEffect } from "react";
import { useProgress } from "@/lib/chess/progress";
import { useGameTrend } from "@/lib/chess/gameTrend";
import { buildStudyPlan, type StudyItem } from "@/lib/chess/studyPlan";
import { LESSONS } from "@/lib/chess/lessons";
import { initRating, resetTiltCounter, useRating } from "@/lib/chess/rating";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — ChessMentor" },
      { name: "description", content: "Your study plan, lesson progress, and game trend." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const progress = useProgress();
  const trend = useGameTrend();
  const rating = useRating();
  const plan = buildStudyPlan();
  useEffect(() => { initRating(); }, []);

  const totalStars = Object.values(progress).reduce((s, p) => s + (p.stars ?? 0), 0);
  const maxStars = LESSONS.length * 3;

  const avgAccuracy = trend.length
    ? Math.round(trend.reduce((s, g) => s + g.accuracy, 0) / trend.length)
    : null;
  const wins = trend.filter((g) => g.result === "win").length;
  const losses = trend.filter((g) => g.result === "loss").length;
  const draws = trend.filter((g) => g.result === "draw").length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold">Your profile</h1>
        <p className="mt-1 text-muted-foreground">
          Weekly study plan, lesson mastery, and rolling game trend.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Stars" value={`${totalStars}/${maxStars}`} icon={<Trophy className="h-5 w-5" />} />
        <StatCard
          label="Avg. accuracy"
          value={avgAccuracy != null ? `${avgAccuracy}%` : "—"}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard label="Record" value={`${wins}W · ${draws}D · ${losses}L`} icon={<Trophy className="h-5 w-5" />} />
      </div>

      <section className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-semibold">
          <Crown className="h-5 w-5 text-primary" /> Competitive ladder
        </h2>
        <div className="grid gap-4 sm:grid-cols-4">
          <StatCard label="Rating" value={String(rating.rating)} icon={<Award className="h-5 w-5" />} />
          <StatCard label="Season peak" value={String(rating.seasonPeak)} icon={<TrendingUp className="h-5 w-5" />} />
          <StatCard label="Season games" value={String(rating.seasonGames)} icon={<Trophy className="h-5 w-5" />} />
          <StatCard label="Season" value={rating.seasonId} icon={<Crown className="h-5 w-5" />} />
        </div>
        {rating.consecutiveLosses >= 3 && (
          <div className="mt-3 rounded-xl border border-amber/40 bg-amber/5 p-4 text-sm">
            <p>
              Three losses in a row — consider a{" "}
              <Link to="/trainer/practice" className="font-medium text-primary underline">practice drill</Link>{" "}
              or{" "}
              <Link to="/coordinate" className="font-medium text-primary underline">quick trainer</Link>{" "}
              before the next rated game.
            </p>
            <button
              onClick={resetTiltCounter}
              className="mt-2 text-xs text-muted-foreground underline"
            >
              Dismiss
            </button>
          </div>
        )}
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-xl font-semibold">This week's plan</h2>
          <span className="font-data text-xs text-muted-foreground">{plan.weekKey}</span>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {plan.items.map((item, i) => (
            <li key={i}>
              <PlanCard item={item} />
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-xl font-semibold">Game trend</h2>
        {trend.length === 0 ? (
          <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground shadow-e1">
            Finish a game to start your trend.
          </div>
        ) : (
          <div className="rounded-xl border bg-card p-4 shadow-e1">
            <TrendSparkline values={trend.map((g) => g.accuracy)} />
            <div className="mt-3 grid grid-cols-2 gap-2 font-data text-xs text-muted-foreground sm:grid-cols-4">
              <span>Games: {trend.length}</span>
              <span>Blunders: {trend.reduce((s, g) => s + g.blunders, 0)}</span>
              <span>Mistakes: {trend.reduce((s, g) => s + g.mistakes, 0)}</span>
              <span>Inaccuracies: {trend.reduce((s, g) => s + g.inaccuracies, 0)}</span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-e1">
      <div className="label-caps flex items-center gap-1.5 text-muted-foreground">{icon} {label}</div>
      <div className="mt-2 font-display text-3xl font-semibold">{value}</div>
    </div>
  );
}

function PlanCard({ item }: { item: StudyItem }) {
  const href =
    item.kind === "lesson" || item.kind === "watch"
      ? `/learn?lesson=${item.lessonId}`
      : "/learn";
  return (
    <Link
      to={href as never}
      className="block rounded-xl border bg-card p-4 shadow-e1 transition-colors hover:border-primary/40 hover:bg-accent/40"
    >
      <div className="label-caps mb-1 text-muted-foreground">
        {item.kind === "lesson" ? "Lesson" : item.kind === "watch" ? "Walkthrough" : "Tactics"}
      </div>
      <div className="font-medium">{item.title}</div>
    </Link>
  );
}

function TrendSparkline({ values }: { values: number[] }) {
  if (values.length === 0) return null;
  const w = 400;
  const h = 60;
  const max = 100;
  const step = values.length <= 1 ? 0 : w / (values.length - 1);
  const path = values
    .map((v, i) => {
      const x = i * step;
      const y = h - (v / max) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }}>
      <path d={path} fill="none" stroke="var(--color-primary)" strokeWidth={1.5} />
    </svg>
  );
}
