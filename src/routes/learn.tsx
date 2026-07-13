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
            Interactive drills with instant feedback, a live evaluation bar,
            and a "Show me" hint that draws the correct move on the board.
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

      <div className="space-y-10">
        {CATEGORIES.map((cat) => {
          const lessons = LESSONS.filter((l) => l.category === cat.key);
          return (
            <section key={cat.key}>
              <div className="mb-4 flex items-baseline justify-between border-b pb-2">
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
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {lessons.map((lesson) => (
                  <LessonCard
                    key={lesson.id}
                    lesson={lesson}
                    unlocked={isLessonUnlocked(lesson, completedIds)}
                    progress={progress[lesson.id]}
                  />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function LessonCard({
  lesson,
  unlocked,
  progress,
}: {
  lesson: Lesson;
  unlocked: boolean;
  progress?: { completed: boolean; stars: 0 | 1 | 2 | 3 };
}) {
  const navigate = useNavigate();
  const stars = progress?.stars ?? 0;
  const done = progress?.completed;
  if (!unlocked) {
    return (
      <li className="rounded-xl border border-dashed bg-card/40 p-4 opacity-60">
        <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" />
          Locked
        </div>
        <div className="text-sm font-medium">{lesson.title}</div>
        <p className="mt-1 text-xs text-muted-foreground">{lesson.blurb}</p>
      </li>
    );
  }
  return (
    <li>
      <button
        onClick={() =>
          navigate({ to: "/learn", search: { lesson: lesson.id } })
        }
        className="group block w-full rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent/40"
      >
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-data uppercase tracking-wide text-muted-foreground">
            {lesson.steps.length} step{lesson.steps.length > 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-0.5">
            {done && <Check className="mr-1 h-3.5 w-3.5 text-primary" />}
            {[1, 2, 3].map((n) => (
              <Star
                key={n}
                className={`h-3.5 w-3.5 ${
                  stars >= n
                    ? "fill-primary text-primary"
                    : "text-muted-foreground/40"
                }`}
              />
            ))}
          </span>
        </div>
        <div className="text-sm font-semibold group-hover:text-primary">
          {lesson.title}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{lesson.blurb}</p>
      </button>
    </li>
  );
}
