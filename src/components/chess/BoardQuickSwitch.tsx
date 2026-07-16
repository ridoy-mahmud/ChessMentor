import { Palette, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ALL_BOARD_THEMES,
  ALL_PIECE_SETS,
  BOARD_THEME_META,
  PIECE_SET_META,
  setBoardTheme,
  setPieceSet,
  useSettings,
} from "@/lib/chess/settings";

/**
 * Phase 17 — In-board quick access to board theme & piece set,
 * with live mini-previews. Complements the full Settings picker.
 */
export function BoardQuickSwitch() {
  const { boardTheme, pieceSet } = useSettings();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Board & piece theme"
          className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-card px-2 text-xs font-medium text-muted-foreground shadow-e1 transition-colors hover:border-primary/50 hover:text-foreground"
        >
          <Palette className="h-3.5 w-3.5" />
          Theme
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Board
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {ALL_BOARD_THEMES.map((t) => {
            const active = boardTheme === t;
            return (
              <button
                key={t}
                onClick={() => setBoardTheme(t)}
                title={BOARD_THEME_META[t].label}
                className={`group relative aspect-square overflow-hidden rounded-md border transition ${
                  active ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-primary/50"
                }`}
              >
                <div className={`board-theme-${t} grid h-full w-full grid-cols-2 grid-rows-2`}>
                  <div style={{ background: "var(--board-light)" }} />
                  <div style={{ background: "var(--board-dark)" }} />
                  <div style={{ background: "var(--board-dark)" }} />
                  <div style={{ background: "var(--board-light)" }} />
                </div>
                {active && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Check className="h-3.5 w-3.5 text-primary-foreground drop-shadow" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-3 mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Pieces
        </div>
        <div className="space-y-1">
          {ALL_PIECE_SETS.map((p) => {
            const active = pieceSet === p;
            return (
              <button
                key={p}
                onClick={() => setPieceSet(p)}
                className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs transition ${
                  active ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                }`}
              >
                <span className="font-medium">{PIECE_SET_META[p].label}</span>
                {active && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
