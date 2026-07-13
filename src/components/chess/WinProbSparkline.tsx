import { winProbability } from "@/lib/chess/engine";

type Props = {
  cps: (number | null)[]; // cp values from White perspective, one per ply
  height?: number;
};

// Compact win-probability sparkline (Phase 11).
export function WinProbSparkline({ cps, height = 40 }: Props) {
  const width = 200;
  const points = cps.map((cp, i) => {
    const x = cps.length <= 1 ? 0 : (i / (cps.length - 1)) * width;
    const p = cp == null ? 50 : winProbability(cp);
    const y = height - (p / 100) * height;
    return { x, y };
  });
  const path =
    points.length === 0
      ? ""
      : points
          .map((p, i) => (i === 0 ? `M${p.x.toFixed(1)},${p.y.toFixed(1)}` : `L${p.x.toFixed(1)},${p.y.toFixed(1)}`))
          .join(" ");
  const areaPath =
    points.length === 0
      ? ""
      : `${path} L${width},${height} L0,${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ height }}
      aria-label="Win probability trend"
    >
      <line
        x1={0}
        x2={width}
        y1={height / 2}
        y2={height / 2}
        stroke="var(--color-border)"
        strokeDasharray="2 2"
      />
      {areaPath && (
        <path
          d={areaPath}
          fill="var(--color-primary)"
          opacity={0.15}
        />
      )}
      {path && (
        <path
          d={path}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={1.5}
        />
      )}
    </svg>
  );
}
