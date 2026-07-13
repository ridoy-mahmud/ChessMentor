import { createFileRoute, Link } from "@tanstack/react-router";
import { Puzzle, Trophy } from "lucide-react";
import { LESSONS } from "@/lib/chess/lessons";

export const Route = createFileRoute("/puzzles")({
  head: () => ({
    meta: [
      { title: "Puzzles & drills — ChessMentor" },
      { name: "description", content: "Tactics puzzles and endgame drills." },
    ],
  }),
  component: PuzzlesPage,
});

function PuzzlesPage() {
  const tactics = LESSONS.filter((l) => l.category === "tactics");
  const endgames = LESSONS.filter((l) => l.category === "endgames");
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold">Puzzles & drills</h1>
        <p className="mt-1 text-muted-foreground">
          Bite-sized tactics and endgame trainers with instant feedback.
        </p>
      </header>

      <Section title="Tactics" icon={<Puzzle className="h-4 w-4" />} items={tactics} />
      <Section title="Endgame trainer" icon={<Trophy className="h-4 w-4" />} items={endgames} />
    </div>
  );
}

function Section({
  title,
  icon,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  items: typeof LESSONS;
}) {
  return (
    <section className="mb-8">
      <h2 className="label-caps mb-3 flex items-center gap-2 text-muted-foreground">
        {icon} {title}
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((l) => (
          <li key={l.id}>
            <Link
              to="/learn"
              search={{ lesson: l.id }}
              className="block rounded-xl border bg-card p-4 shadow-e1 transition-colors hover:border-primary/40 hover:bg-accent/40"
            >
              <div className="font-medium">{l.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{l.blurb}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
