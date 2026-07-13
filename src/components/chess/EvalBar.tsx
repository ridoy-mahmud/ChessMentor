import { winProbability, type Evaluation } from "@/lib/chess/engine";

type Props = {
  evaluation: Evaluation | null;
  loading?: boolean;
  orientation?: "white" | "black";
};

export function EvalBar({ evaluation, loading, orientation = "white" }: Props) {
  let whitePct = 50;
  let label = "…";
  let sub = "";
  if (evaluation) {
    if (evaluation.mate != null) {
      whitePct = evaluation.mate > 0 ? 100 : evaluation.mate < 0 ? 0 : 50;
      label = `M${Math.abs(evaluation.mate)}`;
      sub = evaluation.mate > 0 ? "White mates" : "Black mates";
    } else if (evaluation.cp != null) {
      whitePct = winProbability(evaluation.cp);
      const p = evaluation.cp / 100;
      label = (p >= 0 ? "+" : "") + p.toFixed(2);
      sub = `${whitePct.toFixed(0)}% White`;
    }
  }
  const topPct = orientation === "white" ? 100 - whitePct : whitePct;

  return (
    <div className="flex h-full flex-col items-center gap-2">
      <div
        className="relative w-6 flex-1 overflow-hidden rounded-sm border bg-[color:var(--color-board-dark)]"
        aria-label="Evaluation bar"
      >
        <div
          className="absolute inset-x-0 top-0 bg-[color:var(--color-board-light)] transition-[height] duration-500 ease-out"
          style={{ height: `${topPct}%` }}
        />
        {loading && (
          <div className="absolute inset-0 animate-pulse bg-primary/5" />
        )}
      </div>
      <div className="text-center">
        <div className="font-data text-xs font-medium tabular-nums">
          {label}
        </div>
        <div className="font-data text-[10px] text-muted-foreground">{sub}</div>
      </div>
    </div>
  );
}
