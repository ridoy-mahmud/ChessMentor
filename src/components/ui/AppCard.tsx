// Phase 19: unified card component with multi-layer shadow, low-opacity accent
// border, tier accent bar and consistent hover motion. Used across bot cards,
// trainer hub tiles, feature cards, lesson intro cards.

import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

type Tier = "teal" | "amber" | "muted" | "destructive";

const TIER_BG: Record<Tier, string> = {
  teal: "bg-primary",
  amber: "bg-[color:var(--color-amber)]",
  muted: "bg-muted-foreground/30",
  destructive: "bg-destructive",
};

type Common = {
  children: ReactNode;
  tier?: Tier;
  interactive?: boolean;
  className?: string;
};

function classesFor(interactive: boolean, tier?: Tier) {
  return [
    "app-card relative overflow-hidden rounded-xl border bg-card p-5 shadow-e1 transition-all",
    tier ? "app-card--tier" : "",
    interactive
      ? "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-e2 active:translate-y-0"
      : "",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
  ].join(" ");
}

export function AppCard({
  children,
  tier,
  interactive = false,
  className = "",
}: Common) {
  return (
    <div className={`${classesFor(interactive, tier)} ${className}`}>
      {tier && <span className={`absolute inset-x-0 top-0 h-0.5 ${TIER_BG[tier]}`} />}
      {children}
    </div>
  );
}

export function AppCardLink({
  to,
  search,
  params,
  children,
  tier,
  className = "",
}: Common & {
  to: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  search?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params?: any;
}) {
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Link
      to={to as never}
      search={search}
      params={params}
      className={`${classesFor(true, tier)} block ${className}`}
    >
      {tier && <span className={`absolute inset-x-0 top-0 h-0.5 ${TIER_BG[tier]}`} />}
      {children}
    </Link>
  );
}
