import { useEffect, useRef, useState } from "react";
import type { PlanetData } from "@/lib/galaxy-types";

export type MarketDelta = {
  token: string;
  symbol: string;
  marketCap: number;
  changePct: number; // vs first observed snapshot
  glowColor: string;
};

/**
 * Tracks first-seen market caps per token and exposes deltas.
 * Snapshot is in-memory only — resets on reload.
 */
export function useMarketDeltas(planets: PlanetData[]): MarketDelta[] {
  const baselineRef = useRef<Map<string, number>>(new Map());
  const [, force] = useState(0);

  useEffect(() => {
    let added = false;
    for (const p of planets) {
      if (!baselineRef.current.has(p.community.tokenAddress) && p.marketCap > 0) {
        baselineRef.current.set(p.community.tokenAddress, p.marketCap);
        added = true;
      }
    }
    if (added) force((n) => n + 1);
  }, [planets]);

  return planets
    .map((p) => {
      const base = baselineRef.current.get(p.community.tokenAddress) ?? p.marketCap;
      const changePct = base > 0 ? ((p.marketCap - base) / base) * 100 : 0;
      return {
        token: p.community.tokenAddress,
        symbol: p.community.tokenSymbol,
        marketCap: p.marketCap,
        changePct,
        glowColor: p.glowColor,
      } satisfies MarketDelta;
    })
    .filter((d) => Number.isFinite(d.changePct));
}