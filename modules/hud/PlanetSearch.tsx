import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { PlanetData } from "@/lib/galaxy-types";
import { formatCompact } from "@/lib/galaxy-types";

const HIDDEN_SYMBOLS = new Set(["USDC", "USDT", "PUMP", "JUP"]);

type Props = {
  planets: PlanetData[];
  onSelect: (tokenAddress: string) => void;
};

export function PlanetSearch({ planets, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Cmd/Ctrl+K to focus
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visible = planets.filter(
      (p) => !HIDDEN_SYMBOLS.has((p.community.tokenSymbol ?? "").toUpperCase()),
    );
    if (!q) {
      return [...visible]
        .sort((a, b) => b.marketCap - a.marketCap)
        .slice(0, 8);
    }
    return visible
      .filter((p) => {
        const sym = p.community.tokenSymbol?.toLowerCase() ?? "";
        const addr = p.community.tokenAddress.toLowerCase();
        return sym.includes(q) || addr.includes(q);
      })
      .sort((a, b) => {
        // Prefer symbol prefix match, then by market cap
        const aSym = a.community.tokenSymbol?.toLowerCase() ?? "";
        const bSym = b.community.tokenSymbol?.toLowerCase() ?? "";
        const aPre = aSym.startsWith(q) ? 0 : 1;
        const bPre = bSym.startsWith(q) ? 0 : 1;
        if (aPre !== bPre) return aPre - bPre;
        return b.marketCap - a.marketCap;
      })
      .slice(0, 8);
  }, [planets, query]);

  useEffect(() => setActiveIdx(0), [query, open]);

  function commit(idx: number) {
    const target = results[idx];
    if (!target) return;
    onSelect(target.community.tokenAddress);
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
  }

  return (
    <div ref={wrapRef} className="relative pointer-events-auto font-mono">
      <button
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className={`group flex items-center gap-2 border px-3 py-2 text-[11px] tracking-[0.2em] backdrop-blur-md transition-all ${
          open
            ? "border-cyan-500/50 bg-black/40 text-cyan-50"
            : "border-white/10 bg-black/40 text-cyan-50/60 hover:border-cyan-500/50 hover:text-cyan-50"
        }`}
        aria-label="Search communities"
      >
        <Search className="h-3.5 w-3.5 text-cyan-500/60 group-hover:text-cyan-400" />
        <span className="uppercase">Search...</span>
        <kbd className="ml-2 border border-white/10 px-1.5 py-0.5 text-[9px] tracking-normal text-white/20">
          ⌘K
        </kbd>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 w-72 border border-cyan-500/30 bg-[#0a0914]/95 p-1.5 backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.6)]">
          <div className="flex items-center gap-2 px-2">
            <Search className="h-3.5 w-3.5 text-cyan-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActiveIdx((i) => Math.min(i + 1, results.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActiveIdx((i) => Math.max(i - 1, 0));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  commit(activeIdx);
                }
              }}
              placeholder="ticker or address…"
              className="w-full bg-transparent py-2 text-xs tracking-[0.15em] text-cyan-50 placeholder:text-white/30 focus:outline-none"
            />
            <button
              onClick={() => {
                setOpen(false);
                setQuery("");
              }}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Close search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {results.length > 0 && (
            <ul className="mt-1 max-h-72 overflow-y-auto border-t border-cyan-500/20 pt-1">
              {results.map((p, i) => (
                <li key={p.community.tokenAddress}>
                  <button
                    onMouseEnter={() => setActiveIdx(i)}
                    onClick={() => commit(i)}
                    className={`flex w-full items-center justify-between px-2 py-1.5 text-left text-[11px] transition-colors ${
                      i === activeIdx
                        ? "bg-cyan-500/10 text-cyan-50"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: p.color, boxShadow: `0 0 8px ${p.glowColor}` }}
                      />
                      <span className="tracking-wider">
                        ${p.community.tokenSymbol || "—"}
                      </span>
                    </span>
                    <span className="text-[10px] tracking-widest opacity-70">
                      ${formatCompact(p.marketCap)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {query && results.length === 0 && (
            <div className="px-2 py-3 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
              no match
            </div>
          )}
        </div>
      )}
    </div>
  );
}