import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, Lock, Sparkles, Star } from "lucide-react";
import { z } from "zod";
import { LessonRunner } from "@/components/chess/LessonRunner";
import {
  CATEGORIES,
  LESSONS,
  getLesson,
  isLessonUnlocked,
  type Lesson,
} from "@/lib/chess/lessons";
import { useProgress } from "@/lib/chess/progress";

const searchSchema = z.object({
  lesson: z.string().optional(),
});

export const Route = createFileRoute("/learn")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Learn — ChessMentor" },
      {
        name: "description",
        content:
          "A guided chess curriculum with interactive drills, live engine evaluation, and best-move guidance.",
      },
      { property: "og:title", content: "Learn — ChessMentor" },
      {
        property: "og:description",
        content:
          "Interactive lessons with instant feedback, hint overlays, and an evaluation bar.",
      },
    ],
  }),
  component: LearnPage,
});

function LearnPage() {
  const { lesson: lessonId } = Route.useSearch();
  if (lessonId) {
    const lesson = getLesson(lessonId);
    if (lesson) return <LessonView lesson={lesson} />;
  }
  return <LearnIndex />;
}

function LessonView({ lesson }: { lesson: Lesson }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
      <div className="mb-4">
        <Link
          to="/learn"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to lessons
        </Link>
      </div>
      <LessonRunner lesson={lesson} />
    </div>
  );
}

function LearnIndex() {
  const progress = useProgress();
  const completedIds = new Set(
    Object.entries(progress)
      .filter(([, p]) => p.completed)
      .map(([id]) => id),
  );

  const totalStars = Object.values(progress).reduce(
    (sum, p) => sum + (p.stars ?? 0),
    0,
  );
  const totalPossible = LESSONS.length * 3;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <div className="mb-1 inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Learn
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            The ChessMentor curriculum
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            An illustrated path through fundamentals, tactics, and endgames —
            mastery ring fills as you earn stars.
          </p>
        </div>
        <div className="text-right">
          <div className="font-data text-2xl font-semibold tabular-nums">
            {totalStars}
            <span className="text-sm text-muted-foreground">
              /{totalPossible}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">stars earned</div>
        </div>
      </header>

      <div className="space-y-12">
        {CATEGORIES.map((cat) => {
          const lessons = LESSONS.filter((l) => l.category === cat.key);
          return (
            <section key={cat.key}>
              <div className="mb-6 flex items-baseline justify-between border-b pb-2">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">
                    {cat.title}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {cat.description}
                  </p>
                </div>
                <span className="font-data text-xs text-muted-foreground">
                  {lessons.filter((l) => completedIds.has(l.id)).length}/
                  {lessons.length}
                </span>
              </div>
              <LessonTrail
                lessons={lessons}
                completedIds={completedIds}
                progress={progress}
              />
            </section>
          );
        })}
      </div>
    </div>
  );
}

const PER_ROW = 3;

function LessonTrail({
  lessons,
  completedIds,
  progress,
}: {
  lessons: Lesson[];
  completedIds: Set<string>;
  progress: ReturnType<typeof useProgress>;
}) {
  const navigate = useNavigate();
  const rows = Math.ceil(lessons.length / PER_ROW);
  const cellH = 150;
  const height = rows * cellH + 40;
  return (
    <div className="relative">
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox={`0 0 900 ${height}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {lessons.slice(0, -1).map((_, i) => {
          const a = nodeCenter(i, cellH);
          const b = nodeCenter(i + 1, cellH);
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2 + 30;
          return (
            <path
              key={i}
              d={`M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`}
              className="lesson-path-line"
            />
          );
        })}
      </svg>
      <ul
        className="relative grid gap-4"
        style={{ gridTemplateColumns: `repeat(${PER_ROW}, minmax(0, 1fr))` }}
      >
        {lessons.map((lesson, i) => {
          const unlocked = isLessonUnlocked(lesson, completedIds);
          const p = progress[lesson.id];
          const zig = Math.floor(i / PER_ROW) % 2 === 1;
          const orderInRow = zig ? PER_ROW - 1 - (i % PER_ROW) : i % PER_ROW;
          return (
            <li key={lesson.id} style={{ gridColumn: orderInRow + 1 }}>
              <LessonNode
                lesson={lesson}
                unlocked={unlocked}
                progress={p}
                onOpen={() =>
                  navigate({ to: "/learn", search: { lesson: lesson.id } })
                }
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function nodeCenter(i: number, cellH: number) {
  const row = Math.floor(i / PER_ROW);
  const zig = row % 2 === 1;
  const col = zig ? PER_ROW - 1 - (i % PER_ROW) : i % PER_ROW;
  const x = (col + 0.5) * (900 / PER_ROW);
  const y = row * cellH + 75;
  return { x, y };
}

function LessonNode({
  lesson,
  unlocked,
  progress,
  onOpen,
}: {
  lesson: Lesson;
  unlocked: boolean;
  progress?: { completed: boolean; stars: 0 | 1 | 2 | 3 };
  onOpen: () => void;
}) {
  const stars = progress?.stars ?? 0;
  const done = progress?.completed;
  const mastered = stars === 3;
  if (!unlocked) {
    return (
      <div className="app-card flex items-start gap-3 opacity-60">
        <RingIndicator stars={0} locked />
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> Locked
          </div>
          <div className="truncate text-sm font-medium">{lesson.title}</div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {lesson.blurb}
          </p>
        </div>
      </div>
    );
  }
  return (
    <button
      onClick={onOpen}
      className={`app-card group block w-full text-left ${
        mastered ? "lesson-node-mastered" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <RingIndicator stars={stars} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-data uppercase tracking-wide text-muted-foreground">
              {lesson.steps.length} step{lesson.steps.length > 1 ? "s" : ""}
            </span>
            {done && <Check className="h-3.5 w-3.5 text-primary" />}
          </div>
          <div className="mt-1 text-sm font-semibold group-hover:text-primary">
            {lesson.title}
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {lesson.blurb}
          </p>
        </div>
      </div>
    </button>
  );
}

function RingIndicator({
  stars,
  locked = false,
}: {
  stars: number;
  locked?: boolean;
}) {
  const pct = locked ? 0 : (stars / 3) * 100;
  const circumference = 2 * Math.PI * 18;
  const dash = (pct / 100) * circumference;
  return (
    <div className="relative grid h-11 w-11 shrink-0 place-items-center">
      <svg className="absolute inset-0" viewBox="0 0 44 44">
        <circle
          cx="22"
          cy="22"
          r="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-muted-foreground/20"
        />
        <circle
          cx="22"
          cy="22"
          r="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          className="text-primary transition-all"
          strokeDasharray={`${dash} ${circumference}`}
          transform="rotate(-90 22 22)"
        />
      </svg>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3].map((n) => (
          <Star
            key={n}
            className={`h-2.5 w-2.5 ${
              stars >= n ? "fill-primary text-primary" : "text-muted-foreground/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
