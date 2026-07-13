import type { HangingPiece } from "@/lib/chess/hangingPieces";

const NAMES: Record<string, string> = {
  p: "Pawn",
  n: "Knight",
  b: "Bishop",
  r: "Rook",
  q: "Queen",
  k: "King",
};

export function ThreatRadar({ pieces }: { pieces: HangingPiece[] }) {
  if (pieces.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-3">
        <div className="label-caps mb-1 text-muted-foreground">Threat radar</div>
        <p className="text-xs text-muted-foreground">No pieces hanging.</p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="label-caps mb-2 text-muted-foreground">Threat radar</div>
      <ul className="space-y-1.5">
        {pieces.map((p) => (
          <li
            key={p.square + p.color}
            className="flex items-center justify-between text-xs"
          >
            <span className="flex items-center gap-2">
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full border ${
                  p.color === "w" ? "bg-white" : "bg-black"
                }`}
              />
              <span className="font-medium">{NAMES[p.type]}</span>
              <span className="font-data text-muted-foreground">{p.square}</span>
            </span>
            <span
              className="font-data text-xs"
              style={{ color: "var(--color-q-mistake)" }}
            >
              hanging
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
