import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

export function ComingSoon({
  phase,
  title,
  body,
}: {
  phase: string;
  title: string;
  body: string;
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 sm:px-6">
      <div className="rounded-2xl border bg-card p-10 text-center">
        <span className="inline-block rounded-full border px-3 py-1 text-xs font-data text-muted-foreground">
          {phase}
        </span>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
          {body}
        </p>
        <Link
          to="/play"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Try the board now
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
