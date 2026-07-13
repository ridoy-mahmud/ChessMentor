// Weekly study plan derived from lesson progress.
// Rebuilds itself when the week changes (keyed by ISO week).

import { LESSONS, type Lesson } from "./lessons";
import { getLessonProgress } from "./progress";

export type StudyItem =
  | { kind: "lesson"; lessonId: string; title: string; category: string }
  | { kind: "puzzle"; theme: string; title: string }
  | { kind: "watch"; lessonId: string; title: string };

export type StudyPlan = {
  weekKey: string;
  items: StudyItem[];
};

function isoWeekKey(d: Date = new Date()): string {
  // Approximate ISO week key: YYYY-Www
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week =
    Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${target.getUTCFullYear()}-W${week.toString().padStart(2, "0")}`;
}

function pickLessons(weakestFirst: boolean): Lesson[] {
  const scored = LESSONS.map((l) => {
    const p = getLessonProgress(l.id);
    // Higher score = greater need to practice
    const score = p.completed ? Math.max(0, 3 - p.stars) : 5;
    return { l, score };
  });
  scored.sort((a, b) => (weakestFirst ? b.score - a.score : a.score - b.score));
  return scored.slice(0, 2).map((s) => s.l);
}

export function buildStudyPlan(): StudyPlan {
  const weekKey = isoWeekKey();
  const lessons = pickLessons(true);
  const items: StudyItem[] = [
    ...lessons.map(
      (l) =>
        ({
          kind: "lesson",
          lessonId: l.id,
          title: l.title,
          category: l.category,
        }) satisfies StudyItem,
    ),
    { kind: "puzzle", theme: "forks", title: "5 fork tactics" },
    lessons[0] && {
      kind: "watch",
      lessonId: lessons[0].id,
      title: `Watch me calculate: ${lessons[0].title}`,
    },
  ].filter(Boolean) as StudyItem[];
  return { weekKey, items };
}
