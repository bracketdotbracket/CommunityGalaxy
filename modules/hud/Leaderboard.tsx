import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, ChevronRight } from "lucide-react";
import type { MarketDelta } from "@/hooks/use-market-deltas";
import { formatCompact } from "@/lib/galaxy-types";
import { cn } from "@/lib/utils";

type Props = {
  deltas: MarketDelta[];
  onSelect: (token: string) => void;
};

const EXCLUDED_SYMBOLS = new Set(["SOL", "USDC", "USDT", "JUP", "WSOL", "USDS"]);

export function Leaderboard({ deltas, onSelect }: Props) {
  const [tab, setTab] = useState<"gainers" | "losers">("gainers");
  const [open, setOpen] = useState(true);

  const sorted = useMemo(() => {
    const filtered = deltas.filter(
      (d) =>
        Math.abs(d.changePct) > 0.01 &&
        !EXCLUDED_SYMBOLS.has((d.symbol || "").toUpperCase()),
    );
    const arr = [...filtered].sort((a, b) =>
      tab === "gainers" ? b.changePct - a.changePct : a.changePct - b.changePct,
    );
    return arr.slice(0, 8);
  }, [deltas, tab]);

  return (
    <div className="pointer-events-auto fixed right-3 top-16 z-10 w-64 font-mono">
      <div className="border border-[color:var(--neon-cyan)]/30 bg-[#0a0914]/90 backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.6)]">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between border-b border-[color:var(--neon-cyan)]/20 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.3em] text-[color:var(--neon-cyan)] hover:bg-white/5"
        >
          <span>Leaderboard</span>
          <ChevronRight className={cn("h-3 w-3 transition-transform", open && "rotate-90")} />
        </button>
        {open && (
          <>
            <div className="flex border-b border-white/5">
              <button
                onClick={() => setTab("gainers")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1 px-2 py-1.5 text-[10px] uppercase tracking-[0.2em] transition-colors",
                  tab === "gainers"
                    ? "bg-[color:var(--neon-cyan)]/10 text-[color:var(--neon-cyan)]"
                    : "text-white/50 hover:text-white/80",
                )}
              >
                <TrendingUp className="h-3 w-3" /> Gainers
              </button>
              <button
                onClick={() => setTab("losers")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1 px-2 py-1.5 text-[10px] uppercase tracking-[0.2em] transition-colors",
                  tab === "losers"
                    ? "bg-[color:var(--neon-pink)]/10 text-[color:var(--neon-pink)]"
                    : "text-white/50 hover:text-white/80",
                )}
              >
                <TrendingDown className="h-3 w-3" /> Losers
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {sorted.length === 0 ? (
                <div className="px-3 py-6 text-center text-[10px] uppercase tracking-[0.2em] text-white/40">
                  Collecting baseline…
                </div>
              ) : (
                sorted.map((d, i) => {
                  const positive = d.changePct >= 0;
                  return (
                    <button
                      key={d.token}
                      onClick={() => onSelect(d.token)}
                      className="flex w-full items-center gap-2 border-b border-white/5 px-3 py-2 text-left text-[11px] transition-colors hover:bg-white/5"
                    >
                      <span className="w-4 text-[10px] text-white/40">{i + 1}</span>
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{
                          background: d.glowColor,
                          boxShadow: `0 0 6px ${d.glowColor}`,
                        }}
                      />
                      <span className="flex-1 truncate font-bold text-white/90">
                        ${d.symbol || "—"}
                      </span>
                      <span className="text-[10px] text-white/40">
                        ${formatCompact(d.marketCap)}
                      </span>
                      <span
                        className={cn(
                          "w-12 text-right text-[10px] font-bold tabular-nums",
                          positive
                            ? "text-[color:var(--neon-cyan)]"
                            : "text-[color:var(--neon-pink)]",
                        )}
                      >
                        {positive ? "+" : ""}
                        {Math.round(d.changePct)}%
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}