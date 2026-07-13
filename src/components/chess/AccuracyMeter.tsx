type Props = {
  value: number; // 0-100
  label?: string;
  size?: number;
};

export function AccuracyMeter({ value, label = "Accuracy", size = 56 }: Props) {
  const clamped = Math.max(0, Math.min(100, value));
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;
  return (
    <div className="flex items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth={4}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth={4}
            strokeDasharray={c}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 400ms ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className="font-data text-sm font-semibold tabular-nums">
            {Math.round(clamped)}
          </span>
        </div>
      </div>
      <div>
        <div className="label-caps text-muted-foreground">{label}</div>
        <div className="font-data text-xs text-muted-foreground">of 100</div>
      </div>
    </div>
  );
}
